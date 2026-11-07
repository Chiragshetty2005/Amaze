using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Consultations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class ConsultationsController(ConsultationService consultationService) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType<PagedResult<ConsultationDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ConsultationDto>>> Search(
        [FromQuery] ConsultationSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await consultationService.SearchAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType<ConsultationDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ConsultationDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await consultationService.GetByIdAsync(id, cancellationToken));

    [HttpGet("by-appointment/{appointmentId:guid}")]
    [Authorize]
    [ProducesResponseType<ConsultationDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ConsultationDto>> GetByAppointment(
        Guid appointmentId,
        CancellationToken cancellationToken) =>
        Ok(await consultationService.GetByAppointmentAsync(appointmentId, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "doctor,admin")]
    [ProducesResponseType<ConsultationResultDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<ConsultationResultDto>> Create(
        [FromBody] CreateConsultationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await consultationService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = result.Consultation.Id, version = "1" },
            result);
    }
}
