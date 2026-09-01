using MediCore.DataAccess.Tenant;
using MediCore.Models.Tenant;

namespace MediCore.Business.Tenant;

public interface IBranchService
{
    Task<IReadOnlyList<BranchDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct);
    Task<BranchDto?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken ct);
    Task<BranchDto?> UpsertAsync(
        Guid tenantId,
        Guid branchId,
        Guid actorUserId,
        UpsertBranchRequest request,
        CancellationToken ct);
}

public sealed class BranchService(IBranchRepository branchRepository) : IBranchService
{
    public Task<IReadOnlyList<BranchDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct) =>
        branchRepository.ListAsync(tenantId, onlyActive, ct);

    public Task<BranchDto?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken ct) =>
        branchRepository.GetByIdAsync(tenantId, branchId, ct);

    public Task<BranchDto?> UpsertAsync(
        Guid tenantId,
        Guid branchId,
        Guid actorUserId,
        UpsertBranchRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("El código de sucursal es obligatorio.");
        if (request.Code.Trim().Length > 64)
            throw new ArgumentException("El código de sucursal no puede exceder 64 caracteres.");
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre de sucursal es obligatorio.");
        if (request.Name.Trim().Length > 200)
            throw new ArgumentException("El nombre de sucursal no puede exceder 200 caracteres.");

        // FacilityType / HasEmergencyService: se aceptan null (pregunta abierta L).
        // No se inventa «consultorio general» ni se asume urgencias.

        var normalized = new UpsertBranchRequest
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            FacilityType = NormalizeOptional(request.FacilityType),
            LegalName = NormalizeOptional(request.LegalName),
            AddressStreet = NormalizeOptional(request.AddressStreet),
            AddressNumber = NormalizeOptional(request.AddressNumber),
            AddressNeighborhood = NormalizeOptional(request.AddressNeighborhood),
            AddressMunicipality = NormalizeOptional(request.AddressMunicipality),
            AddressState = NormalizeOptional(request.AddressState),
            AddressPostalCode = NormalizeOptional(request.AddressPostalCode),
            PhoneNumber = NormalizeOptional(request.PhoneNumber),
            HealthLicense = NormalizeOptional(request.HealthLicense),
            ResponsiblePhysicianProfessionalId = request.ResponsiblePhysicianProfessionalId,
            TimeZoneId = NormalizeOptional(request.TimeZoneId),
            HasEmergencyService = request.HasEmergencyService,
            IsActive = request.IsActive
        };

        return branchRepository.UpsertAsync(tenantId, branchId, actorUserId, normalized, ct);
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
