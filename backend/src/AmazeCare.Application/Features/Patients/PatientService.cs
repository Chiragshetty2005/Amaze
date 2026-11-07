using AmazeCare.Application.Common;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Patients;

public sealed class PatientService(
    IAppDbContext db,
    IPasswordHasher passwordHasher,
    ICurrentUserService currentUser,
    INotificationService notifications,
    TimeProvider timeProvider)
{
    public async Task<PagedResult<PatientDto>> SearchAsync(
        PatientSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        var patients = db.Patients
            .AsNoTracking()
            .Include(item => item.User)
            .Where(item => item.User.IsActive);

        if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            patients = patients.Where(item =>
                item.Appointments.Any(appointment => appointment.DoctorId == doctorId));
        }
        else if (role != UserRole.Admin)
        {
            throw new ForbiddenAppException();
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            patients = patients.Where(item =>
                item.User.FullName.Contains(search) ||
                item.User.Email.Contains(search) ||
                item.User.Phone.Contains(search));
        }

        var total = await patients.CountAsync(cancellationToken);
        var items = await patients
            .OrderBy(item => item.User.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<PatientDto>(
            items.Select(item => item.ToPatientDto()).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<PatientDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var patient = await db.Patients
            .AsNoTracking()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient not found.");

        await EnsureCanAccessAsync(patient.Id, cancellationToken);
        return patient.ToPatientDto();
    }

    public async Task<PatientDto> GetOwnProfileAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var patient = await db.Patients
            .AsNoTracking()
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.UserId == userId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient profile not found.");

        return patient.ToPatientDto();
    }

    public async Task<PatientCreatedResponse> CreateAsync(
        CreatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(item => item.Email == email, cancellationToken))
        {
            throw new ConflictAppException("An account already uses that email.");
        }

        var gender = ParseGender(request.Gender);
        ValidateDateOfBirth(request.DateOfBirth);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var user = new User
        {
            FullName = request.Name.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            Role = UserRole.Patient,
            PasswordHash = passwordHasher.Hash(SecurityTokens.Create(32)),
            CreatedAtUtc = now
        };

        var patient = new Patient
        {
            User = user,
            DateOfBirth = request.DateOfBirth,
            Gender = gender,
            Address = request.Address.Trim(),
            CreatedAtUtc = now
        };

        user.Patient = patient;
        var rawInviteToken = SecurityTokens.Create();
        db.Users.Add(user);
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = SecurityTokens.Hash(rawInviteToken),
            ExpiresAtUtc = now.AddHours(24),
            CreatedAtUtc = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendInvitationAsync(user, "patient", rawInviteToken, cancellationToken);
        return new PatientCreatedResponse(patient.ToPatientDto(), true);
    }

    public async Task<PatientDto> UpdateAsync(
        Guid id,
        UpdatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var patient = await db.Patients
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient not found.");

        var gender = ParseGender(request.Gender);
        ValidateDateOfBirth(request.DateOfBirth);

        patient.User.FullName = request.Name.Trim();
        patient.User.Phone = request.Phone.Trim();
        patient.DateOfBirth = request.DateOfBirth;
        patient.Gender = gender;
        patient.Address = request.Address.Trim();

        await db.SaveChangesAsync(cancellationToken);
        return patient.ToPatientDto();
    }

    public async Task<PatientDto> UpdateOwnProfileAsync(
        UpdatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var patientId = await GetCurrentPatientIdAsync(cancellationToken);
        var patient = await db.Patients
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == patientId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient not found.");

        var gender = ParseGender(request.Gender);
        ValidateDateOfBirth(request.DateOfBirth);

        patient.User.FullName = request.Name.Trim();
        patient.User.Phone = request.Phone.Trim();
        patient.DateOfBirth = request.DateOfBirth;
        patient.Gender = gender;
        patient.Address = request.Address.Trim();

        await db.SaveChangesAsync(cancellationToken);
        return patient.ToPatientDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var patient = await db.Patients
            .Include(item => item.User)
            .Include(item => item.Appointments)
                .ThenInclude(item => item.Doctor)
                    .ThenInclude(item => item.User)
            .Include(item => item.Appointments)
                .ThenInclude(item => item.Doctor)
                    .ThenInclude(item => item.Specialization)
            .Include(item => item.Appointments)
                .ThenInclude(item => item.Patient)
                    .ThenInclude(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient not found.");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        patient.User.IsActive = false;

        var refreshTokens = await db.RefreshTokens
            .Where(item => item.UserId == patient.UserId && item.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in refreshTokens)
        {
            token.RevokedAtUtc = now;
        }

        var cancelled = new List<Appointment>();
        foreach (var appointment in patient.Appointments.Where(item =>
                     item.Date >= today &&
                     item.Status is AppointmentStatus.Pending or AppointmentStatus.Confirmed))
        {
            appointment.Status = AppointmentStatus.Cancelled;
            appointment.CancellationReason = "The patient account was closed by the clinic.";
            appointment.UpdatedAtUtc = now;
            cancelled.Add(appointment);
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var appointment in cancelled)
        {
            await notifications.SendAppointmentCancelledAsync(
                appointment,
                appointment.CancellationReason!,
                "clinic",
                cancellationToken);
        }
    }

    private async Task EnsureCanAccessAsync(Guid patientId, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        switch (role)
        {
            case UserRole.Admin:
                return;
            case UserRole.Patient:
                var ownPatientId = await GetCurrentPatientIdAsync(cancellationToken);
                if (ownPatientId != patientId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            case UserRole.Doctor:
                var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
                var hasVisited = await db.Appointments
                    .AnyAsync(
                        item => item.PatientId == patientId && item.DoctorId == doctorId,
                        cancellationToken);
                if (!hasVisited)
                {
                    throw new ForbiddenAppException();
                }

                return;
            default:
                throw new ForbiddenAppException();
        }
    }

    private async Task<Guid> GetCurrentPatientIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        return await db.Patients
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ForbiddenAppException("Patient profile not found.");
    }

    private async Task<Guid> GetCurrentDoctorIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        return await db.Doctors
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ForbiddenAppException("Doctor profile not found.");
    }

    private static Gender ParseGender(string value)
    {
        if (Enum.TryParse<Gender>(value, ignoreCase: true, out var gender) &&
            Enum.IsDefined(gender))
        {
            return gender;
        }

        throw new ValidationAppException(
            "Choose a valid gender.",
            new Dictionary<string, string[]> { ["gender"] = ["Use Female, Male, or Other."] });
    }

    private void ValidateDateOfBirth(DateOnly dateOfBirth)
    {
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        if (dateOfBirth == default || dateOfBirth > today || dateOfBirth < today.AddYears(-120))
        {
            throw new ValidationAppException(
                "Enter a valid date of birth.",
                new Dictionary<string, string[]> { ["dateOfBirth"] = ["Enter a date in the past."] });
        }
    }
}
