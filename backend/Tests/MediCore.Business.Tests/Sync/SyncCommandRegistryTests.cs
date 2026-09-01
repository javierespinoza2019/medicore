using MediCore.Business.Sync;
using MediCore.Business.Sync.Handlers;
using MediCore.Models.Sync;

namespace MediCore.Business.Tests.Sync;

public sealed class SyncCommandRegistryTests
{
    private static SyncCommandRegistry BuildRegistry()
    {
        // Handlers Full reales sin I/O + stubs Full para los que requieren repos.
        return new SyncCommandRegistry(
        [
            new EncounterOpenSyncCommandHandler(),
            new AppointmentSyncCommandHandler(new FakeProfessionalRepo()),
            new PartialSupportSyncCommandHandler(),
            new FakeFullHandler("subject.create"),
            new FakeFullHandler("encounter.admission"),
            new FakeFullHandler("encounter.state"),
            new FakeFullHandler("encounter.mpNotice"),
            new FakeFullHandler("encounter.careWithoutConsent"),
            new FakeFullHandler("encounter.assignProfessional"),
            new FakeFullHandler("triage.save"),
            new FakeFullHandler("triage.reclassify"),
            new FakeFullHandler("vitals.append"),
            new FakeFullHandler("note.create"),
            new FakeFullHandler("note.sign"),
            new FakeFullHandler("note.addendum"),
            new FakeFullHandler("history.save"),
            new FakeFullHandler("history.amend"),
            new FakeFullHandler("allergyStatus.set"),
            new FakeFullHandler("allergy.add"),
            new FakeFullHandler("prescription.create"),
            new FakeFullHandler("prescription.sign")
        ]);
    }

    [Fact]
    public void Registra_tipos_documentados_M3_a_M9_como_Full()
    {
        var registry = BuildRegistry();

        Assert.True(registry.TryGet("subject.create", out var subject));
        Assert.Equal(SyncCommandSupport.Full, subject!.Support);

        Assert.True(registry.TryGet("encounter.open", out var open));
        Assert.Equal(SyncCommandSupport.Full, open!.Support);

        Assert.True(registry.TryGet("encounter.admission", out var admission));
        Assert.Equal(SyncCommandSupport.Full, admission!.Support);

        Assert.True(registry.TryGet("triage.save", out var triage));
        Assert.Equal(SyncCommandSupport.Full, triage!.Support);

        Assert.True(registry.TryGet("prescription.sign", out var rx));
        Assert.Equal(SyncCommandSupport.Full, rx!.Support);

        Assert.True(registry.TryGet("appointment.create", out var appt));
        Assert.Equal(SyncCommandSupport.Full, appt!.Support);

        Assert.True(registry.TryGet("appointment.state", out _));
        Assert.True(registry.TryGet("allergyStatus.set", out _));
        Assert.True(registry.TryGet("history.save", out _));
        Assert.True(registry.TryGet("note.create", out _));
        Assert.True(registry.TryGet("vitals.append", out _));
    }

    [Fact]
    public void TryGet_es_case_insensitive_y_desconocido_falla()
    {
        var registry = BuildRegistry();
        Assert.True(registry.TryGet("Encounter.Open", out _));
        Assert.False(registry.TryGet("e2e.contract.noop", out _));
        Assert.False(registry.TryGet("", out _));
    }

    [Fact]
    public void Duplicado_en_registro_lanza()
    {
        Assert.Throws<InvalidOperationException>(() =>
            new SyncCommandRegistry(
            [
                new EncounterOpenSyncCommandHandler(),
                new FakeFullHandler("encounter.open")
            ]));
    }

    [Fact]
    public async Task EncounterOpen_PlanAsync_exige_branch_y_subject()
    {
        var handler = new EncounterOpenSyncCommandHandler();
        var ctx = new SyncCommandContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Request = new SyncEnvelopeRequest
            {
                CommandType = "encounter.open",
                IdempotencyKey = "k",
                PayloadJson = """{"branchId":"00000000-0000-0000-0000-000000000000","subjectId":"00000000-0000-0000-0000-000000000000"}""",
                OccurredAtUtc = DateTimeOffset.UtcNow
            }
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => handler.PlanAsync(ctx, CancellationToken.None));
        Assert.Contains("branchId", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task EncounterOpen_PlanAsync_produce_sp_Encounter_Open()
    {
        var handler = new EncounterOpenSyncCommandHandler();
        var branchId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var subjectId = Guid.NewGuid();
        var ctx = new SyncCommandContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Request = new SyncEnvelopeRequest
            {
                CommandType = "encounter.open",
                IdempotencyKey = "k",
                PayloadJson = $$"""{"branchId":"{{branchId}}","subjectId":"{{subjectId}}","encounterType":"urgencias"}""",
                OccurredAtUtc = DateTimeOffset.UtcNow
            }
        };

        var plan = await handler.PlanAsync(ctx, CancellationToken.None);
        Assert.False(string.IsNullOrWhiteSpace(plan.ServerEntityId));
        Assert.Single(plan.ClinicalProcedures);
        Assert.Equal("sp_Encounter_Open", plan.ClinicalProcedures[0].ProcedureName);
    }

    [Fact]
    public async Task AppointmentCreate_PlanAsync_produce_sp_Appointment_Create()
    {
        var handler = new AppointmentSyncCommandHandler(new FakeProfessionalRepo());
        var branchId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var subjectId = Guid.NewGuid();
        var professionalId = Guid.NewGuid();
        var start = DateTimeOffset.UtcNow.AddHours(2);
        var end = start.AddMinutes(30);
        var ctx = new SyncCommandContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Request = new SyncEnvelopeRequest
            {
                CommandType = "appointment.create",
                IdempotencyKey = "k",
                PayloadJson = $$"""{"branchId":"{{branchId}}","subjectId":"{{subjectId}}","professionalId":"{{professionalId}}","scheduledStartUtc":"{{start:O}}","scheduledEndUtc":"{{end:O}}"}""",
                OccurredAtUtc = DateTimeOffset.UtcNow
            }
        };

        var plan = await handler.PlanAsync(ctx, CancellationToken.None);
        Assert.Single(plan.ClinicalProcedures);
        Assert.Equal("sp_Appointment_Create", plan.ClinicalProcedures[0].ProcedureName);
    }

    [Fact]
    public async Task AppointmentState_cancel_sin_motivo_falla()
    {
        var handler = new AppointmentSyncCommandHandler(new FakeProfessionalRepo());
        var ctx = new SyncCommandContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Request = new SyncEnvelopeRequest
            {
                CommandType = "appointment.state",
                IdempotencyKey = "k",
                PayloadJson = """{"appointmentId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","toState":"cancelada"}""",
                OccurredAtUtc = DateTimeOffset.UtcNow
            }
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => handler.PlanAsync(ctx, CancellationToken.None));
        Assert.Contains("motivo", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task EncounterAdmission_sin_encounterId_falla()
    {
        var handler = new EncounterCommandsSyncCommandHandler(new NoOpEncounterRepo());
        var ctx = new SyncCommandContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Request = new SyncEnvelopeRequest
            {
                CommandType = "encounter.admission",
                IdempotencyKey = "k",
                PayloadJson = """{"accessRoute":"caminando"}""",
                OccurredAtUtc = DateTimeOffset.UtcNow
            }
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => handler.PlanAsync(ctx, CancellationToken.None));
        Assert.Contains("encounterId", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeFullHandler(string commandType) : ISyncCommandHandler
    {
        public IReadOnlyCollection<string> CommandTypes { get; } = [commandType];
        public SyncCommandSupport Support => SyncCommandSupport.Full;

        public Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct) =>
            Task.FromResult(new SyncCommandPlan { ServerEntityId = Guid.NewGuid().ToString("D") });
    }

    private sealed class FakeProfessionalRepo : MediCore.DataAccess.Professional.IHealthcareProfessionalRepository
    {
        public Task<MediCore.Models.Auth.HealthcareProfessionalRow?> GetByUserAsync(
            Guid tenantId, Guid userId, CancellationToken ct) =>
            Task.FromResult<MediCore.Models.Auth.HealthcareProfessionalRow?>(null);

        public Task<MediCore.Models.Auth.HealthcareProfessionalRow?> GetByIdAsync(
            Guid tenantId, Guid healthcareProfessionalId, CancellationToken ct) =>
            Task.FromResult<MediCore.Models.Auth.HealthcareProfessionalRow?>(new MediCore.Models.Auth.HealthcareProfessionalRow
            {
                HealthcareProfessionalId = healthcareProfessionalId,
                TenantId = tenantId,
                FullName = "Dr. Prueba",
                ProfessionalLicense = "1234567",
                IsActive = true
            });

        public Task<IReadOnlyList<MediCore.Models.Professional.ProfessionalDto>> ListAsync(
            Guid tenantId, bool onlyActive, string? search, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<MediCore.Models.Professional.ProfessionalDto>>([]);

        public Task<MediCore.Models.Professional.ProfessionalDto?> CreateAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
            MediCore.Models.Professional.CreateProfessionalRequest request, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<MediCore.Models.Professional.ProfessionalDto?> UpdateAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId,
            MediCore.Models.Professional.UpdateProfessionalRequest request, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<int> SoftDeleteAsync(
            Guid tenantId, Guid healthcareProfessionalId, Guid? actorUserId, CancellationToken ct) =>
            Task.FromResult(0);
    }

    /// <summary>Solo para PlanAdmission (no llama al repo).</summary>
    private sealed class NoOpEncounterRepo : MediCore.DataAccess.Encounter.IEncounterRepository
    {
        public Task<MediCore.Models.Encounter.EncounterDto?> OpenAsync(
            Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, MediCore.Models.Encounter.OpenEncounterRequest request,
            CancellationToken ct) => throw new NotImplementedException();

        public Task<MediCore.Models.Encounter.EncounterDto?> GetByIdAsync(
            Guid tenantId, Guid encounterId, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<MediCore.Models.Encounter.EncounterDto>> ListQueueAsync(
            Guid tenantId, Guid branchId, bool includeClosed, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<IReadOnlyList<MediCore.Models.Encounter.EncounterDto>> ListBySubjectAsync(
            Guid tenantId, Guid subjectId, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<MediCore.Models.Encounter.EncounterDto?> UpdateAdmissionAsync(
            Guid tenantId, Guid encounterId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, MediCore.Models.Encounter.UpdateAdmissionRequest request,
            CancellationToken ct) => throw new NotImplementedException();

        public Task<MediCore.Models.Encounter.EncounterDto?> TransitionStateAsync(
            Guid tenantId, Guid encounterId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, MediCore.Models.Encounter.TransitionStateRequest request,
            CancellationToken ct) => throw new NotImplementedException();

        public Task<int> CountUnsignedPrescriptionsByEncounterAsync(
            Guid tenantId, Guid encounterId, CancellationToken ct) =>
            Task.FromResult(0);

        public Task<MediCore.Models.Encounter.EncounterDto?> AssignProfessionalAsync(
            Guid tenantId, Guid encounterId, Guid professionalId, Guid actorUserId,
            Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<MediCore.Models.Encounter.MpNoticeDto?> CreateMpNoticeAsync(
            Guid tenantId, Guid encounterId, Guid noticeId, Guid actorUserId,
            DateTimeOffset occurredAtUtc, MediCore.Models.Encounter.CreateMpNoticeRequest request,
            CancellationToken ct) => throw new NotImplementedException();

        public Task<MediCore.Models.Encounter.CareWithoutConsentDto?> CreateCareWithoutConsentAsync(
            Guid tenantId, Guid encounterId, Guid recordId, Guid actorUserId,
            DateTimeOffset occurredAtUtc, MediCore.Models.Encounter.CreateCareWithoutConsentRequest request,
            CancellationToken ct) => throw new NotImplementedException();
    }
}
