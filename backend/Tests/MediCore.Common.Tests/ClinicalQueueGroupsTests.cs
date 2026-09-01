using MediCore.Common;

namespace MediCore.Common.Tests;

public sealed class ClinicalQueueGroupsTests
{
    [Fact]
    public void For_incluye_tenant_y_branch_en_formato_estable()
    {
        var tenant = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var branch = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var group = ClinicalQueueGroups.For(tenant, branch);

        Assert.Equal(
            "tenant:11111111-1111-1111-1111-111111111111:branch:22222222-2222-2222-2222-222222222222",
            group);
    }

    [Fact]
    public void For_distinto_tenant_distinto_grupo_mismo_branch()
    {
        var branch = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var a = ClinicalQueueGroups.For(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), branch);
        var b = ClinicalQueueGroups.For(Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), branch);

        Assert.NotEqual(a, b);
        Assert.Contains("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", a);
        Assert.Contains("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", b);
    }

    [Theory]
    [InlineData("00000000-0000-0000-0000-000000000000", "22222222-2222-2222-2222-222222222222")]
    [InlineData("11111111-1111-1111-1111-111111111111", "00000000-0000-0000-0000-000000000000")]
    public void For_rechaza_guid_vacio(string tenant, string branch)
    {
        Assert.Throws<ArgumentException>(() =>
            ClinicalQueueGroups.For(Guid.Parse(tenant), Guid.Parse(branch)));
    }
}
