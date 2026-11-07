using System.ComponentModel.DataAnnotations;

namespace AmazeCare.Application.Features.Specializations;

public sealed class SaveSpecializationRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Description { get; set; } = string.Empty;
}

public sealed record SpecializationDto(
    Guid Id,
    string Name,
    string Description,
    int DoctorCount);
