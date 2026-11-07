using System.Text.Json;
using AmazeCare.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace AmazeCare.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
            {
                logger.LogError(exception, "The response has already started and cannot be replaced.");
                throw;
            }

            await WriteProblemAsync(context, exception);
        }
    }

    private async Task WriteProblemAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;
        ProblemDetails problem;
        var statusCode = StatusCodes.Status500InternalServerError;

        if (exception is AppException appException)
        {
            statusCode = appException.StatusCode;
            problem = new ProblemDetails
            {
                Status = statusCode,
                Title = appException.Code ?? "request_failed",
                Detail = appException.Message,
                Instance = context.Request.Path,
                Type = $"https://httpstatuses.com/{statusCode}"
            };
            problem.Extensions["code"] = appException.Code;
            problem.Extensions["traceId"] = traceId;

            if (exception is ValidationAppException validationException)
            {
                problem.Extensions["errors"] = validationException.Errors;
            }
        }
        else
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}. Trace {TraceId}.",
                context.Request.Method,
                context.Request.Path,
                traceId);

            problem = new ProblemDetails
            {
                Status = statusCode,
                Title = "server_error",
                Detail = "Something went wrong while processing the request.",
                Instance = context.Request.Path,
                Type = "https://httpstatuses.com/500"
            };
            problem.Extensions["code"] = "server_error";
            problem.Extensions["traceId"] = traceId;
        }

        if (statusCode == StatusCodes.Status401Unauthorized)
        {
            context.Response.Headers.WWWAuthenticate = "Bearer";
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, JsonOptions));
    }
}
