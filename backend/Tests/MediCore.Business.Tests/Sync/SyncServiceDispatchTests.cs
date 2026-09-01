using MediCore.Business.Sync;
using MediCore.DataAccess.Sync;
using MediCore.Models.Sync;

namespace MediCore.Business.Tests.Sync;

public sealed class SyncServiceDispatchTests
{
    [Fact]
    public async Task Accept_sin_handler_registra_solo_idempotencia()
    {
        var repo = new FakeSyncRepo();
        var registry = new SyncCommandRegistry([]);
        var svc = new SyncService(repo, registry);

        var result = await svc.AcceptAsync(
            Guid.NewGuid(), Guid.NewGuid(), null,
            new SyncEnvelopeRequest
            {
                IdempotencyKey = "idem-1",
                CommandType = "e2e.contract.noop",
                PayloadJson = "{}",
                OccurredAtUtc = DateTimeOffset.UtcNow
            },
            CancellationToken.None);

        Assert.Equal("accepted", result.Status);
        Assert.NotNull(result.ServerEntityId);
        Assert.Empty(repo.LastClinical ?? []);
        Assert.Null(repo.LastOutboxChannel);
    }

    [Fact]
    public async Task Accept_con_handler_Full_pasa_procedimientos_a_repo()
    {
        var repo = new FakeSyncRepo();
        var registry = new SyncCommandRegistry([new StubHandler()]);
        var svc = new SyncService(repo, registry);

        var result = await svc.AcceptAsync(
            Guid.NewGuid(), Guid.NewGuid(), null,
            new SyncEnvelopeRequest
            {
                IdempotencyKey = "idem-2",
                CommandType = "stub.cmd",
                PayloadJson = "{}",
                OccurredAtUtc = DateTimeOffset.UtcNow
            },
            CancellationToken.None);

        Assert.Equal("accepted", result.Status);
        Assert.Equal("entity-1", result.ServerEntityId);
        Assert.NotNull(repo.LastClinical);
        Assert.Single(repo.LastClinical!);
        Assert.Equal("sp_Stub", repo.LastClinical![0].ProcedureName);
    }

    [Fact]
    public async Task Accept_dgis_encola_outbox()
    {
        var repo = new FakeSyncRepo();
        var registry = new SyncCommandRegistry([]);
        var svc = new SyncService(repo, registry);

        _ = await svc.AcceptAsync(
            Guid.NewGuid(), Guid.NewGuid(), null,
            new SyncEnvelopeRequest
            {
                IdempotencyKey = "idem-dgis",
                CommandType = "dgis.report",
                PayloadJson = "{}",
                OccurredAtUtc = DateTimeOffset.UtcNow
            },
            CancellationToken.None);

        Assert.Equal("dgis", repo.LastOutboxChannel);
    }

    [Fact]
    public async Task Accept_partial_handler_propaga_400_ArgumentException()
    {
        var repo = new FakeSyncRepo();
        var registry = new SyncCommandRegistry([new PartialStub()]);
        var svc = new SyncService(repo, registry);

        await Assert.ThrowsAsync<ArgumentException>(() => svc.AcceptAsync(
            Guid.NewGuid(), Guid.NewGuid(), null,
            new SyncEnvelopeRequest
            {
                IdempotencyKey = "idem-p",
                CommandType = "partial.cmd",
                PayloadJson = "{}",
                OccurredAtUtc = DateTimeOffset.UtcNow
            },
            CancellationToken.None));

        Assert.False(repo.WasCalled);
    }

    private sealed class StubHandler : ISyncCommandHandler
    {
        public IReadOnlyCollection<string> CommandTypes { get; } = ["stub.cmd"];
        public SyncCommandSupport Support => SyncCommandSupport.Full;

        public Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct) =>
            Task.FromResult(new SyncCommandPlan
            {
                ServerEntityId = "entity-1",
                ClinicalProcedures =
                [
                    new SyncProcedureCall { ProcedureName = "sp_Stub", Parameters = new { X = 1 } }
                ]
            });
    }

    private sealed class PartialStub : ISyncCommandHandler
    {
        public IReadOnlyCollection<string> CommandTypes { get; } = ["partial.cmd"];
        public SyncCommandSupport Support => SyncCommandSupport.Partial;

        public Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct) =>
            throw new ArgumentException("soporte parcial de prueba");
    }

    private sealed class FakeSyncRepo : ISyncRepository
    {
        public bool WasCalled { get; private set; }
        public IReadOnlyList<SyncProcedureCall>? LastClinical { get; private set; }
        public string? LastOutboxChannel { get; private set; }

        public Task<IdempotencyRow?> GetIdempotencyAsync(Guid tenantId, string idempotencyKey, CancellationToken ct) =>
            Task.FromResult<IdempotencyRow?>(null);

        public Task<SyncRegistrationResult> RegisterCommandAsync(
            Guid tenantId,
            string idempotencyKey,
            string commandType,
            string payloadHash,
            string responseJson,
            IReadOnlyList<SyncProcedureCall>? clinicalProcedures,
            string? outboxChannel,
            string? outboxPayloadJson,
            CancellationToken ct)
        {
            WasCalled = true;
            LastClinical = clinicalProcedures;
            LastOutboxChannel = outboxChannel;
            return Task.FromResult(new SyncRegistrationResult
            {
                Outcome = SyncRegistrationResult.Created,
                CommandType = commandType,
                ResponseJson = responseJson
            });
        }
    }
}
