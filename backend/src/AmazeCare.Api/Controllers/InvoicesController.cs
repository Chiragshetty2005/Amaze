using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Auth;
using AmazeCare.Application.Features.Invoices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class InvoicesController(InvoiceService invoiceService) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType<PagedResult<InvoiceDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InvoiceDto>>> Search(
        [FromQuery] InvoiceSearchQuery query,
        CancellationToken cancellationToken) =>
        Ok(await invoiceService.SearchAsync(query, cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize]
    [ProducesResponseType<InvoiceDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<InvoiceDto>> Get(Guid id, CancellationToken cancellationToken) =>
        Ok(await invoiceService.GetByIdAsync(id, cancellationToken));

    [HttpGet("{id:guid}/pdf")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Pdf(Guid id, CancellationToken cancellationToken)
    {
        var result = await invoiceService.GetPdfAsync(id, cancellationToken);
        return File(result.Content, "application/pdf", result.FileName);
    }

    [HttpPost("{id:guid}/email")]
    [Authorize]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MessageResponse>> Email(
        Guid id,
        CancellationToken cancellationToken) =>
        Ok(await invoiceService.EmailAsync(id, cancellationToken));

    [HttpPost("{id:guid}/paid")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType<InvoiceDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<InvoiceDto>> MarkPaid(
        Guid id,
        CancellationToken cancellationToken) =>
        Ok(await invoiceService.MarkPaidAsync(id, cancellationToken));
}
