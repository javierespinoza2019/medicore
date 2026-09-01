namespace MediCore.Common;

public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Message { get; init; }
    public IReadOnlyList<string>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null) =>
        new()
        {
            Success = false,
            Message = message,
            Errors = errors?.ToList() ?? [message]
        };
}

public static class ApiResponse
{
    public static ApiResponse<object?> Ok(string? message = null) =>
        ApiResponse<object?>.Ok(null, message);

    public static ApiResponse<object?> Fail(string message, IEnumerable<string>? errors = null) =>
        ApiResponse<object?>.Fail(message, errors);
}
