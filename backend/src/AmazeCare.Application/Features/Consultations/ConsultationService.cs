using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Invoices;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AmazeCare.Application.Features.Consultations;

public sealed class ConsultationService(
    IAppDbContext db,
    ICurrentUserService currentUser,
    INotificationService notifications,
    IInvoicePdfGenerator pdfGenerator,
    IOptions<AppOptions> options,
    TimeProvider timeProvider,
    ILogger<ConsultationService> logger)
{
    private readonly AppOptions _options = options.Value;

    public async Task<PagedResult<ConsultationDto>> SearchAsync(
        ConsultationSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var role = currentUser.Role ?? throw new UnauthorizedAppException();

        var consultations = BuildReadQuery();

        if (role == UserRole.Patient)
        {
            var patientId = await GetCurrentPatientIdAsync(cancellationToken);
            consultations = consultations.Where(item => item.Appointment.PatientId == patientId);
        }
        else if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            consultations = consultations.Where(item => item.Appointment.DoctorId == doctorId);
        }
        else if (role == UserRole.Admin)
        {
            if (query.PatientId is { } patientId)
            {
                consultations = consultations.Where(item => item.Appointment.PatientId == patientId);
            }

            if (query.DoctorId is { } doctorId)
            {
                consultations = consultations.Where(item => item.Appointment.DoctorId == doctorId);
            }
        }
        else
        {
            throw new ForbiddenAppException();
        }

        if (!string.IsNullOrWhiteSpace(query.From))
        {
            var from = ParseDate(query.From, "from");
            consultations = consultations.Where(item => item.Appointment.Date >= from);
        }

        if (!string.IsNullOrWhiteSpace(query.To))
        {
            var to = ParseDate(query.To, "to");
            consultations = consultations.Where(item => item.Appointment.Date <= to);
        }

        var total = await consultations.CountAsync(cancellationToken);
        var items = await consultations
            .OrderByDescending(item => item.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ConsultationDto>(
            items.Select(item => item.ToConsultationDto()).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<ConsultationDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var consultation = await BuildReadQuery()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundAppException("Consultation not found.");

        await EnsureCanAccessAsync(consultation, cancellationToken);
        return consultation.ToConsultationDto();
    }

    public async Task<ConsultationDto> GetByAppointmentAsync(
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var consultation = await BuildReadQuery()
            .FirstOrDefaultAsync(item => item.AppointmentId == appointmentId, cancellationToken)
            ?? throw new NotFoundAppException("Consultation not found for this appointment.");

        await EnsureCanAccessAsync(consultation, cancellationToken);
        return consultation.ToConsultationDto();
    }

    public async Task<ConsultationResultDto> CreateAsync(
        CreateConsultationRequest request,
        CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        if (role is not (UserRole.Doctor or UserRole.Admin))
        {
            throw new ForbiddenAppException("Only doctors or administrators can complete a consultation.");
        }

        var appointment = await db.Appointments
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Include(item => item.Consultation)
            .Include(item => item.Invoice)
            .FirstOrDefaultAsync(item => item.Id == request.AppointmentId, cancellationToken)
            ?? throw new NotFoundAppException("Appointment not found.");

        if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            if (appointment.DoctorId != doctorId)
            {
                throw new ForbiddenAppException();
            }
        }

        if (appointment.Status != AppointmentStatus.Confirmed)
        {
            throw new ConflictAppException("Only a confirmed appointment can be completed.");
        }

        if (appointment.Consultation is not null || appointment.Invoice is not null)
        {
            throw new ConflictAppException("This appointment already has a completed consultation.");
        }

        var testIds = request.TestIds.Distinct().ToList();
        var tests = await db.MedicalTests
            .Where(item => testIds.Contains(item.Id) && item.IsActive)
            .ToListAsync(cancellationToken);

        if (tests.Count != testIds.Count)
        {
            throw new ValidationAppException("One or more selected tests are no longer available.");
        }

        var medicineIds = request.Prescription.Select(item => item.MedicineId).Distinct().ToList();
        var medicines = await db.Medicines
            .Where(item => medicineIds.Contains(item.Id) && item.IsActive)
            .ToListAsync(cancellationToken);

        if (medicines.Count != medicineIds.Count)
        {
            throw new ValidationAppException("One or more selected medicines are no longer available.");
        }

        var medicineMap = medicines.ToDictionary(item => item.Id);
        var consultation = new Consultation
        {
            AppointmentId = appointment.Id,
            Appointment = appointment,
            Symptoms = request.Symptoms.Trim(),
            PhysicalExam = request.PhysicalExam.Trim(),
            TreatmentPlan = request.TreatmentPlan.Trim(),
            Diagnosis = request.Diagnosis.Trim(),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        foreach (var input in request.Prescription)
        {
            if (input.Morning + input.Afternoon + input.Night <= 0)
            {
                throw new ValidationAppException("Each medicine needs at least one dose in the 0-0-0 pattern.");
            }

            if (!Enum.TryParse<FoodRelation>(input.FoodRelation, ignoreCase: true, out var foodRelation) ||
                !Enum.IsDefined(foodRelation))
            {
                throw new ValidationAppException("Food relation must be AF or BF.");
            }

            var medicine = medicineMap[input.MedicineId];
            consultation.Prescription.Add(new PrescriptionItem
            {
                Consultation = consultation,
                MedicineId = medicine.Id,
                Medicine = medicine,
                MedicineName = medicine.Name,
                Morning = input.Morning,
                Afternoon = input.Afternoon,
                Night = input.Night,
                FoodRelation = foodRelation,
                DurationDays = input.DurationDays,
                Instructions = input.Instructions?.Trim() ?? string.Empty
            });
        }

        foreach (var test in tests)
        {
            consultation.Tests.Add(new ConsultationTest
            {
                Consultation = consultation,
                MedicalTestId = test.Id,
                MedicalTest = test
            });
        }

        appointment.Status = AppointmentStatus.Completed;
        appointment.UpdatedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        appointment.Consultation = consultation;

        var localNow = ClinicTime.LocalNow(timeProvider);
        var items = new List<InvoiceItem>
        {
            new()
            {
                Description = $"Consultation with {appointment.Doctor.User.FullName}",
                Amount = appointment.Doctor.Fee
            }
        };

        items.AddRange(tests.Select(test => new InvoiceItem
        {
            Description = test.Name,
            Amount = test.Price
        }));

        var totals = InvoiceCalculator.Calculate(items.Select(item => item.Amount));
        var invoice = new Invoice
        {
            InvoiceNumber = await NextInvoiceNumberAsync(localNow.Year, cancellationToken),
            AppointmentId = appointment.Id,
            Appointment = appointment,
            PatientId = appointment.PatientId,
            Patient = appointment.Patient,
            DoctorId = appointment.DoctorId,
            Doctor = appointment.Doctor,
            IssuedAt = DateOnly.FromDateTime(localNow),
            TaxRate = InvoiceCalculator.DefaultTaxRate,
            Subtotal = totals.Subtotal,
            TaxAmount = totals.TaxAmount,
            TotalAmount = totals.TotalAmount,
            Status = InvoiceStatus.Issued,
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime,
            Items = items
        };

        appointment.Invoice = invoice;
        db.Consultations.Add(consultation);
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(cancellationToken);

        await notifications.SendConsultationSummaryAsync(consultation, cancellationToken);

        try
        {
            var pdf = pdfGenerator.Generate(invoice.ToInvoicePdfModel(_options));
            await notifications.SendInvoiceAsync(invoice, pdf, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Invoice {InvoiceNumber} could not be emailed.", invoice.InvoiceNumber);
        }

        return new ConsultationResultDto(
            consultation.ToConsultationDto(),
            invoice.ToInvoiceDto());
    }

    private IQueryable<Consultation> BuildReadQuery() =>
        db.Consultations
            .AsNoTracking()
            .Include(item => item.Appointment)
                .ThenInclude(item => item.Patient)
                    .ThenInclude(item => item.User)
            .Include(item => item.Appointment)
                .ThenInclude(item => item.Doctor)
                    .ThenInclude(item => item.User)
            .Include(item => item.Appointment)
                .ThenInclude(item => item.Doctor)
                    .ThenInclude(item => item.Specialization)
            .Include(item => item.Tests)
                .ThenInclude(item => item.MedicalTest)
            .Include(item => item.Prescription);

    private async Task EnsureCanAccessAsync(Consultation consultation, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        switch (role)
        {
            case UserRole.Admin:
                return;
            case UserRole.Patient:
                var patientId = await GetCurrentPatientIdAsync(cancellationToken);
                if (consultation.Appointment.PatientId != patientId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            case UserRole.Doctor:
                var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
                if (consultation.Appointment.DoctorId != doctorId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            default:
                throw new ForbiddenAppException();
        }
    }

    private async Task<Guid> GetCurrentPatientIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        return await db.Patients
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ForbiddenAppException("Patient profile not found.");
    }

    private async Task<Guid> GetCurrentDoctorIdAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        return await db.Doctors
            .Where(item => item.UserId == userId && item.User.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new ForbiddenAppException("Doctor profile not found.");
    }

    private async Task<string> NextInvoiceNumberAsync(int year, CancellationToken cancellationToken)
    {
        var sequence = await db.InvoiceSequences
            .FirstOrDefaultAsync(item => item.Year == year, cancellationToken);

        if (sequence is null)
        {
            sequence = new InvoiceSequence { Year = year, LastNumber = 0 };
            db.InvoiceSequences.Add(sequence);
        }

        sequence.LastNumber += 1;
        return $"INV-{year}-{sequence.LastNumber:0000}";
    }

    private static DateOnly ParseDate(string value, string field)
    {
        if (DateOnly.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date))
        {
            return date;
        }

        throw new ValidationAppException(
            "Use a valid date.",
            new Dictionary<string, string[]> { [field] = ["Use the yyyy-MM-dd format."] });
    }
}
