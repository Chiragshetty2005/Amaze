using AmazeCare.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AmazeCare.Application.Common;

public interface INotificationService
{
    Task SendWelcomeAsync(User user, CancellationToken cancellationToken = default);
    Task SendPasswordResetAsync(User user, string rawToken, CancellationToken cancellationToken = default);
    Task SendInvitationAsync(User user, string roleLabel, string rawToken, CancellationToken cancellationToken = default);
    Task SendAppointmentReceivedAsync(Appointment appointment, CancellationToken cancellationToken = default);
    Task SendAppointmentConfirmedAsync(Appointment appointment, CancellationToken cancellationToken = default);
    Task SendAppointmentRejectedAsync(Appointment appointment, string reason, CancellationToken cancellationToken = default);
    Task SendAppointmentCancelledAsync(Appointment appointment, string reason, string cancelledBy, CancellationToken cancellationToken = default);
    Task SendAppointmentRescheduledAsync(Appointment appointment, string by, CancellationToken cancellationToken = default);
    Task SendConsultationSummaryAsync(Consultation consultation, CancellationToken cancellationToken = default);
    Task SendInvoiceAsync(Invoice invoice, byte[] pdf, CancellationToken cancellationToken = default);
}

public sealed class NotificationService(
    IEmailService emailService,
    IOptions<AppOptions> options,
    ILogger<NotificationService> logger) : INotificationService
{
    private readonly AppOptions _options = options.Value;

    public Task SendWelcomeAsync(User user, CancellationToken cancellationToken = default) =>
        TrySendAsync(
            user.Email,
            "Welcome to AmazeCare",
            EmailTemplates.Welcome(user.FullName, SignInUrl()),
            "welcome",
            cancellationToken);

    public Task SendPasswordResetAsync(User user, string rawToken, CancellationToken cancellationToken = default) =>
        TrySendAsync(
            user.Email,
            "Reset your AmazeCare password",
            EmailTemplates.PasswordReset(
                user.FullName,
                FrontendUrl("/reset-password", user.Email, rawToken),
                _options.PasswordResetMinutes),
            "password reset",
            cancellationToken);

    public Task SendInvitationAsync(
        User user,
        string roleLabel,
        string rawToken,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            user.Email,
            "Set up your AmazeCare account",
            EmailTemplates.Invitation(
                user.FullName,
                roleLabel,
                FrontendUrl("/reset-password", user.Email, rawToken)),
            "account invitation",
            cancellationToken);

    public Task SendAppointmentReceivedAsync(Appointment appointment, CancellationToken cancellationToken = default) =>
        TrySendAsync(
            appointment.Patient.User.Email,
            "Your appointment request is with the clinic",
            EmailTemplates.AppointmentReceived(appointment),
            "appointment received",
            cancellationToken);

    public Task SendAppointmentConfirmedAsync(Appointment appointment, CancellationToken cancellationToken = default) =>
        TrySendAsync(
            appointment.Patient.User.Email,
            "Your AmazeCare appointment is confirmed",
            EmailTemplates.AppointmentConfirmed(appointment),
            "appointment confirmation",
            cancellationToken);

    public Task SendAppointmentRejectedAsync(
        Appointment appointment,
        string reason,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            appointment.Patient.User.Email,
            "Your AmazeCare appointment could not be confirmed",
            EmailTemplates.AppointmentRejected(appointment, reason),
            "appointment rejection",
            cancellationToken);

    public Task SendAppointmentCancelledAsync(
        Appointment appointment,
        string reason,
        string cancelledBy,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            appointment.Patient.User.Email,
            "Your AmazeCare appointment was cancelled",
            EmailTemplates.AppointmentCancelled(appointment, reason, cancelledBy),
            "appointment cancellation",
            cancellationToken);

    public Task SendAppointmentRescheduledAsync(
        Appointment appointment,
        string by,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            appointment.Patient.User.Email,
            "Your AmazeCare appointment has a new time",
            EmailTemplates.AppointmentRescheduled(appointment, by),
            "appointment reschedule",
            cancellationToken);

    public Task SendConsultationSummaryAsync(
        Consultation consultation,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            consultation.Appointment.Patient.User.Email,
            "Your AmazeCare consultation summary",
            EmailTemplates.ConsultationSummary(consultation),
            "consultation summary",
            cancellationToken);

    public Task SendInvoiceAsync(
        Invoice invoice,
        byte[] pdf,
        CancellationToken cancellationToken = default) =>
        TrySendAsync(
            invoice.Patient.User.Email,
            $"Invoice {invoice.InvoiceNumber} from AmazeCare",
            EmailTemplates.InvoiceEmail(invoice),
            "invoice",
            cancellationToken,
            [new EmailAttachment($"{invoice.InvoiceNumber}.pdf", "application/pdf", pdf)]);

    private async Task TrySendAsync(
        string to,
        string subject,
        string html,
        string kind,
        CancellationToken cancellationToken,
        IReadOnlyList<EmailAttachment>? attachments = null)
    {
        try
        {
            await emailService.SendAsync(
                new EmailMessage(to, subject, html, Attachments: attachments),
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not send {Kind} email to {Email}.", kind, to);
        }
    }

    private string SignInUrl() => $"{_options.FrontendBaseUrl.TrimEnd('/')}/login";

    private string FrontendUrl(string path, string email, string token) =>
        $"{_options.FrontendBaseUrl.TrimEnd('/')}{path}?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
}
