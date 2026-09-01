using MediCore.Business.Auth;
using MediCore.Business.Role;

namespace MediCore.Business.Tests.Auth;

public sealed class BreakGlassDomainTests
{
    [Fact]
    public void Medico_puede_solicitar_break_glass()
    {
        Assert.True(BreakGlassDomain.CanRequest(false, ["medico"]));
    }

    [Fact]
    public void Admin_no_puede_solicitar_break_glass()
    {
        Assert.False(BreakGlassDomain.CanRequest(false, ["admin"]));
    }

    [Fact]
    public void Justificacion_corta_rechazada()
    {
        var errors = BreakGlassDomain.ValidateRequest(
            "corta",
            ["canAtenderUrgencia"],
            RolePermissionDefaults.ForRole("recepcion"));
        Assert.Contains(errors, e => e.Contains("15"));
    }

    [Fact]
    public void No_concede_permiso_admin_por_break_glass()
    {
        var errors = BreakGlassDomain.ValidateRequest(
            "Emergencia en urgencias sin médico de guardia",
            ["canAdminUsers"],
            RolePermissionDefaults.ForRole("enfermeria"));
        Assert.NotEmpty(errors);
    }

    [Fact]
    public void MergeBreakGlass_activa_permiso_solicitado()
    {
        var basePerms = RolePermissionDefaults.ForRole("recepcion");
        var merged = BreakGlassDomain.MergeBreakGlass(basePerms, ["canAtenderUrgencia"]);
        Assert.False(basePerms["canAtenderUrgencia"]);
        Assert.True(merged["canAtenderUrgencia"]);
    }
}
