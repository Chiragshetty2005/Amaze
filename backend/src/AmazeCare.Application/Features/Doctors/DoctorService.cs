using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Doctors;

public sealed class DoctorService(
    IAppDbContext db,
    IPasswordHasher passwordHasher,
    ICurrentUserService currentUser,
    INotificationService notifications,
    TimeProvider timeProvider)
{
    public async Task<PagedResult<DoctorDto>> SearchAsync(
        DoctorSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var doctors = db.Doctors
            .AsNoTracking()
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .Where(item => item.User.IsActive);

        if (query.SpecializationId is { } specializationId)
        {
            doctors = doctors.Where(item => item.SpecializationId == specializationId);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            doctors = doctors.Where(item =>
                item.User.FullName.Contains(search) ||
                item.Specialization.Name.Contains(search) ||
                item.Qualification.Contains(search) ||
                item.Designation.Contains(search));
        }

        var total = await doctors.CountAsync(cancellationToken);
        var items = await doctors
            .OrderBy(item => item.User.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<DoctorDto>(
            items.Select(item => item.ToDoctorDto()).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<DoctorDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors
            .AsNoTracking()
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor not found.");

        return doctor.ToDoctorDto();
    }

    public async Task<DoctorDto> GetOwnProfileAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var doctor = await db.Doctors
            .AsNoTracking()
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.UserId == userId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor profile not found.");

        return doctor.ToDoctorDto();
    }

    public async Task<IReadOnlyList<AvailableSlotDto>> GetAvailableSlotsAsync(
        Guid doctorId,
        DateOnly from,
        int days,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors
            .AsNoTracking()
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.Id == doctorId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor not found.");

        var safeDays = Math.Clamp(days, 1, 31);
        var to = from.AddDays(safeDays);
        var booked = await db.Appointments
            .AsNoTracking()
            .Where(item =>
                item.DoctorId == doctorId &&
                item.Date >= from &&
                item.Date < to &&
                (item.Status == AppointmentStatus.Pending || item.Status == AppointmentStatus.Confirmed))
            .Select(item => new { item.Date, item.Time })
            .ToListAsync(cancellationToken);

        var bookedSet = booked
            .Select(item => (item.Date, item.Time))
            .ToHashSet();

        return AvailabilityCalculator
            .Generate(
                doctor.Availability,
                from,
                safeDays,
                bookedSet,
                ClinicTime.LocalNow(timeProvider))
            .Select(item => new AvailableSlotDto(item.Date.ToDateString(), item.Time.ToTimeString()))
            .ToList();
    }

    public async Task<DoctorCreatedResponse> CreateAsync(
        CreateDoctorRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(item => item.Email == email, cancellationToken))
        {
            throw new ConflictAppException("An account already uses that email.");
        }

        var specialization = await db.Specializations
            .FirstOrDefaultAsync(item => item.Id == request.SpecializationId && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Specialization not found.");

        var availability = ParseAvailability(request.Availability);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var user = new User
        {
            FullName = request.Name.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            Role = UserRole.Doctor,
            PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim(),
            PasswordHash = passwordHasher.Hash(SecurityTokens.Create(32)),
            CreatedAtUtc = now
        };

        var doctor = new Doctor
        {
            User = user,
            Specialization = specialization,
            ExperienceYears = request.ExperienceYears,
            Qualification = request.Qualification.Trim(),
            Designation = request.Designation.Trim(),
            Fee = request.Fee,
            Bio = request.Bio.Trim(),
            Room = string.IsNullOrWhiteSpace(request.Room) ? null : request.Room.Trim(),
            CreatedAtUtc = now,
            Availability = availability
        };

        user.Doctor = doctor;
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
        await notifications.SendInvitationAsync(user, "doctor", rawInviteToken, cancellationToken);

        return new DoctorCreatedResponse(doctor.ToDoctorDto(), true);
    }

    public async Task<DoctorDto> UpdateAsync(
        Guid id,
        UpdateDoctorRequest request,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor not found.");

        var specialization = await db.Specializations
            .FirstOrDefaultAsync(item => item.Id == request.SpecializationId && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Specialization not found.");

        var availability = ParseAvailability(request.Availability);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        doctor.User.FullName = request.Name.Trim();
        doctor.User.Phone = request.Phone.Trim();
        doctor.User.PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim();
        doctor.SpecializationId = specialization.Id;
        doctor.Specialization = specialization;
        doctor.ExperienceYears = request.ExperienceYears;
        doctor.Qualification = request.Qualification.Trim();
        doctor.Designation = request.Designation.Trim();
        doctor.Fee = request.Fee;
        doctor.Bio = request.Bio.Trim();
        doctor.Room = string.IsNullOrWhiteSpace(request.Room) ? null : request.Room.Trim();

        db.DoctorAvailability.RemoveRange(doctor.Availability);
        doctor.Availability = availability;

        await db.SaveChangesAsync(cancellationToken);
        return doctor.ToDoctorDto();
    }

    public async Task<DoctorDto> UpdateOwnProfileAsync(
        UpdateOwnDoctorRequest request,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var doctor = await db.Doctors
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.UserId == userId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor profile not found.");

        doctor.User.FullName = request.Name.Trim();
        doctor.User.Phone = request.Phone.Trim();
        doctor.User.PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim();
        doctor.Qualification = request.Qualification.Trim();
        doctor.Designation = request.Designation.Trim();
        doctor.Fee = request.Fee;
        doctor.Bio = request.Bio.Trim();

        await db.SaveChangesAsync(cancellationToken);
        return doctor.ToDoctorDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Appointments)
                .ThenInclude(item => item.Patient)
                    .ThenInclude(item => item.User)
            .Include(item => item.Appointments)
                .ThenInclude(item => item.Doctor)
                    .ThenInclude(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor not found.");

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        doctor.User.IsActive = false;

        var refreshTokens = await db.RefreshTokens
            .Where(item => item.UserId == doctor.UserId && item.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in refreshTokens)
        {
            token.RevokedAtUtc = now;
        }

        var cancelled = new List<Appointment>();
        foreach (var appointment in doctor.Appointments.Where(item =>
                     item.Date >= today &&
                     item.Status is AppointmentStatus.Pending or AppointmentStatus.Confirmed))
        {
            appointment.Status = AppointmentStatus.Cancelled;
            appointment.CancellationReason = "The doctor is no longer available at the clinic.";
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

    private static List<DoctorAvailability> ParseAvailability(IEnumerable<DoctorAvailabilityInput> inputs)
    {
        var windows = inputs.ToList();
        var parsed = new List<DoctorAvailability>();

        foreach (var input in windows)
        {
            if (input.Day is < 0 or > 6)
            {
                throw AvailabilityError("Each clinic day must be between Sunday and Saturday.");
            }

            if (!TimeOnly.TryParseExact(input.Start, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start) ||
                !TimeOnly.TryParseExact(input.End, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end))
            {
                throw AvailabilityError("Clinic times must use the HH:mm format.");
            }

            if (end <= start)
            {
                throw AvailabilityError("Clinic end time must be later than the start time.");
            }

            if (input.SlotMinutes is < 10 or > 180)
            {
                throw AvailabilityError("Slot length must be between 10 and 180 minutes.");
            }

            parsed.Add(new DoctorAvailability
            {
                Day = input.Day,
                StartTime = start,
                EndTime = end,
                SlotMinutes = input.SlotMinutes
            });
        }

        foreach (var day in parsed.GroupBy(item => item.Day))
        {
            var ordered = day.OrderBy(item => item.StartTime).ToList();
            for (var index = 1; index < ordered.Count; index++)
            {
                if (ordered[index].StartTime < ordered[index - 1].EndTime)
                {
                    throw AvailabilityError("Clinic windows on the same day cannot overlap.");
                }
            }
        }

        return parsed;
    }

    private static ValidationAppException AvailabilityError(string message) =>
        new(message, new Dictionary<string, string[]> { ["availability"] = [message] });
}
