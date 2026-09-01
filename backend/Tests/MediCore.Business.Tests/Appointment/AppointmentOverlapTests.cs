using MediCore.Business.Appointment;
using MediCore.Models.Appointment;

namespace MediCore.Business.Tests.Appointment;

/// <summary>
/// Traslape de intervalos y fail-closed del filtro «mi agenda» (M9).
/// </summary>
public sealed class AppointmentOverlapTests
{
    [Theory]
    [InlineData("2026-08-28T10:00:00Z", "2026-08-28T10:30:00Z", "2026-08-28T10:15:00Z", "2026-08-28T10:45:00Z", true)]
    [InlineData("2026-08-28T10:00:00Z", "2026-08-28T10:30:00Z", "2026-08-28T10:30:00Z", "2026-08-28T11:00:00Z", false)]
    [InlineData("2026-08-28T10:00:00Z", "2026-08-28T10:30:00Z", "2026-08-28T09:00:00Z", "2026-08-28T10:00:00Z", false)]
    [InlineData("2026-08-28T10:00:00Z", "2026-08-28T11:00:00Z", "2026-08-28T10:15:00Z", "2026-08-28T10:45:00Z", true)]
    public void IntervalsOverlap_detecta_traslape_abierto(
        string aStart, string aEnd, string bStart, string bEnd, bool expected)
    {
        Assert.Equal(
            expected,
            AppointmentService.IntervalsOverlap(
                DateTimeOffset.Parse(aStart),
                DateTimeOffset.Parse(aEnd),
                DateTimeOffset.Parse(bStart),
                DateTimeOffset.Parse(bEnd)));
    }

    [Fact]
    public async Task ListByRange_mine_sin_profesional_en_sesion_devuelve_vacio()
    {
        var repo = new FakeRepo();
        var svc = new AppointmentService(repo);

        var list = await svc.ListByRangeAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddHours(8),
            filterProfessionalId: null,
            roomId: null,
            sessionProfessionalId: null,
            mineOnly: true,
            default);

        Assert.Empty(list);
        Assert.False(repo.ListCalled);
    }

    [Fact]
    public async Task ListByRange_mine_con_profesional_filtra_por_sesion()
    {
        var professional = Guid.Parse("66666666-6666-6666-6666-666666660001");
        var repo = new FakeRepo();
        var svc = new AppointmentService(repo);

        await svc.ListByRangeAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddHours(8),
            filterProfessionalId: Guid.NewGuid(), // se ignora si mine
            roomId: null,
            sessionProfessionalId: professional,
            mineOnly: true,
            default);

        Assert.True(repo.ListCalled);
        Assert.Equal(professional, repo.LastProfessionalFilter);
    }

    [Fact]
    public async Task ChangeState_cancelar_sin_motivo_falla()
    {
        var svc = new AppointmentService(new FakeRepo());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.ChangeStateAsync(
                Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null,
                new ChangeAppointmentStateRequest { ToState = "cancelada", Reason = "  " },
                default));
    }

    private sealed class FakeRepo : MediCore.DataAccess.Appointment.IAppointmentRepository
    {
        public bool ListCalled { get; private set; }
        public Guid? LastProfessionalFilter { get; private set; }

        public Task<IReadOnlyList<ConsultingRoomDto>> ListRoomsAsync(
            Guid tenantId, Guid? branchId, bool onlyActive, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<ConsultingRoomDto>>(Array.Empty<ConsultingRoomDto>());

        public Task<ConsultingRoomDto?> UpsertRoomAsync(
            Guid tenantId, Guid roomId, Guid actorUserId, UpsertConsultingRoomRequest request, CancellationToken ct) =>
            Task.FromResult<ConsultingRoomDto?>(null);

        public Task<AppointmentDto?> CreateAsync(
            Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, DateTimeOffset occurredAtUtc, CreateAppointmentRequest request,
            CancellationToken ct) =>
            Task.FromResult<AppointmentDto?>(null);

        public Task<AppointmentDto?> GetByIdAsync(Guid tenantId, Guid appointmentId, CancellationToken ct) =>
            Task.FromResult<AppointmentDto?>(null);

        public Task<AppointmentDto?> RescheduleAsync(
            Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, RescheduleAppointmentRequest request, CancellationToken ct) =>
            Task.FromResult<AppointmentDto?>(null);

        public Task<AppointmentDto?> ChangeStateAsync(
            Guid tenantId, Guid appointmentId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, ChangeAppointmentStateRequest request, CancellationToken ct) =>
            Task.FromResult<AppointmentDto?>(null);

        public Task<IReadOnlyList<AppointmentDto>> ListByRangeAsync(
            Guid tenantId, Guid branchId, DateTimeOffset fromUtc, DateTimeOffset toUtc,
            Guid? professionalId, Guid? roomId, CancellationToken ct)
        {
            ListCalled = true;
            LastProfessionalFilter = professionalId;
            return Task.FromResult<IReadOnlyList<AppointmentDto>>(Array.Empty<AppointmentDto>());
        }

        public Task<IReadOnlyList<AppointmentDto>> ListBySubjectAsync(
            Guid tenantId, Guid subjectId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<AppointmentDto>>(Array.Empty<AppointmentDto>());
    }
}
