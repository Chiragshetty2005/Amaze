namespace AmazeCare.Application.Features.Invoices;

public sealed record InvoiceItemDto(string Description, decimal Amount);

public sealed record InvoiceDto(
    Guid Id,
    string InvoiceNumber,
    Guid AppointmentId,
    string AppointmentDate,
    Guid PatientId,
    string PatientName,
    string PatientEmail,
    Guid DoctorId,
    string DoctorName,
    string SpecializationName,
    string IssuedAt,
    IReadOnlyList<InvoiceItemDto> Items,
    decimal TaxRate,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string Status,
    DateTime? PaidAt);

public sealed class InvoiceSearchQuery
{
    public string? Status { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
