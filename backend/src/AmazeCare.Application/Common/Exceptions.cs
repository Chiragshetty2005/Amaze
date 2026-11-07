namespace AmazeCare.Application.Common;

public class AppException : Exception
{
    public AppException(string message, int statusCode = 400, string? code = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public int StatusCode { get; }
    public string? Code { get; }
}

public sealed class ValidationAppException : AppException
{
    public ValidationAppException(string message, IReadOnlyDictionary<string, string[]>? errors = null)
        : base(message, 400, "validation_error")
    {
        Errors = errors ?? new Dictionary<string, string[]>();
    }

    public IReadOnlyDictionary<string, string[]> Errors { get; }
}

public sealed class UnauthorizedAppException(string message = "Authentication is required.")
    : AppException(message, 401, "unauthorized");

public sealed class ForbiddenAppException(string message = "You do not have access to this resource.")
    : AppException(message, 403, "forbidden");

public sealed class NotFoundAppException(string message = "The requested resource was not found.")
    : AppException(message, 404, "not_found");

public sealed class ConflictAppException(string message = "The request conflicts with the current state of the resource.")
    : AppException(message, 409, "conflict");
