using AmazeCare.Application.Common;
using AmazeCare.Application.Features.Auth;
using AmazeCare.Domain;
using AmazeCare.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AmazeCare.Application.Features.Auth;

public sealed class AuthService(
    IAppDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokens,
    ICurrentUserService currentUser,
    INotificationService notifications,
    IOptions<AppOptions> options,
    TimeProvider timeProvider)
{
    private readonly AppOptions _options = options.Value;

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users
            .FirstOrDefaultAsync(item => item.Email == email, cancellationToken);

        if (user is null || !user.IsActive || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("That email and password do not match.");
        }

        user.LastLoginAtUtc = timeProvider.GetUtcNow().UtcDateTime;
        var response = IssueTokens(user);
        await db.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task<SessionUserDto> RegisterPatientAsync(
        RegisterPatientRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await db.Users.AnyAsync(item => item.Email == email, cancellationToken))
        {
            throw new ConflictAppException("An account already uses that email.");
        }

        PasswordPolicy.EnsureValid(request.Password);
        ValidateDateOfBirth(request.DateOfBirth);
        var gender = ParseGender(request.Gender);

        var user = new User
        {
            FullName = request.Name.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            Role = UserRole.Patient,
            PasswordHash = passwordHasher.Hash(request.Password),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        user.Patient = new Patient
        {
            User = user,
            DateOfBirth = request.DateOfBirth,
            Gender = gender,
            Address = request.Address.Trim(),
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendWelcomeAsync(user, cancellationToken);
        return user.ToSessionUser();
    }

    public async Task<AuthResponse> RefreshAsync(string rawRefreshToken, CancellationToken cancellationToken)
    {
        var tokenHash = jwtTokens.HashRefreshToken(rawRefreshToken);
        var stored = await db.RefreshTokens
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.TokenHash == tokenHash, cancellationToken);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (stored is null || stored.RevokedAtUtc is not null || stored.ExpiresAtUtc <= now || !stored.User.IsActive)
        {
            throw new UnauthorizedAppException("That session has expired. Sign in again.");
        }

        stored.RevokedAtUtc = now;
        var response = IssueTokens(stored.User);
        var replacement = db.RefreshTokens.Local.Last();
        stored.ReplacedByTokenHash = replacement.TokenHash;

        await db.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task LogoutAsync(string? rawRefreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            return;
        }

        var tokenHash = jwtTokens.HashRefreshToken(rawRefreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(item => item.TokenHash == tokenHash, cancellationToken);

        if (stored is not null && stored.RevokedAtUtc is null)
        {
            stored.RevokedAtUtc = timeProvider.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<MessageResponse> ForgotPasswordAsync(string email, CancellationToken cancellationToken)
    {
        const string genericMessage =
            "If an account exists for that email, a password reset link has been sent.";

        var normalized = NormalizeEmail(email);
        var user = await db.Users
            .FirstOrDefaultAsync(item => item.Email == normalized && item.IsActive, cancellationToken);

        if (user is null)
        {
            return new MessageResponse(genericMessage);
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var recentRequests = await db.PasswordResetTokens.CountAsync(
            item => item.UserId == user.Id && item.CreatedAtUtc > now.AddHours(-1),
            cancellationToken);

        if (recentRequests >= Math.Max(1, _options.PasswordResetMaxPerHour))
        {
            return new MessageResponse(genericMessage);
        }

        var activeTokens = await db.PasswordResetTokens
            .Where(item => item.UserId == user.Id && item.UsedAtUtc == null && item.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.UsedAtUtc = now;
        }

        var rawToken = SecurityTokens.Create();
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = SecurityTokens.Hash(rawToken),
            ExpiresAtUtc = now.AddMinutes(Math.Clamp(_options.PasswordResetMinutes, 5, 120)),
            CreatedAtUtc = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await notifications.SendPasswordResetAsync(user, rawToken, cancellationToken);
        return new MessageResponse(genericMessage);
    }

    public async Task<MessageResponse> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        PasswordPolicy.EnsureValid(request.NewPassword);
        var email = NormalizeEmail(request.Email);
        var tokenHash = SecurityTokens.Hash(request.Token);
        var now = timeProvider.GetUtcNow().UtcDateTime;

        var resetToken = await db.PasswordResetTokens
            .Include(item => item.User)
            .FirstOrDefaultAsync(
                item => item.TokenHash == tokenHash && item.User.Email == email,
                cancellationToken);

        if (resetToken is null ||
            resetToken.UsedAtUtc is not null ||
            resetToken.ExpiresAtUtc <= now ||
            !resetToken.User.IsActive)
        {
            throw new ValidationAppException(
                "That reset link is invalid or has expired. Request a new one.");
        }

        resetToken.User.PasswordHash = passwordHasher.Hash(request.NewPassword);
        resetToken.UsedAtUtc = now;

        var activeRefreshTokens = await db.RefreshTokens
            .Where(item => item.UserId == resetToken.UserId && item.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeRefreshTokens)
        {
            token.RevokedAtUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new MessageResponse("Your password has been reset. Sign in with the new password.");
    }

    public async Task<MessageResponse> ChangePasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new UnauthorizedAppException();

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new ValidationAppException(
                "Your current password is not correct.",
                new Dictionary<string, string[]> { ["currentPassword"] = ["Check your current password."] });
        }

        PasswordPolicy.EnsureValid(request.NewPassword);
        user.PasswordHash = passwordHasher.Hash(request.NewPassword);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var activeRefreshTokens = await db.RefreshTokens
            .Where(item => item.UserId == userId && item.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeRefreshTokens)
        {
            token.RevokedAtUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new MessageResponse("Password updated. Use the new password next time you sign in.");
    }

    public async Task<SessionUserDto> GetMeAsync(CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId && item.IsActive, cancellationToken)
            ?? throw new UnauthorizedAppException();

        return user.ToSessionUser();
    }

    public async Task<SessionUserDto> UpdateProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.RequireUserId();
        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId && item.IsActive, cancellationToken)
            ?? throw new UnauthorizedAppException();

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ValidationAppException(
                    "Name cannot be empty.",
                    new Dictionary<string, string[]> { ["name"] = ["Enter your name."] });
            }

            user.FullName = request.Name.Trim();
        }

        if (request.Phone is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Phone))
            {
                throw new ValidationAppException(
                    "Phone cannot be empty.",
                    new Dictionary<string, string[]> { ["phone"] = ["Enter a phone number."] });
            }

            user.Phone = request.Phone.Trim();
        }

        if (request.PhotoUrl is not null)
        {
            user.PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim();
        }

        await db.SaveChangesAsync(cancellationToken);
        return user.ToSessionUser();
    }

    private AuthResponse IssueTokens(User user)
    {
        var access = jwtTokens.CreateAccessToken(user);
        var refresh = jwtTokens.CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refresh.TokenHash,
            ExpiresAtUtc = refresh.ExpiresAtUtc,
            CreatedAtUtc = timeProvider.GetUtcNow().UtcDateTime
        });

        return new AuthResponse(
            access.Token,
            refresh.Token,
            access.ExpiresAtUtc,
            user.ToSessionUser());
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static Gender ParseGender(string value)
    {
        if (Enum.TryParse<Gender>(value, ignoreCase: true, out var gender) &&
            Enum.IsDefined(gender))
        {
            return gender;
        }

        throw new ValidationAppException(
            "Choose a valid gender.",
            new Dictionary<string, string[]> { ["gender"] = ["Use Female, Male, or Other."] });
    }

    private void ValidateDateOfBirth(DateOnly dateOfBirth)
    {
        var today = DateOnly.FromDateTime(ClinicTime.LocalNow(timeProvider));
        if (dateOfBirth == default || dateOfBirth > today || dateOfBirth < today.AddYears(-120))
        {
            throw new ValidationAppException(
                "Enter a valid date of birth.",
                new Dictionary<string, string[]> { ["dateOfBirth"] = ["Enter a date in the past."] });
        }
    }
}
