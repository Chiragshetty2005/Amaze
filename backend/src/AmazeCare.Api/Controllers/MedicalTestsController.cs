using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class MedicalTestsController(MedicalTestService testService) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType<PagedResult<MedicalTestDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MedicalTestDto>>> Search(
        [FromQuery] CatalogSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await testService.SearchAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType<MedicalTestDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicalTestDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await testService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<MedicalTestDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MedicalTestDto>> Create(
        [FromBody] SaveMedicalTestRequest request,
        CancellationToken cancellationToken)
    {
        var test = await testService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = test.Id, version = "1" },
            test);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<MedicalTestDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MedicalTestDto>> Update(
        Guid id,
        [FromBody] SaveMedicalTestRequest request,
        CancellationToken cancellationToken) =>
        Ok(await testService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await testService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
