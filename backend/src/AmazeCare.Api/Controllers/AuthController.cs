using AmazeCare.Application.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Controllers;

public sealed class AuthController(AuthService authService) : BaseApiController
{
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.LoginAsync(request, cancellationToken));

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType<SessionUserDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SessionUserDto>> Register(
        [FromBody] RegisterPatientRequest request,
        CancellationToken cancellationToken)
    {
        var user = await authService.RegisterPatientAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, user);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Refresh(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.RefreshAsync(request.RefreshToken, cancellationToken));

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(request?.RefreshToken, cancellationToken);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MessageResponse>> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.ForgotPasswordAsync(request.Email, cancellationToken));

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MessageResponse>> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.ResetPasswordAsync(request, cancellationToken));

    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MessageResponse>> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.ChangePasswordAsync(request, cancellationToken));

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType<SessionUserDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SessionUserDto>> Me(CancellationToken cancellationToken) =>
        Ok(await authService.GetMeAsync(cancellationToken));

    [HttpPut("me")]
    [Authorize]
    [ProducesResponseType<SessionUserDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SessionUserDto>> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken) =>
        Ok(await authService.UpdateProfileAsync(request, cancellationToken));
}
