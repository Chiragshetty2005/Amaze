namespace AmazeCare.Domain.Entities;

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public string Symptoms { get; set; } = string.Empty;
    public string NatureOfVisit { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public string? CancellationReason { get; set; }

    public Consultation? Consultation { get; set; }
    public Invoice? Invoice { get; set; }
}

public sealed class Consultation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public string Symptoms { get; set; } = string.Empty;
    public string PhysicalExam { get; set; } = string.Empty;
    public string TreatmentPlan { get; set; } = string.Empty;
    public string Diagnosis { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<PrescriptionItem> Prescription { get; set; } = [];
    public ICollection<ConsultationTest> Tests { get; set; } = [];
}

public sealed class PrescriptionItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConsultationId { get; set; }
    public Consultation Consultation { get; set; } = null!;
    public Guid? MedicineId { get; set; }
    public Medicine? Medicine { get; set; }

    /// <summary>Snapshot so the prescription remains readable if a medicine is retired.</summary>
    public string MedicineName { get; set; } = string.Empty;

    public int Morning { get; set; }
    public int Afternoon { get; set; }
    public int Night { get; set; }
    public FoodRelation FoodRelation { get; set; }
    public int DurationDays { get; set; }
    public string Instructions { get; set; } = string.Empty;
}

public sealed class ConsultationTest
{
    public Guid ConsultationId { get; set; }
    public Consultation Consultation { get; set; } = null!;
    public Guid MedicalTestId { get; set; }
    public MedicalTest MedicalTest { get; set; } = null!;
}

public sealed class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public DateOnly IssuedAt { get; set; }
    public decimal TaxRate { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAtUtc { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = [];
}

public sealed class InvoiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public sealed class Medicine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Form { get; set; } = string.Empty;
    public string Strength { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<PrescriptionItem> Prescriptions { get; set; } = [];
}

public sealed class MedicalTest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<ConsultationTest> Consultations { get; set; } = [];
}
