using MediCore.Business.Role;

namespace MediCore.Business.Tests.Role;

public sealed class RolePermissionDefaultsTests
{
    [Theory]
    [InlineData("medico", "canCreateReceta", true)]
    [InlineData("medico", "canCobrar", false)]
    [InlineData("caja", "canCobrar", true)]
    [InlineData("trabajo_social", "canEditPatient", true)]
    [InlineData("trabajo_social", "canCreateReceta", false)]
    public void Plantillas_coinciden_con_prototipo(string role, string permission, bool expected)
    {
        var map = RolePermissionDefaults.ForRole(role);
        Assert.Equal(expected, map[permission]);
    }

    [Fact]
    public void Todas_las_claves_estan_presentes_en_cada_plantilla()
    {
        foreach (var role in RolePermissionDefaults.TemplateRoleCodes)
        {
            var map = RolePermissionDefaults.ForRole(role);
            foreach (var key in RolePermissionDefaults.AllKeys)
                Assert.True(map.ContainsKey(key), $"Falta {key} en {role}");
        }
    }

    [Fact]
    public void RoleAccess_solo_admin_y_superadmin_gestionan_matriz()
    {
        Assert.True(RoleAccess.CanManageMatrix(true, []));
        Assert.True(RoleAccess.CanManageMatrix(false, ["admin"]));
        Assert.False(RoleAccess.CanManageMatrix(false, ["medico"]));
        Assert.False(RoleAccess.CanManageMatrix(false, ["recepcion"]));
    }
}
