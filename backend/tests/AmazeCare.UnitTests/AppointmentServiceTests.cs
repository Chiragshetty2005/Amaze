using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Appointments;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using AmazeCare.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace AmazeCare.UnitTests;

public sealed class AppointmentServiceTests
{
    private static readonly DateTimeOffset FixedNow =
        new(2026, 11, 9, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Create_BooksAnAvailableSlot_AndNotifiesThePatient()
    {
        await using var fixture = await AppointmentFixture.CreateAsync();

        var appointment = await fixture.Service.CreateAsync(
            fixture.NewRequest("09:30"),
            CancellationToken.None);

        Assert.Equal("pending", appointment.Status);
        Assert.Equal("2026-11-09", appointment.Date);
        Assert.Equal("09:30", appointment.Time);
        Assert.Equal(1, await fixture.Db.Appointments.CountAsync());

        fixture.Notifications.Verify(
            item => item.SendAppointmentReceivedAsync(
                It.IsAny<Appointment>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Create_RejectsADoubleBooking()
    {
        await using var fixture = await AppointmentFixture.CreateAsync();
        await fixture.Service.CreateAsync(fixture.NewRequest("09:30"), CancellationToken.None);

        await Assert.ThrowsAsync<ConflictAppException>(() =>
            fixture.Service.CreateAsync(fixture.NewRequest("09:30"), CancellationToken.None));
    }

    [Fact]
    public async Task Create_RejectsATimeOutsideAvailability()
    {
        await using var fixture = await AppointmentFixture.CreateAsync();

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            fixture.Service.CreateAsync(fixture.NewRequest("12:30"), CancellationToken.None));
    }

    [Fact]
    public async Task Create_RejectsATimeThatDoesNotAlignWithTheSlotGrid()
    {
        await using var fixture = await AppointmentFixture.CreateAsync();

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            fixture.Service.CreateAsync(fixture.NewRequest("09:15"), CancellationToken.None));
    }

    private sealed class AppointmentFixture : IAsyncDisposable
    {
        private AppointmentFixture(
            AppDbContext db,
            AppointmentService service,
            Mock<INotificationService> notifications,
            Patient patient,
            Doctor doctor)
        {
            Db = db;
            Service = service;
            Notifications = notifications;
            Patient = patient;
            Doctor = doctor;
        }

        public AppDbContext Db { get; }
        public AppointmentService Service { get; }
        public Mock<INotificationService> Notifications { get; }
        public Patient Patient { get; }
        public Doctor Doctor { get; }

        public static async Task<AppointmentFixture> CreateAsync()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase($"appointments-{Guid.NewGuid():N}")
                .Options;
            var db = new AppDbContext(options);

            var specialization = new Specialization
            {
                Name = "General Medicine",
                Description = "Everyday care."
            };

            var patientUser = new User
            {
                FullName = "Priya Nair",
                Email = "priya@example.test",
                Phone = "+91 90000 00001",
                PasswordHash = "hash",
                Role = UserRole.Patient
            };

            var patient = new Patient
            {
                User = patientUser,
                UserId = patientUser.Id,
                DateOfBirth = new DateOnly(1992, 4, 18),
                Gender = Gender.Female,
                Address = "Indiranagar"
            };
            patientUser.Patient = patient;

            var doctorUser = new User
            {
                FullName = "Dr. Sameer Khan",
                Email = "sameer@example.test",
                Phone = "+91 90000 00002",
                PasswordHash = "hash",
                Role = UserRole.Doctor
            };

            var doctor = new Doctor
            {
                User = doctorUser,
                UserId = doctorUser.Id,
                Specialization = specialization,
                SpecializationId = specialization.Id,
                ExperienceYears = 20,
                Qualification = "MD",
                Designation = "Consultant",
                Fee = 700,
                Bio = "General physician.",
                Availability =
                [
                    new DoctorAvailability
                    {
                        Day = 1,
                        StartTime = new TimeOnly(9, 0),
                        EndTime = new TimeOnly(12, 0),
                        SlotMinutes = 30
                    }
                ]
            };
            doctorUser.Doctor = doctor;

            db.Users.AddRange(patientUser, doctorUser);
            db.Specializations.Add(specialization);
            await db.SaveChangesAsync();

            var currentUser = new Mock<ICurrentUserService>();
            currentUser.SetupGet(item => item.Role).Returns(UserRole.Patient);
            currentUser.SetupGet(item => item.UserId).Returns(patientUser.Id);
            currentUser.Setup(item => item.RequireUserId()).Returns(patientUser.Id);

            var notifications = new Mock<INotificationService>();
            notifications
                .Setup(item => item.SendAppointmentReceivedAsync(
                    It.IsAny<Appointment>(),
                    It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var service = new AppointmentService(
                db,
                currentUser.Object,
                notifications.Object,
                new FixedTimeProvider(FixedNow));

            return new AppointmentFixture(db, service, notifications, patient, doctor);
        }

        public CreateAppointmentRequest NewRequest(string time) => new()
        {
            DoctorId = Doctor.Id,
            Date = "2026-11-09",
            Time = time,
            Symptoms = "Fever and sore throat.",
            NatureOfVisit = "New consultation"
        };

        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }
}
