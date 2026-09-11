using MediCore.Business.Role;

namespace MediCore.Business.Tests.Role;

public sealed class EffectivePermissionAccessTests
{
    private static IReadOnlyDictionary<string, bool> Perms(params (string key, bool value)[] entries) =>
        entries.ToDictionary(e => e.key, e => e.value);

    [Fact]
    public void BreakGlass_canAtenderUrgencia_allows_clinical_and_urgencies()
    {
        var perms = Perms(("canAtenderUrgencia", true));

        Assert.True(EffectivePermissionAccess.CanAccessUrgencies(false, perms));
        Assert.True(EffectivePermissionAccess.CanReadTriage(false, perms));
        Assert.False(EffectivePermissionAccess.CanAccessClinicalRecord(false, perms));
    }

    [Fact]
    public void BreakGlass_does_not_grant_admin_or_audit()
    {
        var perms = Perms(
            ("canAtenderUrgencia", true),
            ("canCreateConsulta", true));

        Assert.False(EffectivePermissionAccess.CanManageUsers(false, perms));
        Assert.False(EffectivePermissionAccess.CanQueryAudit(false, perms));
    }

    [Fact]
    public void Clinical_record_requires_consulta_permissions()
    {
        var perms = Perms(("canCreateReceta", true));

        Assert.False(EffectivePermissionAccess.CanAccessClinicalRecord(false, perms));
        Assert.True(EffectivePermissionAccess.CanAccessPrescriptions(false, perms));
    }

    [Fact]
    public void SuperAdmin_bypasses_all_checks()
    {
        var perms = Perms(("canCreatePatient", false));

        Assert.True(EffectivePermissionAccess.CanAccessPatients(true, perms));
        Assert.True(EffectivePermissionAccess.CanQueryAudit(true, perms));
    }

    [Fact]
    public void SearchByDescription_denies_medico_allows_admin_and_recepcion()
    {
        var medico = RolePermissionDefaults.ForRole("medico");
        var admin = RolePermissionDefaults.ForRole("admin");
        var recepcion = RolePermissionDefaults.ForRole("recepcion");
        var trabajoSocial = RolePermissionDefaults.ForRole("trabajo_social");
        var enfermeria = RolePermissionDefaults.ForRole("enfermeria");

        Assert.False(EffectivePermissionAccess.CanSearchSubjectByDescription(false, medico));
        Assert.True(EffectivePermissionAccess.CanSearchSubjectByDescription(false, admin));
        Assert.True(EffectivePermissionAccess.CanSearchSubjectByDescription(false, recepcion));
        Assert.True(EffectivePermissionAccess.CanSearchSubjectByDescription(false, trabajoSocial));
        Assert.False(EffectivePermissionAccess.CanSearchSubjectByDescription(false, enfermeria));
        Assert.True(EffectivePermissionAccess.CanSearchSubjectByDescription(true, medico));
    }
}
