namespace AmazeCare.Application.Common;

public static class PasswordPolicy
{
    public static IReadOnlyList<string> Validate(string password)
    {
        var errors = new List<string>();

        if (password.Length < 8)
        {
            errors.Add("Use at least eight characters.");
        }

        if (!password.Any(char.IsUpper))
        {
            errors.Add("Add an uppercase letter.");
        }

        if (!password.Any(char.IsLower))
        {
            errors.Add("Add a lowercase letter.");
        }

        if (!password.Any(char.IsDigit))
        {
            errors.Add("Add a number.");
        }

        if (password.All(char.IsLetterOrDigit))
        {
            errors.Add("Add a symbol.");
        }

        return errors;
    }

    public static void EnsureValid(string password)
    {
        var errors = Validate(password);
        if (errors.Count == 0)
        {
            return;
        }

        throw new ValidationAppException(
            "Choose a stronger password.",
            new Dictionary<string, string[]> { ["password"] = errors.ToArray() });
    }
}
