using AmazeCare.Application.Common;
using AmazeCare.Infrastructure.Configuration;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace AmazeCare.Infrastructure.Email;

public sealed class SmtpEmailService(
    IOptions<EmailOptions> options,
    ILogger<SmtpEmailService> logger) : IEmailService
{
    private readonly EmailOptions _options = options.Value;

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.Host))
        {
            logger.LogInformation(
                "SMTP is disabled. Skipped email \"{Subject}\" to {Recipient}.",
                message.Subject,
                message.To);
            return;
        }

        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;

        var body = new BodyBuilder
        {
            HtmlBody = message.HtmlBody,
            TextBody = message.TextBody ?? StripHtml(message.HtmlBody)
        };

        if (message.Attachments is not null)
        {
            foreach (var attachment in message.Attachments)
            {
                body.Attachments.Add(
                    attachment.FileName,
                    attachment.Content,
                    ContentType.Parse(attachment.ContentType));
            }
        }

        mime.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(
            _options.Host,
            _options.Port,
            _options.SecureSocketOptions,
            cancellationToken);

        if (!string.IsNullOrWhiteSpace(_options.UserName))
        {
            await client.AuthenticateAsync(_options.UserName, _options.Password, cancellationToken);
        }

        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(quit: true, cancellationToken);

        logger.LogInformation(
            "Sent email \"{Subject}\" to {Recipient}.",
            message.Subject,
            message.To);
    }

    private static string StripHtml(string html)
    {
        var result = new System.Text.StringBuilder(html.Length);
        var insideTag = false;

        foreach (var character in html)
        {
            switch (character)
            {
                case '<':
                    insideTag = true;
                    break;
                case '>':
                    insideTag = false;
                    break;
                default:
                    if (!insideTag)
                    {
                        result.Append(character);
                    }

                    break;
            }
        }

        return result.ToString();
    }
}
