using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class MedicinesController(MedicineService medicineService) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType<PagedResult<MedicineDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MedicineDto>>> Search(
        [FromQuery] CatalogSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await medicineService.SearchAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType<MedicineDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicineDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await medicineService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<MedicineDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MedicineDto>> Create(
        [FromBody] SaveMedicineRequest request,
        CancellationToken cancellationToken)
    {
        var medicine = await medicineService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = medicine.Id, version = "1" },
            medicine);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<MedicineDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicineDto>> Update(
        Guid id,
        [FromBody] SaveMedicineRequest request,
        CancellationToken cancellationToken) =>
        Ok(await medicineService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await medicineService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
