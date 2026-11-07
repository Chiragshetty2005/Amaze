namespace AmazeCare.Application.Common;

public sealed record InvoicePdfModel(
    string ClinicName,
    string ClinicAddress,
    string ClinicPhone,
    string ClinicEmail,
    string? Gstin,
    string InvoiceNumber,
    string IssuedAt,
    string Status,
    string PatientName,
    string PatientEmail,
    string PatientPhone,
    string PatientAddress,
    string DoctorName,
    string DoctorQualification,
    string DoctorSpecialization,
    IReadOnlyList<InvoicePdfItem> Items,
    decimal Subtotal,
    decimal TaxRate,
    decimal TaxAmount,
    decimal TotalAmount);

public sealed record InvoicePdfItem(string Description, decimal Amount);
