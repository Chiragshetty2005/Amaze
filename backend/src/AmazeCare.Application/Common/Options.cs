namespace AmazeCare.Application.Common;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string ClinicName { get; set; } = "AmazeCare";
    public string ClinicAddress { get; set; } = "100 Feet Road, Indiranagar, Bengaluru 560038";
    public string ClinicPhone { get; set; } = "+91 80 4123 8800";
    public string ClinicEmail { get; set; } = "care@amazecare.test";
    public string? Gstin { get; set; }
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public int PasswordResetMinutes { get; set; } = 30;
    public int PasswordResetMaxPerHour { get; set; } = 5;
}
