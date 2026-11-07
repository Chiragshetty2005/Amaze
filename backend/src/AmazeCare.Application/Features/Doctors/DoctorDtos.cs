using System.ComponentModel.DataAnnotations;

namespace AmazeCare.Application.Features.Doctors;

public sealed class DoctorAvailabilityInput
{
    [Range(0, 6)]
    public int Day { get; set; }

    [Required, RegularExpression(@"^\d{2}:\d{2}$")]
    public string Start { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{2}:\d{2}$")]
    public string End { get; set; } = string.Empty;

    [Range(10, 180)]
    public int SlotMinutes { get; set; } = 30;
}

public sealed class CreateDoctorRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public Guid SpecializationId { get; set; }

    [Range(0, 70)]
    public int ExperienceYears { get; set; }

    [Required, MaxLength(160)]
    public string Qualification { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Designation { get; set; } = string.Empty;

    [Range(0, 1_000_000)]
    public decimal Fee { get; set; }

    [Required, MaxLength(2000)]
    public string Bio { get; set; } = string.Empty;

    [MaxLength(60)]
    public string? Room { get; set; }

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    public List<DoctorAvailabilityInput> Availability { get; set; } = [];
}

public sealed class UpdateDoctorRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public Guid SpecializationId { get; set; }

    [Range(0, 70)]
    public int ExperienceYears { get; set; }

    [Required, MaxLength(160)]
    public string Qualification { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Designation { get; set; } = string.Empty;

    [Range(0, 1_000_000)]
    public decimal Fee { get; set; }

    [Required, MaxLength(2000)]
    public string Bio { get; set; } = string.Empty;

    [MaxLength(60)]
    public string? Room { get; set; }

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    public List<DoctorAvailabilityInput> Availability { get; set; } = [];
}

public sealed class UpdateOwnDoctorRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Qualification { get; set; } = string.Empty;

    [Required, MaxLength(160)]
    public string Designation { get; set; } = string.Empty;

    [Range(0, 1_000_000)]
    public decimal Fee { get; set; }

    [Required, MaxLength(2000)]
    public string Bio { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }
}

public sealed record DoctorAvailabilityDto(
    int Day,
    string Start,
    string End,
    int SlotMinutes);

public sealed record DoctorDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    string Phone,
    string? PhotoUrl,
    Guid SpecializationId,
    string SpecializationName,
    int ExperienceYears,
    string Qualification,
    string Designation,
    decimal Fee,
    string Bio,
    string? Room,
    IReadOnlyList<DoctorAvailabilityDto> Availability);

public sealed record DoctorCreatedResponse(DoctorDto Doctor, bool InvitationSent);

public sealed record AvailableSlotDto(string Date, string Time);

public sealed class DoctorSearchQuery
{
    public string? Search { get; set; }
    public Guid? SpecializationId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
