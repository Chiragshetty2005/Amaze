using System.ComponentModel.DataAnnotations;
using AmazeCare.Application.Features.Invoices;

namespace AmazeCare.Application.Features.Consultations;

public sealed class PrescriptionInput
{
    [Required]
    public Guid MedicineId { get; set; }

    [Range(0, 20)]
    public int Morning { get; set; }

    [Range(0, 20)]
    public int Afternoon { get; set; }

    [Range(0, 20)]
    public int Night { get; set; }

    [Required]
    public string FoodRelation { get; set; } = string.Empty;

    [Range(1, 365)]
    public int DurationDays { get; set; }

    [MaxLength(500)]
    public string? Instructions { get; set; }
}

public sealed class CreateConsultationRequest
{
    [Required]
    public Guid AppointmentId { get; set; }

    [Required, MaxLength(2000)]
    public string Symptoms { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string PhysicalExam { get; set; } = string.Empty;

    [Required, MaxLength(2000)]
    public string TreatmentPlan { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Diagnosis { get; set; } = string.Empty;

    public List<Guid> TestIds { get; set; } = [];

    public List<PrescriptionInput> Prescription { get; set; } = [];
}

public sealed record PrescriptionItemDto(
    Guid Id,
    Guid? MedicineId,
    string MedicineName,
    int Morning,
    int Afternoon,
    int Night,
    string FoodRelation,
    int DurationDays,
    string Instructions);

public sealed record ConsultationTestDto(Guid Id, string Name, decimal Price);

public sealed record ConsultationDto(
    Guid Id,
    Guid AppointmentId,
    Guid PatientId,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    string Symptoms,
    string PhysicalExam,
    string TreatmentPlan,
    string Diagnosis,
    IReadOnlyList<ConsultationTestDto> Tests,
    IReadOnlyList<PrescriptionItemDto> Prescription,
    DateTime CreatedAt);

public sealed record ConsultationResultDto(ConsultationDto Consultation, InvoiceDto Invoice);

public sealed class ConsultationSearchQuery
{
    public string? From { get; set; }
    public string? To { get; set; }
    public Guid? PatientId { get; set; }
    public Guid? DoctorId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
