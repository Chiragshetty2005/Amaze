using AmazeCare.Application.Common;
using AmazeCare.Domain.Entities;

namespace AmazeCare.UnitTests;

public sealed class AvailabilityCalculatorTests
{
    private static readonly DoctorAvailability MondayWindow = new()
    {
        Day = 1,
        StartTime = new TimeOnly(9, 0),
        EndTime = new TimeOnly(11, 0),
        SlotMinutes = 30
    };

    [Fact]
    public void Generate_ReturnsAlignedSlots_AndSkipsBookedTimes()
    {
        var booked = new HashSet<(DateOnly Date, TimeOnly Time)>
        {
            (new DateOnly(2026, 11, 9), new TimeOnly(9, 30))
        };

        var slots = AvailabilityCalculator.Generate(
            [MondayWindow],
            new DateOnly(2026, 11, 9),
            1,
            booked,
            new DateTime(2026, 11, 9, 8, 0, 0, DateTimeKind.Utc));

        Assert.Equal(
            [
                new AvailableSlot(new DateOnly(2026, 11, 9), new TimeOnly(9, 0)),
                new AvailableSlot(new DateOnly(2026, 11, 9), new TimeOnly(10, 0)),
                new AvailableSlot(new DateOnly(2026, 11, 9), new TimeOnly(10, 30))
            ],
            slots);
    }

    [Fact]
    public void Generate_SkipsSlotsThatHaveAlreadyStarted()
    {
        var slots = AvailabilityCalculator.Generate(
            [MondayWindow],
            new DateOnly(2026, 11, 9),
            1,
            new HashSet<(DateOnly Date, TimeOnly Time)>(),
            new DateTime(2026, 11, 9, 10, 15, 0, DateTimeKind.Utc));

        Assert.Equal(
            [new AvailableSlot(new DateOnly(2026, 11, 9), new TimeOnly(10, 30))],
            slots);
    }

    [Theory]
    [InlineData("09:00", true)]
    [InlineData("10:00", true)]
    [InlineData("10:30", true)]
    [InlineData("10:45", false)]
    [InlineData("08:30", false)]
    [InlineData("11:00", false)]
    public void TryValidateSlot_ChecksWindowAndSlotAlignment(string time, bool expected)
    {
        var result = AvailabilityCalculator.TryValidateSlot(
            [MondayWindow],
            new DateOnly(2026, 11, 9),
            TimeOnly.Parse(time),
            new DateTime(2026, 11, 9, 8, 0, 0, DateTimeKind.Utc),
            out var error);

        Assert.Equal(expected, result);
        Assert.Equal(expected, error is null);
    }

    [Fact]
    public void TryValidateSlot_RejectsPastDates()
    {
        var result = AvailabilityCalculator.TryValidateSlot(
            [MondayWindow],
            new DateOnly(2026, 11, 8),
            new TimeOnly(9, 0),
            new DateTime(2026, 11, 9, 8, 0, 0, DateTimeKind.Utc),
            out var error);

        Assert.False(result);
        Assert.NotNull(error);
    }
}
