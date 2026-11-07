using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Specializations;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using AmazeCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AmazeCare.UnitTests;

public sealed class SpecializationServiceTests
{
    [Fact]
    public async Task Delete_IsBlockedWhileAnActiveDoctorIsAssigned()
    {
        await using var db = CreateDb();
        var (specialization, _) = await SeedAsync(db, activeDoctor: true);
        var service = new SpecializationService(db, new FixedTimeProvider());

        var exception = await Assert.ThrowsAsync<ConflictAppException>(() =>
            service.DeleteAsync(specialization.Id, CancellationToken.None));

        Assert.Contains("Reassign", exception.Message);
        Assert.True((await db.Specializations.SingleAsync()).IsActive);
    }

    [Fact]
    public async Task Delete_SoftDeletesADepartmentWithoutActiveDoctors()
    {
        await using var db = CreateDb();
        var (specialization, doctorUser) = await SeedAsync(db, activeDoctor: true);
        doctorUser.IsActive = false;
        await db.SaveChangesAsync();

        var service = new SpecializationService(db, new FixedTimeProvider());
        await service.DeleteAsync(specialization.Id, CancellationToken.None);

        var stored = await db.Specializations.SingleAsync();
        Assert.False(stored.IsActive);
        Assert.Empty(await service.ListAsync(CancellationToken.None));
    }

    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"specializations-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(Specialization Specialization, User DoctorUser)> SeedAsync(
        AppDbContext db,
        bool activeDoctor)
    {
        var specialization = new Specialization
        {
            Name = "Cardiology",
            Description = "Heart care."
        };

        var user = new User
        {
            FullName = "Dr. Arjun Rao",
            Email = "arjun@example.test",
            Phone = "+91 90000 00003",
            PasswordHash = "hash",
            Role = UserRole.Doctor,
            IsActive = activeDoctor
        };

        var doctor = new Doctor
        {
            User = user,
            UserId = user.Id,
            Specialization = specialization,
            SpecializationId = specialization.Id,
            ExperienceYears = 14,
            Qualification = "DM",
            Designation = "Consultant",
            Fee = 1200,
            Bio = "Cardiologist."
        };
        user.Doctor = doctor;

        db.Users.Add(user);
        db.Specializations.Add(specialization);
        await db.SaveChangesAsync();
        return (specialization, user);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() =>
            new(2026, 11, 9, 8, 0, 0, TimeSpan.Zero);

        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }
}
