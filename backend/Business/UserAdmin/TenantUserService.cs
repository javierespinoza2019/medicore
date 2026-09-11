using MediCore.DataAccess.Auth;
using MediCore.DataAccess.UserAdmin;
using MediCore.Models.UserAdmin;

namespace MediCore.Business.UserAdmin;

public interface ITenantUserService
{
    Task<IReadOnlyList<TenantUserDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct);
    Task<TenantUserDto?> GetByIdAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<TenantUserDto> CreateAsync(
        Guid tenantId, Guid actorUserId, CreateTenantUserRequest request, CancellationToken ct);
    Task<TenantUserDto?> UpdateAsync(
        Guid tenantId, Guid userId, Guid actorUserId, UpdateTenantUserRequest request, CancellationToken ct);
    Task SoftDeleteAsync(Guid tenantId, Guid userId, Guid actorUserId, CancellationToken ct);
    Task SetPasswordAsync(
        Guid tenantId, Guid userId, Guid actorUserId, SetTenantUserPasswordRequest request, CancellationToken ct);
}

public sealed class TenantUserService(
    ITenantUserRepository repository,
    IAuthRepository authRepository) : ITenantUserService
{
    private static readonly HashSet<string> ForbiddenRoleCodes =
        new(StringComparer.OrdinalIgnoreCase) { "SuperAdmin" };

    public async Task<IReadOnlyList<TenantUserDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct)
    {
        var rows = await repository.ListAsync(tenantId, onlyActive, search, ct);
        return rows.Select(Map).ToList();
    }

    public async Task<TenantUserDto?> GetByIdAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        var row = await repository.GetByIdAsync(tenantId, userId, ct);
        return row is null ? null : Map(row);
    }

    public async Task<TenantUserDto> CreateAsync(
        Guid tenantId, Guid actorUserId, CreateTenantUserRequest request, CancellationToken ct)
    {
        var userName = RequireUserName(request.UserName);
        var displayName = RequireDisplayName(request.DisplayName);
        RequirePassword(request.Password);
        var roles = NormalizeRoles(request.RoleCodes);
        var branches = NormalizeBranches(request.BranchIds);

        var userId = request.UserId is { } given && given != Guid.Empty ? given : Guid.NewGuid();
        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var row = await repository.CreateAsync(
            tenantId,
            userId,
            userName,
            displayName,
            hash,
            request.IsActive,
            ToCsv(roles),
            ToCsv(branches),
            actorUserId,
            ct);
        return Map(row);
    }

    public async Task<TenantUserDto?> UpdateAsync(
        Guid tenantId, Guid userId, Guid actorUserId, UpdateTenantUserRequest request, CancellationToken ct)
    {
        var displayName = RequireDisplayName(request.DisplayName);
        var roles = NormalizeRoles(request.RoleCodes);
        var branches = NormalizeBranches(request.BranchIds);
        var (isActive, lockoutUntilUtc) = ResolveStatus(request);

        try
        {
            var row = await repository.UpdateAsync(
                tenantId,
                userId,
                displayName,
                isActive,
                lockoutUntilUtc,
                ToCsv(roles),
                ToCsv(branches),
                actorUserId,
                ct);

            if (!isActive || lockoutUntilUtc is not null)
                await authRepository.RevokeAllRefreshTokensForUserAsync(tenantId, userId, ct);

            return Map(row);
        }
        catch (KeyNotFoundException)
        {
            return null;
        }
    }

    public async Task SoftDeleteAsync(Guid tenantId, Guid userId, Guid actorUserId, CancellationToken ct)
    {
        await repository.SoftDeleteAsync(tenantId, userId, actorUserId, ct);
        await authRepository.RevokeAllRefreshTokensForUserAsync(tenantId, userId, ct);
    }

    public async Task SetPasswordAsync(
        Guid tenantId, Guid userId, Guid actorUserId, SetTenantUserPasswordRequest request, CancellationToken ct)
    {
        RequirePassword(request.NewPassword);
        var hash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await repository.SetPasswordAsync(tenantId, userId, hash, actorUserId, ct);
        await authRepository.RevokeAllRefreshTokensForUserAsync(tenantId, userId, ct);
    }

    private static TenantUserDto Map(TenantUserRow row)
    {
        var locked = row.IsLockedOut
            || (row.LockoutUntilUtc is { } until && until > DateTime.UtcNow);
        var status = locked
            ? TenantUserStatuses.Bloqueado
            : row.IsActive
                ? TenantUserStatuses.Activo
                : TenantUserStatuses.Inactivo;

        return new TenantUserDto
        {
            UserId = row.UserId,
            TenantId = row.TenantId,
            UserName = row.UserName,
            DisplayName = row.DisplayName,
            IsActive = row.IsActive,
            IsSuperAdmin = row.IsSuperAdmin,
            IsLockedOut = locked,
            Status = status,
            RoleCodes = SplitCsv(row.RoleCodesCsv),
            BranchIds = SplitGuids(row.BranchIdsCsv),
            HealthcareProfessionalId = row.HealthcareProfessionalId,
            ProfessionalDisplayName = Norm(row.ProfessionalDisplayName),
            ProfessionalLicense = Norm(row.ProfessionalLicense),
            SpecialtyName = Norm(row.SpecialtyName),
            LastAccessUtc = row.LastAccessUtc,
            LockoutUntilUtc = row.LockoutUntilUtc,
            CreatedAtUtc = row.CreatedAtUtc,
            UpdatedAtUtc = row.UpdatedAtUtc
        };
    }

    private static (bool IsActive, DateTime? LockoutUntilUtc) ResolveStatus(UpdateTenantUserRequest request)
    {
        var raw = (request.Status ?? "").Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(raw))
        {
            return request.IsActive ? (true, null) : (false, null);
        }

        return raw switch
        {
            TenantUserStatuses.Activo => (true, null),
            TenantUserStatuses.Inactivo => (false, null),
            TenantUserStatuses.Bloqueado => (true, new DateTime(2099, 1, 1, 0, 0, 0, DateTimeKind.Utc)),
            _ => throw new ArgumentException("Estado de usuario no reconocido (activo|inactivo|bloqueado).")
        };
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string RequireUserName(string? value)
    {
        var trimmed = (value ?? "").Trim();
        if (trimmed.Length is < 3 or > 128)
            throw new ArgumentException("El nombre de acceso debe tener entre 3 y 128 caracteres.");
        return trimmed;
    }

    private static string RequireDisplayName(string? value)
    {
        var trimmed = (value ?? "").Trim();
        if (trimmed.Length is < 2 or > 200)
            throw new ArgumentException("El nombre para mostrar debe tener entre 2 y 200 caracteres.");
        return trimmed;
    }

    private static void RequirePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            throw new ArgumentException("La contraseña debe tener al menos 8 caracteres.");
    }

    private static IReadOnlyList<string> NormalizeRoles(IReadOnlyList<string>? roles)
    {
        var list = (roles ?? [])
            .Select(r => r.Trim())
            .Where(r => r.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (list.Count == 0)
            throw new ArgumentException("Asigne al menos un rol.");

        if (list.Any(r => ForbiddenRoleCodes.Contains(r)))
            throw new ArgumentException("No se puede asignar el rol de plataforma SuperAdmin desde el admin de tenant.");

        return list;
    }

    private static IReadOnlyList<Guid> NormalizeBranches(IReadOnlyList<Guid>? branches) =>
        (branches ?? []).Where(b => b != Guid.Empty).Distinct().ToList();

    private static string? ToCsv(IReadOnlyList<string> values) =>
        values.Count == 0 ? null : string.Join(',', values);

    private static string? ToCsv(IReadOnlyList<Guid> values) =>
        values.Count == 0 ? null : string.Join(',', values);

    private static IReadOnlyList<string> SplitCsv(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static IReadOnlyList<Guid> SplitGuids(string? csv) =>
        SplitCsv(csv)
            .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList();
}
