using AmazeCare.Application.Common;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Specialization> Specializations => Set<Specialization>();
    public DbSet<DoctorAvailability> DoctorAvailability => Set<DoctorAvailability>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<ConsultationTest> ConsultationTests => Set<ConsultationTest>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<MedicalTest> MedicalTests => Set<MedicalTest>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<InvoiceSequence> InvoiceSequences => Set<InvoiceSequence>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.FullName).HasMaxLength(120).IsRequired();
            entity.Property(item => item.Email).HasMaxLength(256).IsRequired();
            entity.Property(item => item.Phone).HasMaxLength(32).IsRequired();
            entity.Property(item => item.PasswordHash).HasMaxLength(200).IsRequired();
            entity.Property(item => item.PhotoUrl).HasMaxLength(500);
            entity.Property(item => item.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.HasIndex(item => item.Email).IsUnique();
            entity.HasIndex(item => new { item.Role, item.IsActive });

            entity.HasOne(item => item.Patient)
                .WithOne(item => item.User)
                .HasForeignKey<Patient>(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Doctor)
                .WithOne(item => item.User)
                .HasForeignKey<Doctor>(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(item => item.RefreshTokens)
                .WithOne(item => item.User)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(item => item.PasswordResetTokens)
                .WithOne(item => item.User)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("Patients");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Gender).HasConversion<string>().HasMaxLength(10).IsRequired();
            entity.Property(item => item.Address).HasMaxLength(300).IsRequired();
            entity.HasIndex(item => item.UserId).IsUnique();
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.ToTable("Doctors");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Qualification).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Designation).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Bio).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.Room).HasMaxLength(60);
            entity.Property(item => item.Fee).HasPrecision(18, 2);
            entity.HasIndex(item => item.UserId).IsUnique();
            entity.HasIndex(item => item.SpecializationId);

            entity.HasOne(item => item.Specialization)
                .WithMany(item => item.Doctors)
                .HasForeignKey(item => item.SpecializationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Specialization>(entity =>
        {
            entity.ToTable("Specializations");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(120).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(500).IsRequired();
            entity.HasIndex(item => item.Name).IsUnique();
        });

        modelBuilder.Entity<DoctorAvailability>(entity =>
        {
            entity.ToTable("DoctorAvailability");
            entity.HasKey(item => item.Id);
            entity.HasIndex(item => new { item.DoctorId, item.Day });

            entity.HasOne(item => item.Doctor)
                .WithMany(item => item.Availability)
                .HasForeignKey(item => item.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Symptoms).HasMaxLength(1000).IsRequired();
            entity.Property(item => item.NatureOfVisit).HasMaxLength(80).IsRequired();
            entity.Property(item => item.CancellationReason).HasMaxLength(500);
            entity.Property(item => item.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.HasIndex(item => new { item.DoctorId, item.Date, item.Time });
            entity.HasIndex(item => new { item.PatientId, item.Date, item.Time });
            entity.HasIndex(item => item.Status);

            entity.HasOne(item => item.Patient)
                .WithMany(item => item.Appointments)
                .HasForeignKey(item => item.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(item => item.Doctor)
                .WithMany(item => item.Appointments)
                .HasForeignKey(item => item.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Consultation>(entity =>
        {
            entity.ToTable("Consultations");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Symptoms).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.PhysicalExam).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.TreatmentPlan).HasMaxLength(2000).IsRequired();
            entity.Property(item => item.Diagnosis).HasMaxLength(1000).IsRequired();
            entity.HasIndex(item => item.AppointmentId).IsUnique();

            entity.HasOne(item => item.Appointment)
                .WithOne(item => item.Consultation)
                .HasForeignKey<Consultation>(item => item.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PrescriptionItem>(entity =>
        {
            entity.ToTable("PrescriptionItems");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.MedicineName).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Instructions).HasMaxLength(500).IsRequired();
            entity.Property(item => item.FoodRelation).HasConversion<string>().HasMaxLength(2).IsRequired();

            entity.HasOne(item => item.Consultation)
                .WithMany(item => item.Prescription)
                .HasForeignKey(item => item.ConsultationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Medicine)
                .WithMany(item => item.Prescriptions)
                .HasForeignKey(item => item.MedicineId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ConsultationTest>(entity =>
        {
            entity.ToTable("ConsultationTests");
            entity.HasKey(item => new { item.ConsultationId, item.MedicalTestId });

            entity.HasOne(item => item.Consultation)
                .WithMany(item => item.Tests)
                .HasForeignKey(item => item.ConsultationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.MedicalTest)
                .WithMany(item => item.Consultations)
                .HasForeignKey(item => item.MedicalTestId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoices");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.InvoiceNumber).HasMaxLength(40).IsRequired();
            entity.Property(item => item.Status).HasConversion<string>().HasMaxLength(10).IsRequired();
            entity.Property(item => item.TaxRate).HasPrecision(5, 4);
            entity.Property(item => item.Subtotal).HasPrecision(18, 2);
            entity.Property(item => item.TaxAmount).HasPrecision(18, 2);
            entity.Property(item => item.TotalAmount).HasPrecision(18, 2);
            entity.HasIndex(item => item.InvoiceNumber).IsUnique();
            entity.HasIndex(item => item.AppointmentId).IsUnique();
            entity.HasIndex(item => item.IssuedAt);

            entity.HasOne(item => item.Appointment)
                .WithOne(item => item.Invoice)
                .HasForeignKey<Invoice>(item => item.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Patient)
                .WithMany()
                .HasForeignKey(item => item.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(item => item.Doctor)
                .WithMany()
                .HasForeignKey(item => item.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.ToTable("InvoiceItems");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Description).HasMaxLength(300).IsRequired();
            entity.Property(item => item.Amount).HasPrecision(18, 2);

            entity.HasOne(item => item.Invoice)
                .WithMany(item => item.Items)
                .HasForeignKey(item => item.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.ToTable("Medicines");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Form).HasMaxLength(80).IsRequired();
            entity.Property(item => item.Strength).HasMaxLength(80).IsRequired();
            entity.HasIndex(item => new { item.Name, item.Strength });
        });

        modelBuilder.Entity<MedicalTest>(entity =>
        {
            entity.ToTable("MedicalTests");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(160).IsRequired();
            entity.Property(item => item.Price).HasPrecision(18, 2);
            entity.HasIndex(item => item.Name);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(item => item.ReplacedByTokenHash).HasMaxLength(128);
            entity.Property(item => item.CreatedByIp).HasMaxLength(64);
            entity.HasIndex(item => item.TokenHash).IsUnique();
            entity.HasIndex(item => new { item.UserId, item.ExpiresAtUtc });
            entity.Ignore(item => item.IsActive);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("PasswordResetTokens");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.TokenHash).HasMaxLength(128).IsRequired();
            entity.HasIndex(item => item.TokenHash).IsUnique();
            entity.HasIndex(item => new { item.UserId, item.ExpiresAtUtc });
        });

        modelBuilder.Entity<InvoiceSequence>(entity =>
        {
            entity.ToTable("InvoiceSequences");
            entity.HasKey(item => item.Year);
            entity.Property(item => item.Year).ValueGeneratedNever();
        });
    }
}
