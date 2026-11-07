using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AmazeCare.Application.Common;
using AmazeCare.Domain.Entities;
using AmazeCare.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AmazeCare.Infrastructure.Security;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly SymmetricSecurityKey _signingKey;

    public JwtTokenService(IOptions<JwtOptions> options, TimeProvider timeProvider)
    {
        _options = options.Value;
        _timeProvider = timeProvider;

        if (string.IsNullOrWhiteSpace(_options.Key) || Encoding.UTF8.GetByteCount(_options.Key) < 32)
        {
            throw new InvalidOperationException(
                "Jwt:Key must be configured with at least 32 bytes. Use a secret manager or environment variable.");
        }

        _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
    }

    public AccessTokenResult CreateAccessToken(User user)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(Math.Clamp(_options.AccessTokenMinutes, 5, 1440));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("name", user.FullName),
            new("role", user.Role.ToApiString())
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256));

        return new AccessTokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expires);
    }

    public RefreshTokenValue CreateRefreshToken()
    {
        var token = SecurityTokens.Create(64);
        var expires = _timeProvider
            .GetUtcNow()
            .UtcDateTime
            .AddDays(Math.Clamp(_options.RefreshTokenDays, 1, 90));

        return new RefreshTokenValue(token, SecurityTokens.Hash(token), expires);
    }

    public string HashRefreshToken(string token) => SecurityTokens.Hash(token);
}
