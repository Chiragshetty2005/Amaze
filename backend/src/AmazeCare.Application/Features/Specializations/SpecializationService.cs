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
            .Select(item => new { item.Id, item.Name, item.Description })
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var doctorCounts = await ActiveDoctorCountsAsync(cancellationToken);

        return specializations
            .Select(item => new SpecializationDto(
                item.Id,
                item.Name,
                item.Description,
                doctorCounts.GetValueOrDefault(item.Id)))
            .ToList();
    }

    public async Task<SpecializationDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var specialization = await db.Specializations
            .AsNoTracking()
            .Where(item => item.Id == id && item.IsActive)
            .Select(item => new { item.Id, item.Name, item.Description })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundAppException("Department not found.");

        var doctorCounts = await ActiveDoctorCountsAsync(cancellationToken);

        return new SpecializationDto(
            specialization.Id,
            specialization.Name,
            specialization.Description,
            doctorCounts.GetValueOrDefault(specialization.Id));
    }

    private async Task<Dictionary<Guid, int>> ActiveDoctorCountsAsync(
        CancellationToken cancellationToken) =>
        await (
                from doctor in db.Doctors
                join user in db.Users on doctor.UserId equals user.Id
                where user.IsActive
                group doctor by doctor.SpecializationId
                into grouped
                select new { SpecializationId = grouped.Key, Count = grouped.Count() })
            .ToDictionaryAsync(
                item => item.SpecializationId,
                item => item.Count,
                cancellationToken);

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
