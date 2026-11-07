using AmazeCare.Domain;
using AmazeCare.Domain.Entities;

namespace AmazeCare.Application.Common;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    string? Email { get; }
    UserRole? Role { get; }

    Guid RequireUserId();
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public sealed record AccessTokenResult(string Token, DateTime ExpiresAtUtc);

public sealed record RefreshTokenValue(string Token, string TokenHash, DateTime ExpiresAtUtc);

public interface IJwtTokenService
{
    AccessTokenResult CreateAccessToken(User user);
    RefreshTokenValue CreateRefreshToken();
    string HashRefreshToken(string token);
}

public interface IEmailService
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public sealed record EmailMessage(
    string To,
    string Subject,
    string HtmlBody,
    string? TextBody = null,
    IReadOnlyList<EmailAttachment>? Attachments = null);

public sealed record EmailAttachment(string FileName, string ContentType, byte[] Content);

public interface IInvoicePdfGenerator
{
    byte[] Generate(InvoicePdfModel invoice);
}
