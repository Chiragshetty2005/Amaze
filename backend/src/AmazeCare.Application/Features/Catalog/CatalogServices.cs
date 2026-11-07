using AmazeCare.Application.Common;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Catalog;

public sealed class MedicineService(IAppDbContext db, TimeProvider timeProvider)
{
    public async Task<PagedResult<MedicineDto>> SearchAsync(
        CatalogSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);
        var medicines = db.Medicines
            .AsNoTracking()
            .Where(item => item.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            medicines = medicines.Where(item =>
                item.Name.Contains(search) ||
                item.Form.Contains(search) ||
                item.Strength.Contains(search));
        }

        var total = await medicines.CountAsync(cancellationToken);
        var items = await medicines
            .OrderBy(item => item.Name)
            .ThenBy(item => item.Strength)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new MedicineDto(item.Id, item.Name, item.Form, item.Strength))
            .ToListAsync(cancellationToken);

        return new PagedResult<MedicineDto>(items, page, pageSize, total);
    }

    public async Task<MedicineDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var medicine = await db.Medicines
            .AsNoTracking()
            .Where(item => item.Id == id && item.IsActive)
            .Select(item => new MedicineDto(item.Id, item.Name, item.Form, item.Strength))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundAppException("Medicine not found.");

        return medicine;
    }

    public async Task<MedicineDto> CreateAsync(
        SaveMedicineRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        var strength = request.Strength.Trim();
        if (await db.Medicines.AnyAsync(
                item => item.IsActive && item.Name == name && item.Strength == strength,
                cancellationToken))
        {
            throw new ConflictAppException("That medicine already exists.");
        }

        var medicine = new Medicine
        {
            Name = name,
            Form = request.Form.Trim(),
            Strength = strength,
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        db.Medicines.Add(medicine);
        await db.SaveChangesAsync(cancellationToken);
        return new MedicineDto(medicine.Id, medicine.Name, medicine.Form, medicine.Strength);
    }

    public async Task<MedicineDto> UpdateAsync(
        Guid id,
        SaveMedicineRequest request,
        CancellationToken cancellationToken)
    {
        var medicine = await db.Medicines
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Medicine not found.");

        var name = request.Name.Trim();
        var strength = request.Strength.Trim();
        if (await db.Medicines.AnyAsync(
                item => item.Id != id && item.IsActive && item.Name == name && item.Strength == strength,
                cancellationToken))
        {
            throw new ConflictAppException("That medicine already exists.");
        }

        medicine.Name = name;
        medicine.Form = request.Form.Trim();
        medicine.Strength = strength;
        await db.SaveChangesAsync(cancellationToken);
        return new MedicineDto(medicine.Id, medicine.Name, medicine.Form, medicine.Strength);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var medicine = await db.Medicines
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Medicine not found.");

        medicine.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class MedicalTestService(IAppDbContext db, TimeProvider timeProvider)
{
    public async Task<PagedResult<MedicalTestDto>> SearchAsync(
        CatalogSearchQuery query,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, 200);
        var tests = db.MedicalTests
            .AsNoTracking()
            .Where(item => item.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            tests = tests.Where(item => item.Name.Contains(search));
        }

        var total = await tests.CountAsync(cancellationToken);
        var items = await tests
            .OrderBy(item => item.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new MedicalTestDto(item.Id, item.Name, item.Price))
            .ToListAsync(cancellationToken);

        return new PagedResult<MedicalTestDto>(items, page, pageSize, total);
    }

    public async Task<MedicalTestDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var test = await db.MedicalTests
            .AsNoTracking()
            .Where(item => item.Id == id && item.IsActive)
            .Select(item => new MedicalTestDto(item.Id, item.Name, item.Price))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundAppException("Test not found.");

        return test;
    }

    public async Task<MedicalTestDto> CreateAsync(
        SaveMedicalTestRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (await db.MedicalTests.AnyAsync(item => item.IsActive && item.Name == name, cancellationToken))
        {
            throw new ConflictAppException("A test with that name already exists.");
        }

        var test = new MedicalTest
        {
            Name = name,
            Price = request.Price,
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        db.MedicalTests.Add(test);
        await db.SaveChangesAsync(cancellationToken);
        return new MedicalTestDto(test.Id, test.Name, test.Price);
    }

    public async Task<MedicalTestDto> UpdateAsync(
        Guid id,
        SaveMedicalTestRequest request,
        CancellationToken cancellationToken)
    {
        var test = await db.MedicalTests
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Test not found.");

        var name = request.Name.Trim();
        if (await db.MedicalTests.AnyAsync(
                item => item.Id != id && item.IsActive && item.Name == name,
                cancellationToken))
        {
            throw new ConflictAppException("A test with that name already exists.");
        }

        test.Name = name;
        test.Price = request.Price;
        await db.SaveChangesAsync(cancellationToken);
        return new MedicalTestDto(test.Id, test.Name, test.Price);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var test = await db.MedicalTests
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Test not found.");

        test.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
    }
}
