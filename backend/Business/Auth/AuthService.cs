using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MediCore.Common;
using MediCore.Business.Role;
using MediCore.DataAccess.Auth;
using MediCore.Models.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MediCore.Business.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "MediCore";
    public string Audience { get; set; } = "MediCore";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 14;
}

public sealed class AuthSession
{
    public LoginResultDto Login { get; set; } = new();
    public string RefreshTokenPlain { get; set; } = string.Empty;
}

public interface IAuthService
{
    Task<AuthSession?> LoginAsync(LoginRequest request, CancellationToken ct);
    Task<AuthSession?> RefreshAsync(string refreshTokenPlain, CancellationToken ct);
    Task<bool> LogoutAsync(Guid tenantId, Guid userId, string? refreshTokenPlain, CancellationToken ct);
    /// <summary>Revoca todas las sesiones del usuario (#75). No se usa en logout ordinario (#73).</summary>
    Task RevokeAllSessionsAsync(Guid tenantId, Guid userId, CancellationToken ct);
    Task<bool> ChangePasswordAsync(Guid tenantId, Guid userId, ChangePasswordRequest request, CancellationToken ct);
    Task<LoginResultDto?> GetSessionSnapshotAsync(Guid tenantId, Guid userId, CancellationToken ct);
}

public sealed class AuthService(
    IAuthRepository authRepository,
    IEffectivePermissionService effectivePermissionService,
    IOptions<JwtOptions> jwtOptions) : IAuthService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public async Task<AuthSession?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.TenantCode) ||
            string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.Password))
            return null;

        var user = await authRepository.GetUserForLoginAsync(request.TenantCode.Trim(), request.UserName.Trim(), ct);
        if (user is null || !user.IsActive)
            return null;

        if (user.LockoutUntilUtc is { } until && until > DateTimeOffset.UtcNow)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            var fails = user.FailedLoginCount + 1;
            DateTimeOffset? lockout = fails >= 5 ? DateTimeOffset.UtcNow.AddMinutes(15) : null;
            await authRepository.UpdateLoginFailureAsync(user.TenantId, user.UserId, fails, lockout, ct);
            return null;
        }

        await authRepository.ResetLoginFailureAsync(user.TenantId, user.UserId, ct);
        return await IssueSessionAsync(user, ct);
    }

    public async Task<AuthSession?> RefreshAsync(string refreshTokenPlain, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenPlain))
            return null;

        var hash = HashToken(refreshTokenPlain);
        var row = await authRepository.GetRefreshTokenAsync(hash, ct);
        if (row is null || row.RevokedAtUtc is not null || row.ExpiresAtUtc <= DateTimeOffset.UtcNow)
            return null;

        await authRepository.RevokeRefreshTokenAsync(row.RefreshTokenId, row.TenantId, row.UserId, ct);

        var user = await authRepository.GetUserByIdAsync(row.TenantId, row.UserId, ct);
        if (user is null || !user.IsActive)
            return null;

        return await IssueSessionAsync(user, ct);
    }

    /// <summary>
    /// Cierra únicamente la sesión del refresh token presentado (decisión 73, 2026-08-27):
    /// las demás estaciones del mismo usuario siguen trabajando. Devuelve false si no llegó
    /// una sesión vigente que cerrar; el llamador decide qué responder.
    /// </summary>
    public async Task<bool> LogoutAsync(Guid tenantId, Guid userId, string? refreshTokenPlain, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenPlain))
            return false;

        var row = await authRepository.GetRefreshTokenAsync(HashToken(refreshTokenPlain), ct);
        if (row is null || row.RevokedAtUtc is not null || row.TenantId != tenantId || row.UserId != userId)
            return false;

        return await authRepository.RevokeRefreshTokenAsync(row.RefreshTokenId, tenantId, userId, ct);
    }

    public Task RevokeAllSessionsAsync(Guid tenantId, Guid userId, CancellationToken ct) =>
        authRepository.RevokeAllRefreshTokensForUserAsync(tenantId, userId, ct);

    public async Task<bool> ChangePasswordAsync(
        Guid tenantId,
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return false;

        if (request.NewPassword.Length < 8)
            throw new ArgumentException("La nueva contraseña debe tener al menos 8 caracteres.");

        var user = await authRepository.GetUserByIdAsync(tenantId, userId, ct);
        if (user is null || !user.IsActive)
            return false;

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return false;

        var hash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        var updated = await authRepository.ChangePasswordAsync(tenantId, userId, hash, ct);
        if (!updated)
            return false;

        await authRepository.RevokeAllRefreshTokensForUserAsync(tenantId, userId, ct);
        return true;
    }

    public async Task<LoginResultDto?> GetSessionSnapshotAsync(Guid tenantId, Guid userId, CancellationToken ct)
    {
        var user = await authRepository.GetUserByIdAsync(tenantId, userId, ct);
        if (user is null || !user.IsActive)
            return null;

        var roles = SplitCsv(user.RoleCodesCsv);
        var branches = SplitCsv(user.BranchIdsCsv)
            .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList();
        var branchCodes = SplitCsv(user.BranchCodesCsv);

        var profesional = user.HealthcareProfessionalId is { } profesionalId
            ? new HealthcareProfessionalSessionDto
            {
                HealthcareProfessionalId = profesionalId,
                ProfessionalLicense = Normalizar(user.ProfessionalLicense),
                Specialty = Normalizar(user.SpecialtyName)
            }
            : null;

        var (permissions, grants) = await LoadPermissionsAsync(user, ct);

        return new LoginResultDto
        {
            UserId = user.UserId,
            TenantId = user.TenantId,
            DisplayName = user.DisplayName,
            ExpiresInSeconds = _jwt.AccessTokenMinutes * 60,
            Roles = roles,
            BranchIds = branches,
            BranchCodes = branchCodes,
            HealthcareProfessional = profesional,
            Permissions = permissions,
            BreakGlassGrants = grants
        };
    }

    private async Task<AuthSession> IssueSessionAsync(UserAuthRow user, CancellationToken ct)
    {
        var roles = SplitCsv(user.RoleCodesCsv);
        var branches = SplitCsv(user.BranchIdsCsv)
            .Select(x => Guid.TryParse(x, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToList();
        var branchCodes = SplitCsv(user.BranchCodesCsv);

        // El profesional viene del servidor o no viene. Si el usuario no tiene profesional
        // asociado, esto queda en null y así viaja al cliente: nunca se sustituye por un
        // identificador inventado ni por el del usuario.
        var profesional = user.HealthcareProfessionalId is { } profesionalId
            ? new HealthcareProfessionalSessionDto
            {
                HealthcareProfessionalId = profesionalId,
                ProfessionalLicense = Normalizar(user.ProfessionalLicense),
                Specialty = Normalizar(user.SpecialtyName)
            }
            : null;

        var (permissions, grants) = await LoadPermissionsAsync(user, ct);

        var access = CreateAccessToken(user, roles, branches);
        var refreshPlain = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshHash = HashToken(refreshPlain);
        var refreshExp = DateTimeOffset.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await authRepository.SaveRefreshTokenAsync(user.TenantId, user.UserId, refreshHash, refreshExp, ct);

        return new AuthSession
        {
            RefreshTokenPlain = refreshPlain,
            Login = new LoginResultDto
            {
                UserId = user.UserId,
                TenantId = user.TenantId,
                DisplayName = user.DisplayName,
                AccessToken = access,
                ExpiresInSeconds = _jwt.AccessTokenMinutes * 60,
                Roles = roles,
                BranchIds = branches,
                BranchCodes = branchCodes,
                HealthcareProfessional = profesional,
                Permissions = permissions,
                BreakGlassGrants = grants
            }
        };
    }

    private async Task<(IReadOnlyDictionary<string, bool> Permissions, IReadOnlyList<BreakGlassGrantDto> Grants)>
        LoadPermissionsAsync(UserAuthRow user, CancellationToken ct)
    {
        var roles = SplitCsv(user.RoleCodesCsv);
        var permissions = await effectivePermissionService.GetForUserAsync(
            user.TenantId, user.UserId, user.IsSuperAdmin, roles, ct);
        var grants = await effectivePermissionService.GetActiveBreakGlassGrantsAsync(
            user.TenantId, user.UserId, ct);
        return (permissions, grants);
    }

    private string CreateAccessToken(UserAuthRow user, IReadOnlyList<string> roles, IReadOnlyList<Guid> branches)
    {
        if (string.IsNullOrWhiteSpace(_jwt.SigningKey) || _jwt.SigningKey.Length < 32)
            throw new InvalidOperationException("Jwt:SigningKey debe tener al menos 32 caracteres.");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(MediCoreClaims.TenantId, user.TenantId.ToString()),
            new(MediCoreClaims.IsSuperAdmin, user.IsSuperAdmin ? "true" : "false")
        };

        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        if (branches.Count > 0)
            claims.Add(new Claim(MediCoreClaims.BranchIds, string.Join(',', branches)));

        if (user.HealthcareProfessionalId is { } profesionalId)
            claims.Add(new Claim(MediCoreClaims.HealthcareProfessionalId, profesionalId.ToString()));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashToken(string plain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plain));
        return Convert.ToHexString(bytes);
    }

    /// <summary>Cadena vacía o de espacios significa «no capturado»: se reporta como null.</summary>
    private static string? Normalizar(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static IReadOnlyList<string> SplitCsv(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
