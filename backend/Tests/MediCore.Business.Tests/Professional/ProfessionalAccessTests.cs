using MediCore.Business.Professional;

namespace MediCore.Business.Tests.Professional;

public sealed class ProfessionalAccessTests
{
    [Fact]
    public void CanRead_roles_clinicos_y_admin()
    {
        Assert.True(ProfessionalAccess.CanRead(true, ["caja"]));
        Assert.True(ProfessionalAccess.CanRead(false, ["admin"]));
        Assert.True(ProfessionalAccess.CanRead(false, ["medico"]));
        Assert.True(ProfessionalAccess.CanRead(false, ["enfermeria"]));
        Assert.True(ProfessionalAccess.CanRead(false, ["recepcion"]));
        Assert.False(ProfessionalAccess.CanRead(false, ["caja"]));
    }

    [Fact]
    public void CanManage_solo_admin()
    {
        Assert.True(ProfessionalAccess.CanManage(true, ["medico"]));
        Assert.True(ProfessionalAccess.CanManage(false, ["admin"]));
        Assert.False(ProfessionalAccess.CanManage(false, ["medico"]));
        Assert.False(ProfessionalAccess.CanManage(false, ["enfermeria", "recepcion"]));
    }

    [Fact]
    public async Task Create_rechaza_nombre_vacio()
    {
        var svc = new ProfessionalService(new RepoStub());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(Guid.NewGuid(), Guid.NewGuid(), new Models.Professional.CreateProfessionalRequest
            {
                FullName = "  "
            }, CancellationToken.None));
    }

    [Fact]
    public async Task Specialty_upsert_rechaza_codigo_vacio()
    {
        var svc = new SpecialtyService(new SpecialtyStub());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.UpsertAsync(Guid.NewGuid(), Guid.NewGuid(), new Models.Professional.UpsertSpecialtyRequest
            {
                Code = "",
                Name = "Cardiología"
            }, CancellationToken.None));
    }

    private sealed class RepoStub : DataAccess.Professional.IHealthcareProfessionalRepository
    {
        public Task<Models.Auth.HealthcareProfessionalRow?> GetByUserAsync(
            Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<Models.Auth.HealthcareProfessionalRow?>(null);

        public Task<Models.Auth.HealthcareProfessionalRow?> GetByIdAsync(
            Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct) =>
            Task.FromResult<Models.Auth.HealthcareProfessionalRow?>(null);

        public Task<Models.Professional.ProfessionalDto?> GetDtoByIdAsync(
            Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct) =>
            Task.FromResult<Models.Professional.ProfessionalDto?>(null);

        public Task<IReadOnlyList<Models.Professional.ProfessionalDto>> ListAsync(
            Guid tenantId, bool onlyActive, string? search, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Models.Professional.ProfessionalDto>>([]);

        public Task<Models.Professional.ProfessionalDto?> CreateAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
            Models.Professional.CreateProfessionalRequest request, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<Models.Professional.ProfessionalDto?> UpdateAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
            Models.Professional.UpdateProfessionalRequest request, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<int> SoftDeleteAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId, CancellationToken ct) =>
            Task.FromResult(0);
    }

    private sealed class SpecialtyStub : DataAccess.Professional.ISpecialtyRepository
    {
        public Task<IReadOnlyList<Models.Professional.SpecialtyDto>> ListAsync(
            Guid tenantId, bool onlyActive, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Models.Professional.SpecialtyDto>>([]);

        public Task<Models.Professional.SpecialtyDto?> GetByIdAsync(
            Guid tenantId, Guid specialtyId, CancellationToken ct) =>
            Task.FromResult<Models.Professional.SpecialtyDto?>(null);

        public Task<Models.Professional.SpecialtyDto?> UpsertAsync(
            Guid tenantId, Guid specialtyId, Models.Professional.UpsertSpecialtyRequest request,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<int> SoftDeleteAsync(Guid tenantId, Guid specialtyId, CancellationToken ct) =>
            Task.FromResult(0);
    }
}
