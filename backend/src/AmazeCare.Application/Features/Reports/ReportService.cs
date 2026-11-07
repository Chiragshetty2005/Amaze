using AmazeCare.Application.Common;
using AmazeCare.Domain;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Reports;

public sealed class ReportService(IAppDbContext db, TimeProvider timeProvider)
{
    public async Task<AdminOverviewDto> GetOverviewAsync(CancellationToken cancellationToken)
    {
        var now = ClinicTime.LocalNow(timeProvider);
        var today = DateOnly.FromDateTime(now);
        var weekEnd = today.AddDays(6);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Where(item =>
                item.Date >= today &&
                (item.Status == AppointmentStatus.Pending || item.Status == AppointmentStatus.Confirmed))
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Time)
            .ToListAsync(cancellationToken);

        var invoices = await db.Invoices
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var pending = appointments.Where(item => item.Status == AppointmentStatus.Pending).ToList();
        var weekVisits = appointments.Where(item => item.Date <= weekEnd).ToList();
        var paid = invoices.Where(item => item.Status == InvoiceStatus.Paid).Sum(item => item.TotalAmount);
        var outstanding = invoices.Where(item => item.Status == InvoiceStatus.Issued).Sum(item => item.TotalAmount);
        var billingTotal = paid + outstanding;
        var nextClinicDate = weekVisits.FirstOrDefault()?.Date;

        return new AdminOverviewDto(
            appointments.Count,
            pending.Count,
            invoices.Count,
            paid,
            outstanding,
            billingTotal > 0 ? (int)Math.Round(paid / billingTotal * 100) : 0,
            weekVisits.Count,
            weekVisits.Select(item => item.DoctorId).Distinct().Count(),
            weekVisits.Select(item => item.Doctor.SpecializationId).Distinct().Count(),
            nextClinicDate?.ToDateString(),
            nextClinicDate is { } date
                ? weekVisits.Count(item => item.Date == date)
                : 0,
            Enumerable.Range(0, 7)
                .Select(offset =>
                {
                    var date = today.AddDays(offset);
                    return new DailyVisitDto(
                        date.ToDateString(),
                        weekVisits.Count(item => item.Date == date));
                })
                .ToList(),
            appointments.Take(8).Select(ToSummaryDto).ToList(),
            pending.Take(2).Select(ToSummaryDto).ToList());
    }

    public async Task<RevenueReportDto> GetRevenueAsync(int days, CancellationToken cancellationToken)
    {
        var safeDays = Math.Clamp(days, 1, 365);
        var now = ClinicTime.LocalNow(timeProvider);
        var today = DateOnly.FromDateTime(now);
        var cutoff = today.AddDays(-(safeDays - 1));

        var invoices = await db.Invoices
            .AsNoTracking()
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Where(item => item.IssuedAt >= cutoff && item.IssuedAt <= today)
            .ToListAsync(cancellationToken);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Where(item => item.Date >= cutoff && item.Date <= today)
            .ToListAsync(cancellationToken);

        var doctors = await db.Doctors
            .AsNoTracking()
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Where(item => item.User.IsActive)
            .ToListAsync(cancellationToken);

        var billed = invoices.Sum(item => item.TotalAmount);
        var collected = invoices.Where(item => item.Status == InvoiceStatus.Paid).Sum(item => item.TotalAmount);
        var outstanding = invoices.Where(item => item.Status == InvoiceStatus.Issued).Sum(item => item.TotalAmount);

        var departmentRevenue = invoices
            .GroupBy(item => item.Doctor.SpecializationId)
            .Select(group =>
            {
                var doctor = group.First().Doctor;
                return new DepartmentRevenueDto(
                    group.Key,
                    doctor.Specialization.Name,
                    group.Sum(item => item.TotalAmount),
                    group.Count());
            })
            .OrderByDescending(item => item.Amount)
            .ToList();

        var completed = appointments.Where(item => item.Status == AppointmentStatus.Completed).ToList();
        var doctorPerformance = doctors
            .Select(doctor =>
            {
                var doctorInvoices = invoices.Where(item => item.DoctorId == doctor.Id).ToList();
                var revenue = doctorInvoices.Sum(item => item.TotalAmount);
                return new DoctorPerformanceDto(
                    doctor.Id,
                    doctor.User.FullName,
                    doctor.Specialization.Name,
                    completed.Count(item => item.DoctorId == doctor.Id),
                    revenue,
                    doctorInvoices.Count > 0 ? Math.Round(revenue / doctorInvoices.Count, 0) : 0);
            })
            .Where(item => item.Visits > 0 || item.Revenue > 0)
            .OrderByDescending(item => item.Revenue)
            .ThenByDescending(item => item.Visits)
            .ToList();

        var statusOrder = new[]
        {
            AppointmentStatus.Completed,
            AppointmentStatus.Confirmed,
            AppointmentStatus.Pending,
            AppointmentStatus.Cancelled,
            AppointmentStatus.Rejected
        };

        return new RevenueReportDto(
            cutoff.ToDateString(),
            today.ToDateString(),
            invoices.Count,
            appointments.Count,
            billed,
            collected,
            outstanding,
            invoices.Count > 0 ? Math.Round(billed / invoices.Count, 0) : 0,
            departmentRevenue,
            doctorPerformance,
            statusOrder
                .Select(status => new StatusCountDto(
                    status.ToApiString(),
                    appointments.Count(item => item.Status == status)))
                .ToList());
    }

    public async Task<IReadOnlyList<DoctorWorkloadDto>> GetDoctorWorkloadAsync(
        int days,
        CancellationToken cancellationToken)
    {
        var safeDays = Math.Clamp(days, 1, 365);
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        var cutoff = today.AddDays(-(safeDays - 1));

        var doctors = await db.Doctors
            .AsNoTracking()
            .Include(item => item.User)
            .Include(item => item.Specialization)
            .Where(item => item.User.IsActive)
            .ToListAsync(cancellationToken);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Where(item => item.Date >= cutoff)
            .ToListAsync(cancellationToken);

        var invoices = await db.Invoices
            .AsNoTracking()
            .Where(item => item.IssuedAt >= cutoff && item.IssuedAt <= today)
            .ToListAsync(cancellationToken);

        return doctors
            .Select(doctor => new DoctorWorkloadDto(
                doctor.Id,
                doctor.User.FullName,
                doctor.Specialization.Name,
                appointments.Count(item =>
                    item.DoctorId == doctor.Id && item.Status == AppointmentStatus.Completed),
                appointments.Count(item =>
                    item.DoctorId == doctor.Id &&
                    item.Date >= today &&
                    item.Status is AppointmentStatus.Pending or AppointmentStatus.Confirmed),
                invoices.Where(item => item.DoctorId == doctor.Id).Sum(item => item.TotalAmount)))
            .OrderByDescending(item => item.Revenue)
            .ThenBy(item => item.DoctorName)
            .ToList();
    }

    private static AppointmentSummaryDto ToSummaryDto(Domain.Entities.Appointment appointment) =>
        new(
            appointment.Id,
            appointment.Patient.User.FullName,
            appointment.Doctor.User.FullName,
            appointment.Doctor.Specialization.Name,
            appointment.Date.ToDateString(),
            appointment.Time.ToTimeString(),
            appointment.Status.ToApiString());
}
