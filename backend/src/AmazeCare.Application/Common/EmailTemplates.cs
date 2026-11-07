using System.Net;
using System.Text;
using AmazeCare.Domain.Entities;

namespace AmazeCare.Application.Common;

public static class EmailTemplates
{
    public static string Welcome(string name, string signInUrl) =>
        Layout(
            "Welcome to AmazeCare",
            $"""
             <p>Hello {E(name)},</p>
             <p>Your AmazeCare patient account is ready. You can book appointments, review your records, and keep track of bills in one place.</p>
             {Button("Sign in to AmazeCare", signInUrl)}
             <p class="muted">If you did not create this account, you can ignore this message.</p>
             """);

    public static string PasswordReset(string name, string resetUrl, int minutes) =>
        Layout(
            "Reset your AmazeCare password",
            $"""
             <p>Hello {E(name)},</p>
             <p>Use the link below to choose a new password. It expires in {minutes} minutes and can only be used once.</p>
             {Button("Choose a new password", resetUrl)}
             <p class="muted">If you did not request a password reset, no action is needed.</p>
             """);

    public static string Invitation(string name, string roleLabel, string inviteUrl) =>
        Layout(
            "Set up your AmazeCare account",
            $"""
             <p>Hello {E(name)},</p>
             <p>An AmazeCare administrator created a {E(roleLabel)} account for you. Choose a password to finish setting it up.</p>
             {Button("Set up my account", inviteUrl)}
             <p class="muted">This link expires in 24 hours. Contact the clinic if you need a new invitation.</p>
             """);

    public static string AppointmentReceived(Appointment appointment) =>
        Layout(
            "Your appointment request is with the clinic",
            $"""
             <p>Hello {E(appointment.Patient.User.FullName)},</p>
             <p>We received your request for {E(appointment.Doctor.User.FullName)} in {E(appointment.Doctor.Specialization.Name)}.</p>
             {Details(appointment)}
             <p>You will receive another email as soon as the clinic confirms the visit.</p>
             """);

    public static string AppointmentConfirmed(Appointment appointment) =>
        Layout(
            "Your appointment is confirmed",
            $"""
             <p>Hello {E(appointment.Patient.User.FullName)},</p>
             <p>{E(appointment.Doctor.User.FullName)} has confirmed your appointment.</p>
             {Details(appointment)}
             <p>Please arrive ten minutes early. Bring any reports or medicines you would like to discuss.</p>
             """);

    public static string AppointmentRejected(Appointment appointment, string reason) =>
        Layout(
            "Your appointment could not be confirmed",
            $"""
             <p>Hello {E(appointment.Patient.User.FullName)},</p>
             <p>The clinic could not confirm your appointment with {E(appointment.Doctor.User.FullName)}.</p>
             {Details(appointment)}
             <p><strong>Reason:</strong> {E(reason)}</p>
             <p>You can choose another doctor or slot from your AmazeCare account.</p>
             """);

    public static string AppointmentCancelled(Appointment appointment, string reason, string cancelledBy) =>
        Layout(
            "An appointment was cancelled",
            $"""
             <p>Hello {E(appointment.Patient.User.FullName)},</p>
             <p>Your appointment with {E(appointment.Doctor.User.FullName)} was cancelled by the {E(cancelledBy)}.</p>
             {Details(appointment)}
             <p><strong>Reason:</strong> {E(reason)}</p>
             """);

    public static string AppointmentRescheduled(Appointment appointment, string by) =>
        Layout(
            "Your appointment has a new time",
            $"""
             <p>Hello {E(appointment.Patient.User.FullName)},</p>
             <p>The {E(by)} moved your appointment with {E(appointment.Doctor.User.FullName)}.</p>
             {Details(appointment)}
             <p>The appointment is currently <strong>{E(appointment.Status.ToString().ToLowerInvariant())}</strong>.</p>
             """);

    public static string ConsultationSummary(Consultation consultation) =>
        Layout(
            "Your consultation summary",
            $"""
             <p>Hello {E(consultation.Appointment.Patient.User.FullName)},</p>
             <p>Your consultation with {E(consultation.Appointment.Doctor.User.FullName)} is complete.</p>
             <div class="panel">
               <p class="label">Diagnosis</p>
               <p>{E(consultation.Diagnosis)}</p>
               <p class="label">Treatment plan</p>
               <p>{E(consultation.TreatmentPlan)}</p>
             </div>
             <p>Your prescription and test list are available in your patient records. The invoice is attached separately.</p>
             """);

    public static string InvoiceEmail(Invoice invoice) =>
        Layout(
            $"Invoice {E(invoice.InvoiceNumber)} from AmazeCare",
            $"""
             <p>Hello {E(invoice.Patient.User.FullName)},</p>
             <p>Your invoice for the visit with {E(invoice.Doctor.User.FullName)} is attached.</p>
             <div class="panel">
               <p><strong>{E(invoice.InvoiceNumber)}</strong></p>
               <p>Issued {E(invoice.IssuedAt.ToString("dd MMM yyyy", System.Globalization.CultureInfo.InvariantCulture))}</p>
               <p>Total due: <strong>INR {invoice.TotalAmount:N0}</strong></p>
             </div>
             <p>Payment is collected at the clinic.</p>
             """);

    private static string Details(Appointment appointment) =>
        $"""
         <div class="panel">
           <p><strong>{E(appointment.Doctor.User.FullName)}</strong><br />{E(appointment.Doctor.Specialization.Name)}</p>
           <p>{E(appointment.Date.ToString("dddd, dd MMMM yyyy", System.Globalization.CultureInfo.InvariantCulture))} at {E(appointment.Time.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture))}</p>
           <p class="muted">{E(appointment.NatureOfVisit)}</p>
         </div>
         """;

    private static string Button(string label, string url) =>
        $"""<p><a class="button" href="{E(url)}">{E(label)}</a></p>""";

    private static string Layout(string title, string body) =>
        $$"""
         <!doctype html>
         <html lang="en">
           <body style="margin:0;background:#f5f8f6;color:#10201c;font-family:Arial,sans-serif;">
             <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
               <p style="font-size:20px;font-weight:700;color:#0b6b57;margin:0 0 24px;">AmazeCare</p>
               <div style="background:#ffffff;border:1px solid #dbe5e0;border-radius:16px;padding:28px;">
                 <h1 style="font-size:24px;line-height:1.25;margin:0 0 18px;">{{E(title)}}</h1>
                 {{body}}
               </div>
               <p class="muted" style="font-size:12px;color:#5a6c66;margin:18px 0 0;">AmazeCare Clinic, Indiranagar, Bengaluru. This is an automated message.</p>
             </div>
             <style>
               p { font-size:15px;line-height:1.65;margin:0 0 14px; }
               .panel { background:#f5f8f6;border-radius:12px;padding:16px;margin:18px 0; }
               .panel p { margin:0 0 8px; }
               .button { display:inline-block;background:#0b6b57;color:#ffffff !important;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700; }
               .muted { color:#5a6c66;font-size:13px; }
               .label { color:#5a6c66;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px; }
             </style>
           </body>
         </html>
         """;

    private static string E(string value) => WebUtility.HtmlEncode(value);
}
