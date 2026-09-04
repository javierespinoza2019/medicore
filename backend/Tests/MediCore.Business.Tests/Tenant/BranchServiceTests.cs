using MediCore.Business.Tenant;
using MediCore.DataAccess.Tenant;
using MediCore.Models.Tenant;

namespace MediCore.Business.Tests.Tenant;

/// <summary>
/// Validaciones de sucursal (M11). La integración real de SPs y el aislamiento
/// multi-tenant se verifican en contrato de API (`tests/e2e`).
/// </summary>
public sealed class BranchServiceTests
{
    [Fact]
    public async Task Upsert_rechaza_codigo_vacio()
    {
        var svc = new BranchService(new RepoFalso());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.UpsertAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                new UpsertBranchRequest { Code = "  ", Name = "Central" },
                default));
    }

    [Fact]
    public async Task Upsert_rechaza_nombre_vacio()
    {
        var svc = new BranchService(new RepoFalso());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.UpsertAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                new UpsertBranchRequest { Code = "CENTRAL", Name = "" },
                default));
    }

    [Fact]
    public async Task Upsert_normaliza_vacios_a_null_sin_inventar_domicilio()
    {
        var repo = new RepoFalso();
        var svc = new BranchService(repo);
        var branchId = Guid.NewGuid();

        await svc.UpsertAsync(
            Guid.NewGuid(),
            branchId,
            Guid.NewGuid(),
            new UpsertBranchRequest
            {
                Code = " NORTE ",
                Name = " Sucursal Norte ",
                AddressStreet = "   ",
                FacilityType = null,
                HasEmergencyService = null,
                IsActive = true
            },
            default);

        Assert.NotNull(repo.UltimoRequest);
        Assert.Equal("NORTE", repo.UltimoRequest!.Code);
        Assert.Equal("Sucursal Norte", repo.UltimoRequest.Name);
        Assert.Null(repo.UltimoRequest.AddressStreet);
        Assert.Null(repo.UltimoRequest.FacilityType);
        Assert.Null(repo.UltimoRequest.HasEmergencyService);
    }

    [Fact]
    public async Task Upsert_preserva_null_de_FacilityType_y_HasEmergencyService()
    {
        var repo = new RepoFalso();
        var svc = new BranchService(repo);

        await svc.UpsertAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            new UpsertBranchRequest
            {
                Code = "SUR",
                Name = "Sur",
                FacilityType = null,
                HasEmergencyService = null
            },
            default);

        Assert.Null(repo.UltimoRequest!.FacilityType);
        Assert.Null(repo.UltimoRequest.HasEmergencyService);
    }

    private sealed class RepoFalso : IBranchRepository
    {
        public UpsertBranchRequest? UltimoRequest { get; private set; }

        public Task<IReadOnlyList<BranchDto>> ListAsync(Guid tenantId, bool onlyActive, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BranchDto>>([]);

        public Task<BranchDto?> GetByIdAsync(Guid tenantId, Guid branchId, CancellationToken ct) =>
            Task.FromResult<BranchDto?>(null);

        public Task<BranchDto?> UpsertAsync(
            Guid tenantId,
            Guid branchId,
            Guid actorUserId,
            UpsertBranchRequest request,
            CancellationToken ct)
        {
            UltimoRequest = request;
            return Task.FromResult<BranchDto?>(new BranchDto
            {
                BranchId = branchId,
                TenantId = tenantId,
                Code = request.Code,
                Name = request.Name,
                FacilityType = request.FacilityType,
                HasEmergencyService = request.HasEmergencyService,
                IsActive = request.IsActive
            });
        }

        public Task<BranchDto?> SetLogoPathAsync(
            Guid tenantId,
            Guid branchId,
            Guid actorUserId,
            string? logoRelativePath,
            CancellationToken ct) =>
            Task.FromResult<BranchDto?>(null);
    }
}
