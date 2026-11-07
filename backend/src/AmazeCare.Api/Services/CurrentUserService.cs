using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AmazeCare.Application.Common;
using AmazeCare.Domain;

namespace AmazeCare.Api.Services;

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public Guid? UserId
    {
        get
        {
            var value = Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Email =>
        Principal?.FindFirstValue(JwtRegisteredClaimNames.Email)
        ?? Principal?.FindFirstValue(ClaimTypes.Email);

    public UserRole? Role
    {
        get
        {
            var value = Principal?.FindFirstValue("role") ?? Principal?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(value, ignoreCase: true, out var role) ? role : null;
        }
    }

    public Guid RequireUserId() =>
        UserId ?? throw new UnauthorizedAppException();
}
