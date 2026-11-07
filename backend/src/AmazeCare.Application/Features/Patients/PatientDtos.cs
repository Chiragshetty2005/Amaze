using System.ComponentModel.DataAnnotations;

namespace AmazeCare.Application.Features.Patients;

public sealed class CreatePatientRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required]
    public string Gender { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Address { get; set; } = string.Empty;
}

public sealed class UpdatePatientRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required]
    public string Gender { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Address { get; set; } = string.Empty;
}

public sealed record PatientDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Email,
    string Phone,
    string DateOfBirth,
    string Gender,
    string Address);

public sealed record PatientCreatedResponse(PatientDto Patient, bool InvitationSent);

public sealed class PatientSearchQuery
{
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
