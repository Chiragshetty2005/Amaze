using System.Security.Cryptography;
using System.Text;

namespace AmazeCare.Application.Common;

public static class SecurityTokens
{
    public static string Create(int byteCount = 48)
    {
        var bytes = RandomNumberGenerator.GetBytes(byteCount);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public static string Hash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}

public static class ClinicTime
{
    public static DateTime LocalNow(TimeProvider timeProvider) =>
        TimeZoneInfo.ConvertTimeFromUtc(
            timeProvider.GetUtcNow().UtcDateTime,
            timeProvider.LocalTimeZone);
}
