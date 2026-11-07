using MailKit.Security;

namespace AmazeCare.Infrastructure.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "AmazeCare.Api";
    public string Audience { get; set; } = "AmazeCare.Client";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 14;
}

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public SecureSocketOptions SecureSocketOptions { get; set; } = SecureSocketOptions.StartTls;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = "care@amazecare.test";
    public string FromName { get; set; } = "AmazeCare";
}
