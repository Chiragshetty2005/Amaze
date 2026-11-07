using AmazeCare.Application.Features.Specializations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class SpecializationsController(SpecializationService specializationService) : BaseApiController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<SpecializationDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SpecializationDto>>> List(
        CancellationToken cancellationToken) =>
        Ok(await specializationService.ListAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<SpecializationDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SpecializationDto>> Get(
        Guid id,
        CancellationToken cancellationToken) =>
        Ok(await specializationService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<SpecializationDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SpecializationDto>> Create(
        [FromBody] SaveSpecializationRequest request,
        CancellationToken cancellationToken)
    {
        var specialization = await specializationService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = specialization.Id, version = "1" },
            specialization);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<SpecializationDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SpecializationDto>> Update(
        Guid id,
        [FromBody] SaveSpecializationRequest request,
        CancellationToken cancellationToken) =>
        Ok(await specializationService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await specializationService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
