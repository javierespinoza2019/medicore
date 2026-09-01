using System.Text.Json;
using MediCore.Business.Subject;
using MediCore.Common;
using MediCore.DataAccess.Subject;
using MediCore.DataAccess.Sync;
using MediCore.Models.Subject;
using MediCore.Models.Sync;

namespace MediCore.Business.Sync.Handlers;

/// <summary>Despacha subject.create → sp_Subject_Create (MVP estable).</summary>
public sealed class SubjectCreateSyncCommandHandler(ISubjectRepository subjectRepository) : ISyncCommandHandler
{
    private static readonly DateOnly SinbaSentinelBirth = new(9999, 9, 9);

    public IReadOnlyCollection<string> CommandTypes { get; } = ["subject.create"];

    public SyncCommandSupport Support => SyncCommandSupport.Full;

    public async Task<SyncCommandPlan> PlanAsync(SyncCommandContext context, CancellationToken ct)
    {
        var request = DeserializePayload(context.Request.PayloadJson);
        if (request.BranchId == Guid.Empty)
            throw new ArgumentException("payload.branchId es obligatorio para subject.create.");

        if (!string.IsNullOrWhiteSpace(request.MarkRawText))
            throw new ArgumentException(
                "subject.create vía sync no acepta markRawText aún; omita el campo o use POST /api/subjects.");

        var given = Norm(request.GivenName);
        var first = Norm(request.FirstSurname);
        var second = Norm(request.SecondSurname);
        var preferred = Norm(request.PreferredName);
        var curp = CurpValidator.NormalizeOptional(request.Curp);

        if (request.BirthDate == SinbaSentinelBirth)
            throw new ArgumentException(
                "La fecha 09/09/9999 es centinela SINBA de reporte; no se almacena en Subject.");

        ValidateSex(request.BiologicalSex, request.SexSource);
        ValidateGenderIdentity(request.GenderIdentity);
        var ageJson = EstimatedAgeMapper.ToJson(request.EstimatedAge);
        var genderIdentity = Norm(request.GenderIdentity);

        var hasIdentityName = given is not null || first is not null || second is not null;
        var asUnidentified = request.AsUnidentified == true
            || (!hasIdentityName && curp is null && request.AsUnidentified != false);

        var state = asUnidentified && !hasIdentityName
            ? IdentificationStates.NoIdentificado
            : hasIdentityName
                ? IdentificationStates.DeclaradaSinDocumento
                : IdentificationStates.NoIdentificado;

        var branchCode = await subjectRepository.GetBranchCodeAsync(context.TenantId, request.BranchId, ct)
            ?? throw new ArgumentException("La sucursal no existe en el tenant.");
        var now = context.Request.OccurredAtUtc == default
            ? DateTimeOffset.UtcNow
            : context.Request.OccurredAtUtc.ToUniversalTime();
        // Sufijo aleatorio del ULID (últimos 8): el prefijo temporal colisiona en el mismo ms bajo carga paralela.
        var recordNumber = $"{branchCode.ToUpperInvariant()}-{now.UtcDateTime:yyMMddHHmmss}-{UlidId.New()[^8..]}";

        Guid? labelId = null;
        string? internalCode = null;
        string? operational = null;
        string? snapshot = null;
        var issueLabel = asUnidentified || state == IdentificationStates.NoIdentificado;

        if (issueLabel)
        {
            var config = await subjectRepository.GetEffectiveLabelConfigAsync(context.TenantId, request.BranchId, ct)
                ?? throw new InvalidOperationException(
                    "No hay configuración de etiqueta de no identificado (tenant ni sucursal).");

            var used = await subjectRepository.ListUsedLabelTokensTodayAsync(
                context.TenantId, request.BranchId, now, ct);
            var issued = TemporaryLabelIssuer.Issue(config, branchCode, now, used);
            labelId = Guid.NewGuid();
            internalCode = issued.InternalCode;
            operational = issued.OperationalLabel;
            snapshot = issued.ConfigSnapshotJson;
        }

        var subjectId = request.ClientSubjectId is { } clientId && clientId != Guid.Empty
            ? clientId
            : Guid.NewGuid();
        Guid? deviceId = null;
        if (!string.IsNullOrWhiteSpace(context.Request.DeviceId)
            && Guid.TryParse(context.Request.DeviceId, out var parsedDevice))
        {
            deviceId = parsedDevice;
        }

        return new SyncCommandPlan
        {
            ServerEntityId = subjectId.ToString("D"),
            ClinicalProcedures =
            [
                new SyncProcedureCall
                {
                    ProcedureName = "sp_Subject_Create",
                    Parameters = new
                    {
                        SubjectId = subjectId,
                        TenantId = context.TenantId,
                        request.BranchId,
                        IdentificationState = state,
                        GivenName = given,
                        FirstSurname = first,
                        SecondSurname = second,
                        PreferredName = preferred,
                        BirthDate = request.BirthDate?.ToDateTime(TimeOnly.MinValue),
                        EstimatedAgeJson = ageJson,
                        BiologicalSex = Norm(request.BiologicalSex)?.ToLowerInvariant(),
                        SexSource = Norm(request.SexSource)?.ToLowerInvariant(),
                        GenderIdentity = genderIdentity,
                        Curp = curp,
                        BloodTypeJson = (string?)null,
                        RecordNumber = recordNumber,
                        ApparentSex = Norm(request.ApparentSex)?.ToLowerInvariant(),
                        ApparentAgeRange = Norm(request.ApparentAgeRange),
                        ArrivalAtUtc = (request.ArrivalAtUtc ?? (issueLabel ? now : (DateTimeOffset?)null))?.UtcDateTime,
                        DescriptorFreeText = Norm(request.DescriptorFreeText),
                        IssueTemporaryLabel = issueLabel,
                        LabelId = labelId,
                        InternalCode = internalCode,
                        OperationalLabel = operational,
                        ConfigSnapshotJson = snapshot,
                        DeviceId = deviceId,
                        ActorUserId = context.UserId,
                        ActorProfessionalId = context.ActorProfessionalId,
                        OccurredAtUtc = now.UtcDateTime
                    }
                }
            ]
        };
    }

    private static CreateSubjectRequest DeserializePayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new ArgumentException("PayloadJson es obligatorio para subject.create.");

        try
        {
            var dto = JsonSerializer.Deserialize<CreateSubjectRequest>(payloadJson, SyncJson.Options);
            return dto ?? throw new ArgumentException("PayloadJson de subject.create no es válido.");
        }
        catch (JsonException ex)
        {
            throw new ArgumentException("PayloadJson de subject.create no es JSON válido.", ex);
        }
    }

    private static string? Norm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ValidateSex(string? biologicalSex, string? sexSource)
    {
        if (biologicalSex is null) return;
        if (!BiologicalSexCodes.All.Contains(biologicalSex))
            throw new ArgumentException(
                "BiologicalSex inválido (masculino|femenino|no_determinado|no_especificado). Sin valor por omisión.");
        if (sexSource is not null && !SexSourceCodes.All.Contains(sexSource))
            throw new ArgumentException("SexSource inválido (documento|observado|declarado).");
    }

    private static void ValidateGenderIdentity(string? genderIdentity)
    {
        if (genderIdentity is null) return;
        if (!GenderIdentityCodes.All.Contains(genderIdentity))
            throw new ArgumentException(
                "GenderIdentity inválido (0|1|2|3|4|5|6|88 según GIIS). Null = no capturado; no fabricar ni usar en dosis.");
    }
}
