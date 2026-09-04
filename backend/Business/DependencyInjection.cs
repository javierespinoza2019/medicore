using MediCore.Business.Appointment;
using MediCore.Business.Audit;
using MediCore.Business.Auth;
using MediCore.Business.ClinicalRecord;
using MediCore.Business.Device;
using MediCore.Business.Encounter;
using MediCore.Business.Files;
using MediCore.Business.Notes;
using MediCore.Business.Prescription;
using MediCore.Business.Professional;
using MediCore.Business.Subject;
using MediCore.Business.Role;
using MediCore.Business.Sync;
using MediCore.Business.Sync.Handlers;
using MediCore.Business.Tenant;
using MediCore.Business.Triage;
using MediCore.Business.UserAdmin;
using MediCore.Common;
using MediCore.DataAccess;
using MediCore.DataAccess.Appointment;
using MediCore.DataAccess.Audit;
using MediCore.DataAccess.Auth;
using MediCore.DataAccess.ClinicalRecord;
using MediCore.DataAccess.Device;
using MediCore.DataAccess.Encounter;
using MediCore.DataAccess.Notes;
using MediCore.DataAccess.Outbox;
using MediCore.DataAccess.Prescription;
using MediCore.DataAccess.Professional;
using MediCore.DataAccess.Subject;
using MediCore.DataAccess.Role;
using MediCore.DataAccess.Sync;
using MediCore.DataAccess.Tenant;
using MediCore.DataAccess.Triage;
using MediCore.DataAccess.UserAdmin;
using Microsoft.Extensions.DependencyInjection;

namespace MediCore.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddMediCoreCore(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();

        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<ISyncRepository, SyncRepository>();
        services.AddScoped<IDeviceRepository, DeviceRepository>();
        services.AddScoped<IOutboxRepository, OutboxRepository>();
        services.AddScoped<IHealthcareProfessionalRepository, HealthcareProfessionalRepository>();
        services.AddScoped<ISpecialtyRepository, SpecialtyRepository>();
        services.AddScoped<ITenantRepository, TenantRepository>();
        services.AddScoped<IBranchRepository, BranchRepository>();
        services.AddScoped<IAuditRepository, AuditRepository>();
        services.AddScoped<ISubjectRepository, SubjectRepository>();
        services.AddScoped<IAppointmentRepository, AppointmentRepository>();
        services.AddScoped<IEncounterRepository, EncounterRepository>();
        services.AddScoped<ITriageRepository, TriageRepository>();
        services.AddScoped<IClinicalRecordRepository, ClinicalRecordRepository>();
        services.AddScoped<INotesRepository, NotesRepository>();
        services.AddScoped<IPrescriptionRepository, PrescriptionRepository>();

        services.AddScoped<IEffectivePermissionService, EffectivePermissionService>();
        services.AddScoped<IBreakGlassRepository, BreakGlassRepository>();
        services.AddScoped<IBreakGlassService, BreakGlassService>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<ITenantUserRepository, TenantUserRepository>();
        services.AddScoped<ITenantUserService, TenantUserService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISyncService, SyncService>();
        services.AddScoped<ISyncCommandHandler, SubjectCreateSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, EncounterOpenSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, EncounterCommandsSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, TriageSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, NotesSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, ClinicalRecordSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, PrescriptionSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, AppointmentSyncCommandHandler>();
        services.AddScoped<ISyncCommandHandler, PartialSupportSyncCommandHandler>();
        services.AddScoped<ISyncCommandRegistry, SyncCommandRegistry>();
        services.AddScoped<IDeviceService, DeviceService>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<IBranchService, BranchService>();
        services.AddScoped<ILogoBrandingService, LogoBrandingService>();
        services.AddScoped<ISubjectPhotoService, SubjectPhotoService>();
        services.AddSingleton<IFileStorage, LocalFileStorage>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<ISubjectService, SubjectService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IEncounterService, EncounterService>();
        services.AddScoped<ITriageService, TriageService>();
        services.AddScoped<IClinicalRecordService, ClinicalRecordService>();
        services.AddScoped<INotesService, NotesService>();
        services.AddScoped<IPrescriptionService, PrescriptionService>();
        services.AddScoped<IProfessionalService, ProfessionalService>();
        services.AddScoped<ISpecialtyService, SpecialtyService>();

        return services;
    }
}
