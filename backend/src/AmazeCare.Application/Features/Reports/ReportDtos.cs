namespace AmazeCare.Application.Features.Reports;

public sealed record OverviewStatDto(string Label, decimal Value, string Hint);

public sealed record AdminOverviewDto(
    int UpcomingVisits,
    int PendingRequests,
    int Invoices,
    decimal Collected,
    decimal Outstanding,
    int CollectionRate,
    int WeekVisits,
    int WeekDoctors,
    int WeekDepartments,
    string? NextClinicDate,
    int NextClinicCount,
    IReadOnlyList<DailyVisitDto> WeekDays,
    IReadOnlyList<AppointmentSummaryDto> Upcoming,
    IReadOnlyList<AppointmentSummaryDto> Attention);

public sealed record DailyVisitDto(string Date, int Count);

public sealed record AppointmentSummaryDto(
    Guid Id,
    string PatientName,
    string DoctorName,
    string SpecializationName,
    string Date,
    string Time,
    string Status);

public sealed record DepartmentRevenueDto(
    Guid? SpecializationId,
    string Name,
    decimal Amount,
    int Invoices);

public sealed record DoctorPerformanceDto(
    Guid DoctorId,
    string DoctorName,
    string SpecializationName,
    int Visits,
    decimal Revenue,
    decimal AverageInvoice);

public sealed record StatusCountDto(string Status, int Count);

public sealed record RevenueReportDto(
    string From,
    string To,
    int InvoiceCount,
    int AppointmentCount,
    decimal Billed,
    decimal Collected,
    decimal Outstanding,
    decimal AverageInvoice,
    IReadOnlyList<DepartmentRevenueDto> DepartmentRevenue,
    IReadOnlyList<DoctorPerformanceDto> Doctors,
    IReadOnlyList<StatusCountDto> StatusCounts);

public sealed record DoctorWorkloadDto(
    Guid DoctorId,
    string DoctorName,
    string SpecializationName,
    int CompletedVisits,
    int UpcomingVisits,
    decimal Revenue);
