using AmazeCare.Application.Common;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.Application.Features.Specializations;

public sealed class SpecializationService(IAppDbContext db, TimeProvider timeProvider)
{
    public async Task<IReadOnlyList<SpecializationDto>> ListAsync(CancellationToken cancellationToken)
    {
        var specializations = await db.Specializations
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new SpecializationDto(
                item.Id,
                item.Name,
                item.Description,
                item.Doctors.Count(doctor => doctor.User.IsActive)))
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken);

        return specializations;
    }

    public async Task<SpecializationDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var specialization = await db.Specializations
            .AsNoTracking()
            .Where(item => item.Id == id && item.IsActive)
            .Select(item => new SpecializationDto(
                item.Id,
                item.Name,
                item.Description,
                item.Doctors.Count(doctor => doctor.User.IsActive)))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundAppException("Department not found.");

        return specialization;
    }

    public async Task<SpecializationDto> CreateAsync(
        SaveSpecializationRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();
        if (await db.Specializations.AnyAsync(item => item.Name == name, cancellationToken))
        {
            throw new ConflictAppException("A department with that name already exists.");
        }

        var specialization = new Specialization
        {
            Name = name,
            Description = request.Description.Trim(),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        db.Specializations.Add(specialization);
        await db.SaveChangesAsync(cancellationToken);
        return new SpecializationDto(specialization.Id, specialization.Name, specialization.Description, 0);
    }

    public async Task<SpecializationDto> UpdateAsync(
        Guid id,
        SaveSpecializationRequest request,
        CancellationToken cancellationToken)
    {
        var specialization = await db.Specializations
            .Include(item => item.Doctors)
                .ThenInclude(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Department not found.");

        var name = request.Name.Trim();
        if (await db.Specializations.AnyAsync(item => item.Id != id && item.Name == name, cancellationToken))
        {
            throw new ConflictAppException("A department with that name already exists.");
        }

        specialization.Name = name;
        specialization.Description = request.Description.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return new SpecializationDto(
            specialization.Id,
            specialization.Name,
            specialization.Description,
            specialization.Doctors.Count(doctor => doctor.User.IsActive));
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var specialization = await db.Specializations
            .Include(item => item.Doctors)
                .ThenInclude(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == id && item.IsActive, cancellationToken)
            ?? throw new NotFoundAppException("Department not found.");

        if (specialization.Doctors.Any(doctor => doctor.User.IsActive))
        {
            throw new ConflictAppException(
                "Reassign the doctors in this department before deleting it.");
        }

        specialization.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
    }
}
