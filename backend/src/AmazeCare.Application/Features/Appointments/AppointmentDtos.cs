using System.ComponentModel.DataAnnotations;

namespace AmazeCare.Application.Features.Appointments;

public sealed class CreateAppointmentRequest
{
    public Guid? PatientId { get; set; }

    [Required]
    public Guid DoctorId { get; set; }

    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$")]
    public string Date { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{2}:\d{2}$")]
    public string Time { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Symptoms { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string NatureOfVisit { get; set; } = string.Empty;
}

public sealed class RescheduleAppointmentRequest
{
    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$")]
    public string Date { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{2}:\d{2}$")]
    public string Time { get; set; } = string.Empty;
}

public sealed class CancelAppointmentRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class RejectAppointmentRequest
{
    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public sealed record AppointmentDto(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string PatientPhone,
    Guid DoctorId,
    string DoctorName,
    string SpecializationName,
    string Date,
    string Time,
    string Status,
    string Symptoms,
    string NatureOfVisit,
    DateTime CreatedAt,
    string? CancellationReason,
    bool HasConsultation,
    bool HasInvoice);

public sealed class AppointmentSearchQuery
{
    public string? Status { get; set; }
    public string? From { get; set; }
    public string? To { get; set; }
    public Guid? DoctorId { get; set; }
    public Guid? PatientId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
