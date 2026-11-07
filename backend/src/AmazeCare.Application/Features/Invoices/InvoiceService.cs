using System.Globalization;
using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Auth;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AmazeCare.Application.Features.Invoices;

public sealed record InvoicePdfResult(string FileName, byte[] Content);

public sealed class InvoiceService(
    IAppDbContext db,
    ICurrentUserService currentUser,
    IInvoicePdfGenerator pdfGenerator,
    INotificationService notifications,
    IOptions<AppOptions> options,
    TimeProvider timeProvider)
{
    private readonly AppOptions _options = options.Value;

    public async Task<PagedResult<InvoiceDto>> SearchAsync(
        InvoiceSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        var invoices = BuildReadQuery();

        if (role == UserRole.Patient)
        {
            var patientId = await GetCurrentPatientIdAsync(cancellationToken);
            invoices = invoices.Where(item => item.PatientId == patientId);
        }
        else if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
            invoices = invoices.Where(item => item.DoctorId == doctorId);
        }
        else if (role != UserRole.Admin)
        {
            throw new ForbiddenAppException();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<InvoiceStatus>(query.Status, true, out var status) ||
                !Enum.IsDefined(status))
            {
                throw new ValidationAppException("Choose a valid invoice status.");
            }

            invoices = invoices.Where(item => item.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.From))
        {
            var from = ParseDate(query.From, "from");
            invoices = invoices.Where(item => item.IssuedAt >= from);
        }

        if (!string.IsNullOrWhiteSpace(query.To))
        {
            var to = ParseDate(query.To, "to");
            invoices = invoices.Where(item => item.IssuedAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            invoices = invoices.Where(item =>
                item.InvoiceNumber.Contains(search) ||
                item.Patient.User.FullName.Contains(search) ||
                item.Doctor.User.FullName.Contains(search));
        }

        var total = await invoices.CountAsync(cancellationToken);
        var items = await invoices
            .OrderByDescending(item => item.IssuedAt)
            .ThenByDescending(item => item.InvoiceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<InvoiceDto>(
            items.Select(item => item.ToInvoiceDto()).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<InvoiceDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await LoadInvoiceAsync(id, asTracking: false, cancellationToken);
        await EnsureCanAccessAsync(invoice, cancellationToken);
        return invoice.ToInvoiceDto();
    }

    public async Task<InvoicePdfResult> GetPdfAsync(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await LoadInvoiceAsync(id, asTracking: false, cancellationToken);
        await EnsureCanAccessAsync(invoice, cancellationToken);
        var bytes = pdfGenerator.Generate(invoice.ToInvoicePdfModel(_options));
        return new InvoicePdfResult($"{invoice.InvoiceNumber}.pdf", bytes);
    }

    public async Task<MessageResponse> EmailAsync(Guid id, CancellationToken cancellationToken)
    {
        var invoice = await LoadInvoiceAsync(id, asTracking: false, cancellationToken);
        await EnsureCanAccessAsync(invoice, cancellationToken);
        var bytes = pdfGenerator.Generate(invoice.ToInvoicePdfModel(_options));
        await notifications.SendInvoiceAsync(invoice, bytes, cancellationToken);
        return new MessageResponse($"Invoice {invoice.InvoiceNumber} has been emailed to the patient.");
    }

    public async Task<InvoiceDto> MarkPaidAsync(Guid id, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        if (role != UserRole.Admin)
        {
            throw new ForbiddenAppException("Only an administrator can mark an invoice as paid.");
        }

        var invoice = await LoadInvoiceAsync(id, asTracking: true, cancellationToken);
        if (invoice.Status == InvoiceStatus.Paid)
        {
            return invoice.ToInvoiceDto();
        }

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(cancellationToken);
        return invoice.ToInvoiceDto();
    }

    private IQueryable<Invoice> BuildReadQuery() =>
        db.Invoices
            .AsNoTracking()
            .Include(item => item.Appointment)
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Include(item => item.Items);

    private async Task<Invoice> LoadInvoiceAsync(
        Guid id,
        bool asTracking,
        CancellationToken cancellationToken)
    {
        var query = db.Invoices
            .Include(item => item.Appointment)
            .Include(item => item.Patient)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.User)
            .Include(item => item.Doctor)
                .ThenInclude(item => item.Specialization)
            .Include(item => item.Items)
            .AsQueryable();

        if (!asTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new NotFoundAppException("Invoice not found.");
    }

    private async Task EnsureCanAccessAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var role = currentUser.Role ?? throw new UnauthorizedAppException();
        switch (role)
        {
            case UserRole.Admin:
                return;
            case UserRole.Patient:
                var patientId = await GetCurrentPatientIdAsync(cancellationToken);
                if (invoice.PatientId != patientId)
                {
                    throw new ForbiddenAppException();
                }

                return;
            case UserRole.Doctor:
                var doctorId = await GetCurrentDoctorIdAsync(cancellationToken);
                if (invoice.DoctorId != doctorId)
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
