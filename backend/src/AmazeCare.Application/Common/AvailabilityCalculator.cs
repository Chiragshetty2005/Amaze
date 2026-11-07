using AmazeCare.Domain.Entities;

namespace AmazeCare.Application.Common;

public sealed record AvailableSlot(DateOnly Date, TimeOnly Time);

public static class AvailabilityCalculator
{
    public static IReadOnlyList<AvailableSlot> Generate(
        IEnumerable<DoctorAvailability> availability,
        DateOnly fromDate,
        int days,
        IReadOnlySet<(DateOnly Date, TimeOnly Time)> booked,
        DateTime localNow,
        int maxSlots = 500)
    {
        var windows = availability.ToList();
        var results = new List<AvailableSlot>();
        var today = DateOnly.FromDateTime(localNow);
        var currentTime = TimeOnly.FromDateTime(localNow);

        for (var offset = 0; offset < Math.Clamp(days, 1, 31); offset++)
        {
            var date = fromDate.AddDays(offset);
            if (date < today)
            {
                continue;
            }

            foreach (var window in windows.Where(item => item.Day == (int)date.DayOfWeek))
            {
                for (var slot = window.StartTime; slot.AddMinutes(window.SlotMinutes) <= window.EndTime; slot = slot.AddMinutes(window.SlotMinutes))
                {
                    if (date == today && slot <= currentTime)
                    {
                        continue;
                    }

                    if (booked.Contains((date, slot)))
                    {
                        continue;
                    }

                    results.Add(new AvailableSlot(date, slot));
                    if (results.Count >= maxSlots)
                    {
                        return results;
                    }
                }
            }
        }

        return results
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Time)
            .ToList();
    }

    public static bool TryValidateSlot(
        IEnumerable<DoctorAvailability> availability,
        DateOnly date,
        TimeOnly time,
        DateTime localNow,
        out string? error)
    {
        error = null;
        var today = DateOnly.FromDateTime(localNow);
        var currentTime = TimeOnly.FromDateTime(localNow);

        if (date < today)
        {
            error = "Choose a date that has not passed.";
            return false;
        }

        if (date == today && time <= currentTime)
        {
            error = "Choose a slot later than the current time.";
            return false;
        }

        foreach (var window in availability.Where(item => item.Day == (int)date.DayOfWeek))
        {
            if (window.SlotMinutes <= 0)
            {
                continue;
            }

            var end = time.AddMinutes(window.SlotMinutes);
            if (time < window.StartTime || end > window.EndTime)
            {
                continue;
            }

            var offset = time.ToTimeSpan() - window.StartTime.ToTimeSpan();
            if (offset.TotalMinutes % window.SlotMinutes == 0)
            {
                return true;
            }
        }

        error = "That time is not one of the doctor's available slots.";
        return false;
    }

    public static bool IsFuture(DateOnly date, TimeOnly time, DateTime localNow)
    {
        var today = DateOnly.FromDateTime(localNow);
        return date > today || (date == today && time > TimeOnly.FromDateTime(localNow));
    }
}
