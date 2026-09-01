using MediCore.Business.Subject;
using MediCore.Models.Subject;

namespace MediCore.Business.Tests.Subject;

public sealed class CurpValidatorTests
{
    [Fact]
    public void NormalizeOptional_vacio_devuelve_null()
    {
        Assert.Null(CurpValidator.NormalizeOptional(null));
        Assert.Null(CurpValidator.NormalizeOptional("  "));
    }

    [Fact]
    public void NormalizeOptional_rechaza_longitud_incorrecta()
    {
        Assert.Throws<ArgumentException>(() => CurpValidator.NormalizeOptional("ABC"));
    }

    [Fact]
    public void CheckDigit_y_normalize_con_curp_sintetica()
    {
        // CURP sintética (no persona real): estructura + dígito verificador calculado.
        var base17 = "XAXX010101HDFXXX0";
        // Ajustar a patrón realista: fecha 01/01/01, H, DF, consonantes.
        base17 = "BADD110313HDFLRN0";
        var curp = base17[..17] + Digito(base17[..17]);
        Assert.True(CurpValidator.CheckDigitMatches(curp));
        Assert.Equal(curp, CurpValidator.NormalizeOptional(curp.ToLowerInvariant()));
    }

    [Fact]
    public void CheckDigit_falla_si_se_altera()
    {
        var base17 = "BADD110313HDFLRN0"[..17];
        var bueno = base17 + Digito(base17);
        var malo = base17 + (bueno[^1] == '0' ? '1' : '0');
        Assert.False(CurpValidator.CheckDigitMatches(malo));
    }

    private static char Digito(string primeros17)
    {
        const string dic = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        var suma = 0;
        for (var i = 0; i < 17; i++)
            suma += dic.IndexOf(primeros17[i]) * (18 - i);
        var d = 10 - (suma % 10);
        if (d == 10) d = 0;
        return (char)('0' + d);
    }
}

public sealed class IdentificationStateMachineTests
{
    [Theory]
    [InlineData(IdentificationStates.NoIdentificado, IdentificationStates.DeclaradaSinDocumento)]
    [InlineData(IdentificationStates.NoIdentificado, IdentificationStates.VerificadaConDocumento)]
    [InlineData(IdentificationStates.DeclaradaSinDocumento, IdentificationStates.VerificadaConDocumento)]
    [InlineData(IdentificationStates.VerificadaConDocumento, IdentificationStates.Rectificada)]
    public void Transiciones_validas(string from, string to) =>
        Assert.True(IdentificationStateMachine.CanTransition(from, to));

    [Theory]
    [InlineData(IdentificationStates.NoRecuperable, IdentificationStates.NoIdentificado)]
    [InlineData(IdentificationStates.VerificadaConDocumento, IdentificationStates.NoIdentificado)]
    public void Transiciones_invalidas(string from, string to) =>
        Assert.False(IdentificationStateMachine.CanTransition(from, to));
}

public sealed class TemporaryLabelIssuerTests
{
    [Fact]
    public void Emite_token_sin_repetir_y_sin_colores()
    {
        var config = new UnidentifiedLabelConfigDto
        {
            ConfigId = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            SchemeCode = "fonetico_sintetico_demo",
            SchemeParamsJson = """
                {
                  "tokenAlphabet": ["ALFA","BRAVO","CHARLIE"],
                  "blockedTokens": ["ROJO","VERDE"]
                }
                """,
            ResolvedFrom = "tenant"
        };

        var first = TemporaryLabelIssuer.Issue(config, "CENTRAL", DateTimeOffset.UtcNow, []);
        Assert.Equal("ALFA", first.Token);
        Assert.Contains("ALFA", first.OperationalLabel);
        Assert.False(string.IsNullOrWhiteSpace(first.ConfigSnapshotJson));
        Assert.Contains("fonetico_sintetico_demo", first.ConfigSnapshotJson!);
        Assert.Contains("tenant", first.ConfigSnapshotJson!);

        var second = TemporaryLabelIssuer.Issue(config, "CENTRAL", DateTimeOffset.UtcNow, [first.Token]);
        Assert.Equal("BRAVO", second.Token);
    }

    [Fact]
    public void Rechaza_alfabeto_con_color()
    {
        var config = new UnidentifiedLabelConfigDto
        {
            ConfigId = Guid.NewGuid(),
            TenantId = Guid.NewGuid(),
            SchemeCode = "malo",
            SchemeParamsJson = """{ "tokenAlphabet": ["ALFA","ROJO"] }""",
            ResolvedFrom = "tenant"
        };

        Assert.Throws<InvalidOperationException>(() =>
            TemporaryLabelIssuer.Issue(config, "X", DateTimeOffset.UtcNow, []));
    }
}

public sealed class SubjectServiceValidationTests
{
    [Fact]
    public async Task Create_exige_branchId()
    {
        var svc = new SubjectService(new RepoFalso(), new ClinicalRecordFalso());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(
                Guid.NewGuid(), Guid.NewGuid(), null, "Admin",
                new CreateSubjectRequest { BranchId = Guid.Empty },
                default));
    }

    [Fact]
    public async Task Create_rechaza_centinela_sinba()
    {
        var svc = new SubjectService(new RepoFalso(), new ClinicalRecordFalso());
        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(
                Guid.NewGuid(), Guid.NewGuid(), null, "Admin",
                new CreateSubjectRequest
                {
                    BranchId = Guid.NewGuid(),
                    BirthDate = new DateOnly(9999, 9, 9)
                },
                default));
    }

    [Fact]
    public void SubjectAccess_busqueda_descripcion_como_auditoria()
    {
        Assert.True(SubjectAccess.CanSearchByDescription(true, ["medico"]));
        Assert.True(SubjectAccess.CanSearchByDescription(false, ["admin"]));
        Assert.False(SubjectAccess.CanSearchByDescription(false, ["medico"]));
    }

    private sealed class ClinicalRecordFalso : MediCore.Business.ClinicalRecord.IClinicalRecordService
    {
        public Task<Models.ClinicalRecord.ClinicalRecordDto> GetBySubjectAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<Models.ClinicalRecord.MedicalHistoryDto> SaveHistoryAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, Models.ClinicalRecord.SaveMedicalHistoryRequest request,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<Models.ClinicalRecord.AmendmentDto> AddAmendmentAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, Models.ClinicalRecord.AddAmendmentRequest request,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<Models.ClinicalRecord.AllergyStatusDto> SetAllergyStatusAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, Models.ClinicalRecord.SetAllergyStatusRequest request,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task<Models.ClinicalRecord.AllergyDto> AddAllergyAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, Models.ClinicalRecord.AddAllergyRequest request,
            CancellationToken ct) =>
            throw new NotImplementedException();

        public Task SoftDeleteAllergyAsync(
            Guid tenantId, Guid subjectId, Guid allergyId, Guid actorUserId, CancellationToken ct) =>
            Task.CompletedTask;

        public Task<Models.ClinicalRecord.SubjectFlagDto> SetFlagAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, Models.ClinicalRecord.SetSubjectFlagRequest request,
            CancellationToken ct) =>
            Task.FromResult(new Models.ClinicalRecord.SubjectFlagDto
            {
                FlagId = Guid.NewGuid(),
                SubjectId = subjectId,
                FlagType = request.FlagType,
                PayloadJson = request.PayloadJson,
                IsActive = request.IsActive
            });
    }

    private sealed class RepoFalso : DataAccess.Subject.ISubjectRepository
    {
        public Task<Models.Subject.SubjectDto?> CreateAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, DataAccess.Subject.CreateSubjectCommand command,
            CancellationToken ct) =>
            Task.FromResult<Models.Subject.SubjectDto?>(null);

        public Task<Models.Subject.SubjectDto?> GetByIdAsync(Guid tenantId, Guid subjectId, CancellationToken ct) =>
            Task.FromResult<Models.Subject.SubjectDto?>(null);

        public Task<IReadOnlyList<SubjectListItemDto>> SearchAsync(
            Guid tenantId, string? query, bool includeUnidentified, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<SubjectListItemDto>>([]);

        public Task<Models.Subject.SubjectDto?> UpdateIdentityAsync(
            Guid tenantId, Guid subjectId, Guid actorUserId, DateTimeOffset occurredAtUtc,
            UpdateIdentityRequest request, string? estimatedAgeJson, CancellationToken ct) =>
            Task.FromResult<Models.Subject.SubjectDto?>(null);

        public Task<IdentityStateEventDto?> TransitionStateAsync(
            Guid tenantId, Guid subjectId, Guid eventId, Guid actorUserId, Guid? actorProfessionalId,
            DateTimeOffset occurredAtUtc, TransitionIdentityStateRequest request, CancellationToken ct) =>
            Task.FromResult<IdentityStateEventDto?>(null);

        public Task<UnidentifiedLabelConfigDto?> GetEffectiveLabelConfigAsync(
            Guid tenantId, Guid branchId, CancellationToken ct) =>
            Task.FromResult<UnidentifiedLabelConfigDto?>(null);

        public Task<UnidentifiedLabelConfigDto?> UpsertLabelConfigAsync(
            Guid tenantId, Guid configId, Guid? branchId, string schemeCode, string schemeParamsJson,
            Guid actorUserId, CancellationToken ct) =>
            Task.FromResult<UnidentifiedLabelConfigDto?>(null);

        public Task<IReadOnlyList<string>> ListUsedLabelTokensTodayAsync(
            Guid tenantId, Guid branchId, DateTimeOffset dayUtc, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<string>>([]);

        public Task<string?> GetBranchCodeAsync(Guid tenantId, Guid branchId, CancellationToken ct) =>
            Task.FromResult<string?>("CENTRAL");

        public Task<SubjectDistinctiveMarkDto?> AddMarkAsync(
            Guid tenantId, Guid subjectId, Guid markId, Guid actorUserId, Guid? actorProfessionalId,
            string actorDisplayName, DateTimeOffset occurredAtUtc, AddDistinctiveMarkRequest request,
            CancellationToken ct) =>
            Task.FromResult<SubjectDistinctiveMarkDto?>(null);

        public Task<SubjectBelongingDto?> AddBelongingAsync(
            Guid tenantId, Guid subjectId, Guid belongingId, Guid actorUserId,
            DateTimeOffset occurredAtUtc, AddBelongingRequest request, CancellationToken ct) =>
            Task.FromResult<SubjectBelongingDto?>(null);

        public Task<DescriptionSearchResultDto> SearchByDescriptionAsync(
            Guid tenantId, Guid actorUserId, SearchByDescriptionRequest request, CancellationToken ct) =>
            Task.FromResult(new DescriptionSearchResultDto());

        public Task<SubjectLinkDto?> LinkAsync(
            Guid tenantId, Guid linkId, Guid actorUserId, DateTimeOffset occurredAtUtc,
            LinkSubjectsRequest request, CancellationToken ct) =>
            Task.FromResult<SubjectLinkDto?>(null);

        public Task<SubjectLinkDto?> RevertLinkAsync(
            Guid tenantId, Guid revertLinkId, Guid subjectId, Guid originalLinkId, Guid actorUserId,
            Guid? actorProfessionalId, DateTimeOffset occurredAtUtc, string justification,
            CancellationToken ct) =>
            Task.FromResult<SubjectLinkDto?>(null);

        public Task SoftDeleteAsync(Guid tenantId, Guid subjectId, Guid actorUserId, CancellationToken ct) =>
            Task.CompletedTask;
    }
}

public sealed class SexGenderClinicalRulesTests
{
    [Fact]
    public void Catalogos_GenderIdentity_opcional_y_BiologicalSex_sin_default()
    {
        Assert.Equal(8, GenderIdentityCodes.All.Count);
        Assert.Contains(GenderIdentityCodes.NoEspecificado, GenderIdentityCodes.All);
        Assert.Equal(4, BiologicalSexCodes.All.Count);
        Assert.DoesNotContain("masculino", GenderIdentityCodes.All); // códigos GIIS numéricos, no sexo clínico
    }

    [Theory]
    [InlineData(BiologicalSexCodes.Masculino, GenderIdentityCodes.Femenino, "1")]
    [InlineData(BiologicalSexCodes.Femenino, GenderIdentityCodes.Masculino, "2")]
    [InlineData(BiologicalSexCodes.NoDeterminado, GenderIdentityCodes.Masculino, null)]
    [InlineData(null, GenderIdentityCodes.Transgenero, null)]
    public void DgisUrgencias_mapea_solo_BiologicalSex_ignora_genero(
        string? biologicalSex, string? genderIdentity, string? expected)
    {
        Assert.Equal(expected, DgisUrgenciasSexMapper.ToSeulSexCode(biologicalSex, genderIdentity));
    }

    [Fact]
    public void ClinicalSexRules_nunca_usa_genero_para_calculo()
    {
        Assert.Equal(
            BiologicalSexCodes.Masculino,
            ClinicalSexRules.SexForClinicalCalculation(
                BiologicalSexCodes.Masculino, GenderIdentityCodes.Femenino));
        Assert.Null(
            ClinicalSexRules.SexForClinicalCalculation(null, GenderIdentityCodes.Masculino));
    }
}
