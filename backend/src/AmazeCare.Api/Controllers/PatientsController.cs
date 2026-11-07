using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Patients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class PatientsController(PatientService patientService) : BaseApiController
{
    [HttpGet]
    [Authorize(Roles = "admin,doctor")]
    [ProducesResponseType<PagedResult<PatientDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PatientDto>>> Search(
        [FromQuery] PatientSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await patientService.SearchAsync(query, cancellationToken));

    [HttpGet("me")]
    [Authorize(Roles = "patient")]
    [ProducesResponseType<PatientDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientDto>> Me(CancellationToken cancellationToken) =>
        Ok(await patientService.GetOwnProfileAsync(cancellationToken));

    [HttpPut("me")]
    [Authorize(Roles = "patient")]
    [ProducesResponseType<PatientDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientDto>> UpdateMe(
        [FromBody] UpdatePatientRequest request,
        CancellationToken cancellationToken) =>
        Ok(await patientService.UpdateOwnProfileAsync(request, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "admin,doctor,patient")]
    [ProducesResponseType<PatientDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await patientService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<PatientCreatedResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<PatientCreatedResponse>> Create(
        [FromBody] CreatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var result = await patientService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = result.Patient.Id, version = "1" },
            result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<PatientDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PatientDto>> Update(
        Guid id,
        [FromBody] UpdatePatientRequest request,
        CancellationToken cancellationToken) =>
        Ok(await patientService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await patientService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
