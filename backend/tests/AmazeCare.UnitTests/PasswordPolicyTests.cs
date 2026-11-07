using AmazeCare.Application.Common;

namespace AmazeCare.UnitTests;

public sealed class PasswordPolicyTests
{
    [Theory]
    [InlineData("short1!")]
    [InlineData("alllowercase1!")]
    [InlineData("ALLUPPERCASE1!")]
    [InlineData("NoNumberHere!")]
    [InlineData("NoSymbolHere1")]
    public void Validate_RejectsWeakPasswords(string password)
    {
        Assert.NotEmpty(PasswordPolicy.Validate(password));
    }

    [Theory]
    [InlineData("Patient@123")]
    [InlineData("Doctor@123")]
    [InlineData("Admin@123")]
    public void Validate_AcceptsDemoPasswords(string password)
    {
        Assert.Empty(PasswordPolicy.Validate(password));
    }
}
