using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class AppointmentsController(AppointmentService appointmentService) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType<PagedResult<AppointmentDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AppointmentDto>>> Search(
        [FromQuery] AppointmentSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await appointmentService.SearchAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppointmentDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await appointmentService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "patient,admin")]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AppointmentDto>> Create(
        [FromBody] CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await appointmentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(Get),
            new { id = appointment.Id, version = "1" },
            appointment);
    }

    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = "doctor,admin")]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppointmentDto>> Confirm(
        Guid id,
        CancellationToken cancellationToken) =>
        Ok(await appointmentService.ConfirmAsync(id, cancellationToken));

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "doctor,admin")]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppointmentDto>> Reject(
        Guid id,
        [FromBody] RejectAppointmentRequest request,
        CancellationToken cancellationToken) =>
        Ok(await appointmentService.RejectAsync(id, request.Reason, cancellationToken));

    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppointmentDto>> Cancel(
        Guid id,
        [FromBody] CancelAppointmentRequest request,
        CancellationToken cancellationToken) =>
        Ok(await appointmentService.CancelAsync(id, request.Reason, cancellationToken));

    [HttpPost("{id:guid}/reschedule")]
    [Authorize]
    [ProducesResponseType<AppointmentDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AppointmentDto>> Reschedule(
        Guid id,
        [FromBody] RescheduleAppointmentRequest request,
        CancellationToken cancellationToken) =>
        Ok(await appointmentService.RescheduleAsync(id, request.Date, request.Time, cancellationToken));
}
