using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Doctors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class DoctorsController(
    DoctorService doctorService,
    TimeProvider timeProvider) : BaseApiController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<PagedResult<DoctorDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<DoctorDto>>> Search(
        [FromQuery] DoctorSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await doctorService.SearchAsync(query, cancellationToken));

    [HttpGet("me")]
    [Authorize(Roles = "doctor")]
    [ProducesResponseType<DoctorDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DoctorDto>> Me(CancellationToken cancellationToken) =>
        Ok(await doctorService.GetOwnProfileAsync(cancellationToken));

    [HttpPut("me")]
    [Authorize(Roles = "doctor")]
    [ProducesResponseType<DoctorDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DoctorDto>> UpdateMe(
        [FromBody] UpdateOwnDoctorRequest request,
        CancellationToken cancellationToken) =>
        Ok(await doctorService.UpdateOwnProfileAsync(request, cancellationToken));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<DoctorDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DoctorDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await doctorService.GetByIdAsync(id, cancellationToken));

    [HttpGet("{id:guid}/slots")]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<AvailableSlotDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AvailableSlotDto>>> Slots(
        Guid id,
        [FromQuery] string? from,
        [FromQuery] int days = 14,
        CancellationToken cancellationToken = default)
    {
        DateOnly start;
        if (string.IsNullOrWhiteSpace(from))
        {
            start = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        }
        else if (!DateOnly.TryParseExact(
                     from,
                     "yyyy-MM-dd",
                     CultureInfo.InvariantCulture,
                     DateTimeStyles.None,
                     out start))
        {
            throw new ValidationAppException(
                "Use a valid date.",
                new Dictionary<string, string[]> { ["from"] = ["Use the yyyy-MM-dd format."] });
        }

        return Ok(await doctorService.GetAvailableSlotsAsync(id, start, days, cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<DoctorCreatedResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<DoctorCreatedResponse>> Create(
        [FromBody] CreateDoctorRequest request,
        CancellationToken cancellationToken)
    {
        var result = await doctorService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = result.Doctor.Id, version = "1" },
            result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<DoctorDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DoctorDto>> Update(
        Guid id,
        [FromBody] UpdateDoctorRequest request,
        CancellationToken cancellationToken) =>
        Ok(await doctorService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await doctorService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
