using System.Text;
using AmazeCare.Application.Common;
using AmazeCare.Infrastructure.Configuration;
using AmazeCare.Infrastructure.Email;
using AmazeCare.Infrastructure.Pdf;
using AmazeCare.Infrastructure.Persistence;
using AmazeCare.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AmazeCare.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is required. Start SQL Server and set the connection string.");

        services
            .AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Key) &&
                           Encoding.UTF8.GetByteCount(options.Key) >= 32,
                "Jwt:Key must contain at least 32 bytes.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Issuer) &&
                           !string.IsNullOrWhiteSpace(options.Audience),
                "Jwt:Issuer and Jwt:Audience are required.")
            .ValidateOnStart();

        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<AppOptions>(configuration.GetSection(AppOptions.SectionName));

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                connectionString,
                sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IEmailService, SmtpEmailService>();
        services.AddSingleton<IInvoicePdfGenerator, QuestPdfInvoiceGenerator>();
        services.AddScoped<DatabaseSeeder>();
        return services;
    }
}
