using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Appointments;

public sealed class AppointmentService(
    IAppDbContext db,
    ICurrentUserService currentUser,
    INotificationService notifications,
    TimeProvider timeProvider)
{
    public async Task<PagedResult<AppointmentDto>> SearchAsync(
        AppointmentSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var role = currentUser.Role ?? throw new UnauthorizedAppException();

        var appointments = db.Appointments
            .AsNoTracking()
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Include(item => item.Consultation)
            .Include(item => item.Invoice)
            .AsQueryable();

        if (role == UserRole.Patient)
        {
            var patientId = await GetCurrentPatientIdAsync(cancellationToken);
            appointments = appointments.Where(item => item.PatientId == patientId);
        }
        else if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            appointments = appointments.Where(item => item.DoctorId == doctorId);
        }
        else if (role != UserRole.Admin)
        {
            throw new ForbiddenAppException();
        }

        if (query.PatientId is { } patientFilter && role == UserRole.Admin)
        {
            appointments = appointments.Where(item => item.PatientId == patientFilter);
        }

        if (query.DoctorId is { } doctorFilter && role == UserRole.Admin)
        {
            appointments = appointments.Where(item => item.DoctorId == doctorFilter);
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<AppointmentStatus>(query.Status, true, out var status) ||
                !Enum.IsDefined(status))
            {
                throw new ValidationAppException("Choose a valid appointment status.");
            }

            appointments = appointments.Where(item => item.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.From))
        {
            var from = ParseDate(query.From, "from");
            appointments = appointments.Where(item => item.Date >= from);
        }

        if (!string.IsNullOrWhiteSpace(query.To))
        {
            var to = ParseDate(query.To, "to");
            appointments = appointments.Where(item => item.Date <= to);
        }

        var total = await appointments.CountAsync(cancellationToken);
        var items = await appointments
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Time)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AppointmentDto>(
            items.Select(item => item.ToAppointmentDto()).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<AppointmentDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(id, asTracking: false, cancellationToken);
        await EnsureCanAccessAsync(appointment, cancellationToken);
        return appointment.ToAppointmentDto();
    }

    public async Task<AppointmentDto> CreateAsync(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        if (role is not (UserRole.Patient or UserRole.Admin))
        {
            throw new ForbiddenAppException("Only patients or administrators can book appointments.");
        }

        Guid patientId;
        if (role == UserRole.Patient)
        {
            patientId = await GetCurrentPatientIdAsync(cancellationToken);
            if (request.PatientId is { } requestedPatientId && requestedPatientId != patientId)
            {
                throw new ForbiddenAppException("You can only book appointments for your own account.");
            }
        }
        else
        {
            patientId = request.PatientId
                ?? throw new ValidationAppException(
                    "Choose a patient for the appointment.",
                    new Dictionary<string, string[]> { ["patientId"] = ["Patient is required."] });
        }

        var patient = await db.Patients
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == patientId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Patient not found.");

        var doctor = await db.Doctors
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Include(item => item.Availability)
            .FirstOrDefaultAsync(item => item.Id == request.DoctorId && item.User.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Doctor not found.");

        var date = ParseDate(request.Date, "date");
        var time = ParseTime(request.Time, "time");
        var localNow = ClinicTime.LocalNow(timeProvider);

        if (!AvailabilityCalculator.TryValidateSlot(doctor.Availability, date, time, localNow, out var slotError))
        {
            throw new ValidationAppException(slotError!);
        }

        var slotTaken = await db.Appointments.AnyAsync(
            item => item.DoctorId == doctor.Id &&
                    item.Date == date &&
                    item.Time == time &&
                    (item.Status == AppointmentStatus.Pending || item.Status == AppointmentStatus.Confirmed),
            cancellationToken);

        if (slotTaken)
        {
            throw new ConflictAppException("That slot has just been taken. Choose another time.");
        }

        var patientBusy = await db.Appointments.AnyAsync(
            item => item.PatientId == patientId &&
                    item.Date == date &&
                    item.Time == time &&
                    (item.Status == AppointmentStatus.Pending || item.Status == AppointmentStatus.Confirmed),
            cancellationToken);

        if (patientBusy)
        {
            throw new ConflictAppException("You already have an appointment at that time.");
        }

        var appointment = new Appointment
        {
            PatientId = patient.Id,
            Patient = patient,
            DoctorId = doctor.Id,
            Doctor = doctor,
            Date = date,
            Time = time,
            Status = AppointmentStatus.Pending,
            Symptoms = request.Symptoms.Trim(),
            NatureOfVisit = request.NatureOfVisit.Trim(),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendAppointmentReceivedAsync(appointment, cancellationToken);
        return appointment.ToAppointmentDto();
    }

    public async Task<AppointmentDto> ConfirmAsync(Guid id, CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(id, asTracking: true, cancellationToken);
        await EnsureCanManageAsync(appointment, cancellationToken);

        if (appointment.Status != AppointmentStatus.Pending)
        {
            throw new ConflictAppException("Only pending appointment requests can be confirmed.");
        }

        appointment.Status = AppointmentStatus.Confirmed;
        appointment.UpdatedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendAppointmentConfirmedAsync(appointment, cancellationToken);
        return appointment.ToAppointmentDto();
    }

    public async Task<AppointmentDto> RejectAsync(
        Guid id,
        string reason,
        CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(id, asTracking: true, cancellationToken);
        await EnsureCanManageAsync(appointment, cancellationToken);

        if (appointment.Status != AppointmentStatus.Pending)
        {
            throw new ConflictAppException("Only pending appointment requests can be rejected.");
        }

        appointment.Status = AppointmentStatus.Rejected;
        appointment.CancellationReason = reason.Trim();
        appointment.UpdatedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendAppointmentRejectedAsync(appointment, appointment.CancellationReason, cancellationToken);
        return appointment.ToAppointmentDto();
    }

    public async Task<AppointmentDto> CancelAsync(
        Guid id,
        string reason,
        CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(id, asTracking: true, cancellationToken);
        await EnsureCanAccessAsync(appointment, cancellationToken);

        if (appointment.Status is not (AppointmentStatus.Pending or AppointmentStatus.Confirmed))
        {
            throw new ConflictAppException("Only pending or confirmed appointments can be cancelled.");
        }

        var localNow = ClinicTime.LocalNow(timeProvider);
        if (!AvailabilityCalculator.IsFuture(appointment.Date, appointment.Time, localNow))
        {
            throw new ConflictAppException("A past appointment cannot be cancelled.");
        }

        appointment.Status = AppointmentStatus.Cancelled;
        appointment.CancellationReason = reason.Trim();
        appointment.UpdatedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(cancellationToken);

        var cancelledBy = currentUser.Role switch
        {
            UserRole.Patient => "patient",
            UserRole.Doctor => "doctor",
            _ => "clinic"
        };

        await notifications.SendAppointmentCancelledAsync(
            appointment,
            appointment.CancellationReason,
            cancelledBy,
            cancellationToken);

        return appointment.ToAppointmentDto();
    }

    public async Task<AppointmentDto> RescheduleAsync(
        Guid id,
        string dateValue,
        string timeValue,
        CancellationToken cancellationToken)
    {
        var appointment = await LoadAppointmentAsync(id, asTracking: true, cancellationToken);
        await EnsureCanAccessAsync(appointment, cancellationToken);

        if (appointment.Status is not (AppointmentStatus.Pending or AppointmentStatus.Confirmed))
        {
            throw new ConflictAppException("Only pending or confirmed appointments can be rescheduled.");
        }

        var date = ParseDate(dateValue, "date");
        var time = ParseTime(timeValue, "time");
        var localNow = ClinicTime.LocalNow(timeProvider);

        if (!AvailabilityCalculator.TryValidateSlot(
                appointment.Doctor.Availability,
                date,
                time,
                localNow,
                out var slotError))
        {
            throw new ValidationAppException(slotError!);
        }

        var slotTaken = await db.Appointments.AnyAsync(
            item => item.Id != appointment.Id &&
                    item.DoctorId == appointment.DoctorId &&
                    item.Date == date &&
                    item.Time == time &&
                    (item.Status == AppointmentStatus.Pending || item.Status == AppointmentStatus.Confirmed),
            cancellationToken);

        if (slotTaken)
        {
            throw new ConflictAppException("That slot is already booked. Choose another time.");
        }

        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        appointment.Date = date;
        appointment.Time = time;
        appointment.Status = role == UserRole.Patient ? AppointmentStatus.Pending : AppointmentStatus.Confirmed;
        appointment.CancellationReason = null;
        appointment.UpdatedAtUtc = timeProvider.GetUtcNow().UtcDateTime;

        await db.SaveChangesAsync(cancellationToken);

        var by = role switch
        {
            UserRole.Patient => "patient",
            UserRole.Doctor => "doctor",
            _ => "clinic"
        };

        await notifications.SendAppointmentRescheduledAsync(appointment, by, cancellationToken);
        return appointment.ToAppointmentDto();
    }

    private async Task<Appointment> LoadAppointmentAsync(
        Guid id,
        bool asTracking,
        CancellationToken cancellationToken)
    {
        var query = db.Appointments
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Availability)
            .Include(item => item.Consultation)
            .Include(item => item.Invoice)
            .AsQueryable();

        if (!asTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundAppException("Appointment not found.");
    }

    private async Task EnsureCanAccessAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        switch (role)
        {
            case UserRole.Admin:
                return;
            case UserRole.Patient:
                var patientId = await GetCurrentPatientIdAsync(cancellationToken);
                if (appointment.PatientId != patientId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            case UserRole.Doctor:
                var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
                if (appointment.DoctorId != doctorId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            default:
                throw new ForbiddenAppException();
        }
    }

    private async Task EnsureCanManageAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        if (role == UserRole.Admin)
        {
            return;
        }

        if (role != UserRole.Doctor)
        {
            throw new ForbiddenAppException("Only the doctor or an administrator can manage this request.");
        }

        var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
        if (appointment.DoctorId != doctorId)
        {
            throw new ForbiddenAppException();
        }
    }

    private async Task<Guid> GetCurrentPatientIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var patientId = await db.Patients
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return patientId ?? throw new ForbiddenAppException("Patient profile not found.");
    }

    private async Task<Guid> GetCurrentDoctorIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var doctorId = await db.Doctors
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return doctorId ?? throw new ForbiddenAppException("Doctor profile not found.");
    }

    private static DateOnly ParseDate(string value, string field)
    {
        if (DateOnly.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date))
        {
            return date;
        }

        throw new ValidationAppException(
            "Use a valid date.",
            new Dictionary<string, string[]> { [field] = ["Use the yyyy-MM-dd format."] });
    }

    private static TimeOnly ParseTime(string value, string field)
    {
        if (TimeOnly.TryParseExact(
                value,
                "HH:mm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var time))
        {
            return time;
        }

        throw new ValidationAppException(
            "Use a valid time.",
            new Dictionary<string, string[]> { [field] = ["Use the HH:mm format."] });
    }
}
