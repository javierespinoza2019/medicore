using MediCore.DataAccess.Professional;
using MediCore.Models.Professional;

namespace MediCore.Business.Professional;

public interface IProfessionalService
{
    Task<IReadOnlyList<ProfessionalDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct);
    Task<ProfessionalDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct);
    Task<ProfessionalDto> CreateAsync(
        Guid tenantId, Guid actorUserId, CreateProfessionalRequest request, CancellationToken ct);
    Task<ProfessionalDto?> UpdateAsync(
        Guid tenantId, Guid id, Guid actorUserId, UpdateProfessionalRequest request, CancellationToken ct);
    Task<bool> SoftDeleteAsync(Guid tenantId, Guid id, Guid actorUserId, CancellationToken ct);
}

public sealed class ProfessionalService(IHealthcareProfessionalRepository repository) : IProfessionalService
{
    public Task<IReadOnlyList<ProfessionalDto>> ListAsync(
        Guid tenantId, bool onlyActive, string? search, CancellationToken ct) =>
        repository.ListAsync(tenantId, onlyActive, search, ct);

    public async Task<ProfessionalDto?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken ct)
    {
        var row = await repository.GetByIdAsync(tenantId, id, ct);
        if (row is null)
            return null;
        return new ProfessionalDto
        {
            HealthcareProfessionalId = row.HealthcareProfessionalId,
            TenantId = row.TenantId,
            UserId = row.UserId,
            FullName = row.FullName,
            ProfessionalLicense = row.ProfessionalLicense,
            SpecialtyId = row.SpecialtyId,
            SpecialtyName = row.SpecialtyName,
            IsActive = row.IsActive,
            CreatedAtUtc = row.CreatedAtUtc,
            UpdatedAtUtc = row.UpdatedAtUtc
        };
    }

    public async Task<ProfessionalDto> CreateAsync(
        Guid tenantId, Guid actorUserId, CreateProfessionalRequest request, CancellationToken ct)
    {
        ValidateName(request.FullName);
        ValidateLicense(request.ProfessionalLicense);

        var id = request.HealthcareProfessionalId is { } given && given != Guid.Empty
            ? given
            : Guid.NewGuid();

        var normalized = new CreateProfessionalRequest
        {
            HealthcareProfessionalId = id,
            UserId = request.UserId,
            FullName = request.FullName.Trim(),
            ProfessionalLicense = NormalizeOptional(request.ProfessionalLicense),
            SpecialtyId = request.SpecialtyId,
            IsActive = request.IsActive
        };

        var created = await repository.CreateAsync(tenantId, id, actorUserId, normalized, ct)
            ?? throw new InvalidOperationException("No se pudo crear el profesional.");
        return created;
    }

    public Task<ProfessionalDto?> UpdateAsync(
        Guid tenantId, Guid id, Guid actorUserId, UpdateProfessionalRequest request, CancellationToken ct)
    {
        ValidateName(request.FullName);
        if (!request.ClearProfessionalLicense)
            ValidateLicense(request.ProfessionalLicense);

        var clearLicense = request.ClearProfessionalLicense
            || (request.ProfessionalLicense is not null && string.IsNullOrWhiteSpace(request.ProfessionalLicense));

        var normalized = new UpdateProfessionalRequest
        {
            UserId = request.UserId,
            ClearUserId = request.ClearUserId,
            FullName = request.FullName.Trim(),
            ProfessionalLicense = clearLicense ? null : NormalizeOptional(request.ProfessionalLicense),
            ClearProfessionalLicense = clearLicense,
            SpecialtyId = request.SpecialtyId,
            ClearSpecialtyId = request.ClearSpecialtyId,
            IsActive = request.IsActive
        };

        return repository.UpdateAsync(tenantId, id, actorUserId, normalized, ct);
    }

    public async Task<bool> SoftDeleteAsync(
        Guid tenantId, Guid id, Guid actorUserId, CancellationToken ct)
    {
        var rows = await repository.SoftDeleteAsync(tenantId, id, actorUserId, ct);
        return rows > 0;
    }

    private static void ValidateName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("El nombre completo del profesional es obligatorio.");
        if (fullName.Trim().Length > 200)
            throw new ArgumentException("El nombre no puede exceder 200 caracteres.");
    }

    private static void ValidateLicense(string? license)
    {
        if (license is null)
            return;
        var t = license.Trim();
        if (t.Length == 0)
            return;
        if (t.Length > 64)
            throw new ArgumentException("La cédula no puede exceder 64 caracteres.");
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public interface ISpecialtyService
{
    Task<IReadOnlyList<SpecialtyDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct);
    Task<SpecialtyDto?> GetByIdAsync(Guid tenantId, Guid specialtyId, CancellationToken ct);
    Task<SpecialtyDto> UpsertAsync(
        Guid tenantId, Guid specialtyId, UpsertSpecialtyRequest request, CancellationToken ct);
    Task<bool> SoftDeleteAsync(Guid tenantId, Guid specialtyId, CancellationToken ct);
}

public sealed class SpecialtyService(ISpecialtyRepository repository) : ISpecialtyService
{
    public Task<IReadOnlyList<SpecialtyDto>> ListAsync(
        Guid tenantId, bool onlyActive, CancellationToken ct) =>
        repository.ListAsync(tenantId, onlyActive, ct);

    public Task<SpecialtyDto?> GetByIdAsync(Guid tenantId, Guid specialtyId, CancellationToken ct) =>
        repository.GetByIdAsync(tenantId, specialtyId, ct);

    public async Task<SpecialtyDto> UpsertAsync(
        Guid tenantId, Guid specialtyId, UpsertSpecialtyRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("El código de especialidad es obligatorio.");
        if (request.Code.Trim().Length > 64)
            throw new ArgumentException("El código no puede exceder 64 caracteres.");
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre de especialidad es obligatorio.");
        if (request.Name.Trim().Length > 200)
            throw new ArgumentException("El nombre no puede exceder 200 caracteres.");

        var normalized = new UpsertSpecialtyRequest
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            IsActive = request.IsActive
        };

        return await repository.UpsertAsync(tenantId, specialtyId, normalized, ct)
            ?? throw new InvalidOperationException("No se pudo guardar la especialidad.");
    }

    public async Task<bool> SoftDeleteAsync(Guid tenantId, Guid specialtyId, CancellationToken ct)
    {
        var rows = await repository.SoftDeleteAsync(tenantId, specialtyId, ct);
        return rows > 0;
    }
}

/// <summary>
/// AuthZ provisional (pregunta A / #19): lectura clínica; escritura admin.
/// </summary>
public static class ProfessionalAccess
{
    public static bool CanRead(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin)
            return true;
        foreach (var role in roles)
        {
            if (role.Equals("admin", StringComparison.OrdinalIgnoreCase)
                || role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)
                || role.Equals("medico", StringComparison.OrdinalIgnoreCase)
                || role.Equals("enfermeria", StringComparison.OrdinalIgnoreCase)
                || role.Equals("recepcion", StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    public static bool CanManage(bool isSuperAdmin, IEnumerable<string> roles)
    {
        if (isSuperAdmin)
            return true;
        foreach (var role in roles)
        {
            if (role.Equals("admin", StringComparison.OrdinalIgnoreCase)
                || role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}
