using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Common;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Patient> Patients { get; }
    DbSet<Doctor> Doctors { get; }
    DbSet<Specialization> Specializations { get; }
    DbSet<DoctorAvailability> DoctorAvailability { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<Consultation> Consultations { get; }
    DbSet<PrescriptionItem> PrescriptionItems { get; }
    DbSet<ConsultationTest> ConsultationTests { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<Medicine> Medicines { get; }
    DbSet<MedicalTest> MedicalTests { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<InvoiceSequence> InvoiceSequences { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
