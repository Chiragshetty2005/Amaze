using System.Globalization;
using AmazeCare.Application.Features.Appointments;
using AmazeCare.Application.Features.Auth;
using AmazeCare.Application.Features.Consultations;
using AmazeCare.Application.Features.Doctors;
using AmazeCare.Application.Features.Invoices;
using AmazeCare.Application.Features.Patients;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;

namespace AmazeCare.Application.Common;

public static class DtoMappings
{
    public static string ToApiString(this UserRole role) => role switch
    {
        UserRole.Patient => "patient",
        UserRole.Doctor => "doctor",
        UserRole.Admin => "admin",
        _ => role.ToString().ToLowerInvariant()
    };

    public static string ToApiString(this AppointmentStatus status) => status switch
    {
        AppointmentStatus.Pending => "pending",
        AppointmentStatus.Confirmed => "confirmed",
        AppointmentStatus.Completed => "completed",
        AppointmentStatus.Cancelled => "cancelled",
        AppointmentStatus.Rejected => "rejected",
        _ => status.ToString().ToLowerInvariant()
    };

    public static string ToApiString(this InvoiceStatus status) =>
        status == InvoiceStatus.Paid ? "paid" : "issued";

    public static string ToApiString(this FoodRelation relation) =>
        relation == FoodRelation.BF ? "BF" : "AF";

    public static string ToDateString(this DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static string ToTimeString(this TimeOnly time) =>
        time.ToString("HH:mm", CultureInfo.InvariantCulture);

    public static SessionUserDto ToSessionUser(this User user) =>
        new(user.Id, user.Role.ToApiString(), user.FullName, user.Email, user.Phone, user.PhotoUrl);

    public static DoctorDto ToDoctorDto(this Doctor doctor)
    {
        return new DoctorDto(
            doctor.Id,
            doctor.UserId,
            doctor.User.FullName,
            doctor.User.Email,
            doctor.User.Phone,
            doctor.User.PhotoUrl,
            doctor.SpecializationId,
            doctor.Specialization.Name,
            doctor.ExperienceYears,
            doctor.Qualification,
            doctor.Designation,
            doctor.Fee,
            doctor.Bio,
            doctor.Room,
            doctor.Availability
                .OrderBy(item => item.Day)
                .ThenBy(item => item.StartTime)
                .Select(item => new DoctorAvailabilityDto(
                    item.Day,
                    item.StartTime.ToTimeString(),
                    item.EndTime.ToTimeString(),
                    item.SlotMinutes))
                .ToList());
    }

    public static PatientDto ToPatientDto(this Patient patient) =>
        new(
            patient.Id,
            patient.UserId,
            patient.User.FullName,
            patient.User.Email,
            patient.User.Phone,
            patient.DateOfBirth.ToDateString(),
            patient.Gender.ToString(),
            patient.Address);

    public static AppointmentDto ToAppointmentDto(this Appointment appointment) =>
        new(
            appointment.Id,
            appointment.PatientId,
            appointment.Patient.User.FullName,
            appointment.Patient.User.Phone,
            appointment.DoctorId,
            appointment.Doctor.User.FullName,
            appointment.Doctor.Specialization.Name,
            appointment.Date.ToDateString(),
            appointment.Time.ToTimeString(),
            appointment.Status.ToApiString(),
            appointment.Symptoms,
            appointment.NatureOfVisit,
            appointment.CreatedAtUtc,
            appointment.CancellationReason,
            appointment.Consultation is not null,
            appointment.Invoice is not null);

    public static ConsultationDto ToConsultationDto(this Consultation consultation)
    {
        var appointment = consultation.Appointment;
        return new ConsultationDto(
            consultation.Id,
            consultation.AppointmentId,
            appointment.PatientId,
            appointment.Patient.User.FullName,
            appointment.DoctorId,
            appointment.Doctor.User.FullName,
            consultation.Symptoms,
            consultation.PhysicalExam,
            consultation.TreatmentPlan,
            consultation.Diagnosis,
            consultation.Tests
                .OrderBy(item => item.MedicalTest.Name)
                .Select(item => new ConsultationTestDto(
                    item.MedicalTestId,
                    item.MedicalTest.Name,
                    item.MedicalTest.Price))
                .ToList(),
            consultation.Prescription
                .Select(item => new PrescriptionItemDto(
                    item.Id,
                    item.MedicineId,
                    item.MedicineName,
                    item.Morning,
                    item.Afternoon,
                    item.Night,
                    item.FoodRelation.ToApiString(),
                    item.DurationDays,
                    item.Instructions))
                .ToList(),
            consultation.CreatedAtUtc);
    }

    public static InvoiceDto ToInvoiceDto(this Invoice invoice) =>
        new(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.AppointmentId,
            invoice.Appointment.Date.ToDateString(),
            invoice.PatientId,
            invoice.Patient.User.FullName,
            invoice.Patient.User.Email,
            invoice.DoctorId,
            invoice.Doctor.User.FullName,
            invoice.Doctor.Specialization.Name,
            invoice.IssuedAt.ToDateString(),
            invoice.Items
                .Select(item => new InvoiceItemDto(item.Description, item.Amount))
                .ToList(),
            invoice.TaxRate,
            invoice.Subtotal,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.Status.ToApiString(),
            invoice.PaidAtUtc);

    public static InvoicePdfModel ToInvoicePdfModel(this Invoice invoice, AppOptions options) =>
        new(
            options.ClinicName,
            options.ClinicAddress,
            options.ClinicPhone,
            options.ClinicEmail,
            options.Gstin,
            invoice.InvoiceNumber,
            invoice.IssuedAt.ToDateString(),
            invoice.Status.ToApiString(),
            invoice.Patient.User.FullName,
            invoice.Patient.User.Email,
            invoice.Patient.User.Phone,
            invoice.Patient.Address,
            invoice.Doctor.User.FullName,
            invoice.Doctor.Qualification,
            invoice.Doctor.Specialization.Name,
            invoice.Items
                .Select(item => new InvoicePdfItem(item.Description, item.Amount))
                .ToList(),
            invoice.Subtotal,
            invoice.TaxRate,
            invoice.TaxAmount,
            invoice.TotalAmount);
}
