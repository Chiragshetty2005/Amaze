using AmazeCare.Application.Features.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

[Authorize(Roles = "admin")]
public sealed class ReportsController(ReportService reportService) : BaseApiController
{
    [HttpGet("overview")]
    [ProducesResponseType<AdminOverviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminOverviewDto>> Overview(CancellationToken cancellationToken) =>
        Ok(await reportService.GetOverviewAsync(cancellationToken));

    [HttpGet("revenue")]
    [ProducesResponseType<RevenueReportDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RevenueReportDto>> Revenue(
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default) =>
        Ok(await reportService.GetRevenueAsync(days, cancellationToken));

    [HttpGet("doctors")]
    [ProducesResponseType<IReadOnlyList<DoctorWorkloadDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DoctorWorkloadDto>>> Doctors(
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default) =>
        Ok(await reportService.GetDoctorWorkloadAsync(days, cancellationToken));
}
