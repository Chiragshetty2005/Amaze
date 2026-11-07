using System.ComponentModel.DataAnnotations;

namespace AmazeCare.Application.Features.Catalog;

public sealed class SaveMedicineRequest
{
    [Required, MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Form { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Strength { get; set; } = string.Empty;
}

public sealed record MedicineDto(Guid Id, string Name, string Form, string Strength);

public sealed class SaveMedicalTestRequest
{
    [Required, MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [Range(0, 1_000_000)]
    public decimal Price { get; set; }
}

public sealed record MedicalTestDto(Guid Id, string Name, decimal Price);

public sealed class CatalogSearchQuery
{
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 100;
}
