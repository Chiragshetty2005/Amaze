using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Appointments;
using AmazeCare.Application.Features.Auth;
using AmazeCare.Application.Features.Catalog;
using AmazeCare.Application.Features.Consultations;
using AmazeCare.Application.Features.Doctors;
using AmazeCare.Application.Features.Invoices;
using AmazeCare.Application.Features.Patients;
using AmazeCare.Application.Features.Reports;
using AmazeCare.Application.Features.Specializations;
using Microsoft.Extensions.DependencyInjection;

namespace AmazeCare.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<AuthService>();
        services.AddScoped<DoctorService>();
        services.AddScoped<PatientService>();
        services.AddScoped<SpecializationService>();
        services.AddScoped<AppointmentService>();
        services.AddScoped<ConsultationService>();
        services.AddScoped<InvoiceService>();
        services.AddScoped<MedicineService>();
        services.AddScoped<MedicalTestService>();
        services.AddScoped<ReportService>();
        return services;
    }
}
