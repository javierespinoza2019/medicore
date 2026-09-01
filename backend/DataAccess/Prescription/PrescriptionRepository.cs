using System.Data;
using System.Text.Json;
using Dapper;
using MediCore.Models.Prescription;
using Microsoft.Data.SqlClient;

namespace MediCore.DataAccess.Prescription;

public interface IPrescriptionRepository
{
    Task<IReadOnlyList<MedicationDto>> SearchMedicationsAsync(
        Guid tenantId, string? query, bool excludeControlled, int maxRows, CancellationToken ct);

    Task<MedicationDto?> GetMedicationAsync(Guid tenantId, Guid medicationId, CancellationToken ct);

    Task<MedicationDto?> UpsertMedicationAsync(
        Guid tenantId, Guid medicationId, Guid actorUserId, UpsertMedicationRequest request, CancellationToken ct);

    Task<PrescriptionDto?> CreateAsync(
        Guid tenantId, Guid prescriptionId, Guid encounterId,
        Guid actorUserId, Guid? actorProfessionalId, string actorDisplayName,
        DateTimeOffset occurredAtUtc, CreatePrescriptionRequest request, CancellationToken ct);

    Task<PrescriptionDto?> GetByIdAsync(Guid tenantId, Guid prescriptionId, CancellationToken ct);

    Task<IReadOnlyList<PrescriptionDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct);

    Task<PrescriptionDto?> SignAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid authorProfessionalId,
        string contentHash, string authorLicenseSnapshot, string? facilitySnapshotJson,
        DateTimeOffset signedAtUtc, DateTimeOffset? validUntilUtc, CancellationToken ct);

    Task<PrescriptionDto?> SealAsync(
        Guid tenantId, Guid prescriptionId, DateTimeOffset sealedAtUtc, CancellationToken ct);

    Task<PrescriptionDto?> CancelAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        string reason, DateTimeOffset occurredAtUtc, CancellationToken ct);
}

public sealed class PrescriptionRepository(ISqlConnectionFactory connectionFactory) : IPrescriptionRepository
{
    public async Task<IReadOnlyList<MedicationDto>> SearchMedicationsAsync(
        Guid tenantId, string? query, bool excludeControlled, int maxRows, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Medication_Search",
            new
            {
                TenantId = tenantId,
                Query = query,
                ExcludeControlled = excludeControlled,
                MaxRows = maxRows
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var rows = await conn.QueryAsync(cmd);
        return rows.Select(MapMedication).ToList();
    }

    public async Task<MedicationDto?> GetMedicationAsync(
        Guid tenantId, Guid medicationId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Medication_GetById",
            new { TenantId = tenantId, MedicationId = medicationId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);
        var row = await conn.QuerySingleOrDefaultAsync(cmd);
        return row is null ? null : MapMedication(row);
    }

    public async Task<MedicationDto?> UpsertMedicationAsync(
        Guid tenantId, Guid medicationId, Guid actorUserId, UpsertMedicationRequest request, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Medication_Upsert",
                new
                {
                    TenantId = tenantId,
                    MedicationId = medicationId,
                    request.GenericName,
                    request.BrandName,
                    request.Presentation,
                    request.Concentration,
                    request.DefaultRoute,
                    request.SaleClassification,
                    request.IsControlledSubstance,
                    request.IsActive,
                    ActorUserId = actorUserId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetMedicationAsync(tenantId, medicationId, ct);
        }
        catch (SqlException ex) when (ex.Number is >= 50510 and <= 50512)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<PrescriptionDto?> CreateAsync(
        Guid tenantId, Guid prescriptionId, Guid encounterId,
        Guid actorUserId, Guid? actorProfessionalId, string actorDisplayName,
        DateTimeOffset occurredAtUtc, CreatePrescriptionRequest request, CancellationToken ct)
    {
        var itemsPayload = request.Items.Select(i => new
        {
            medicationId = i.MedicationId,
            dose = i.Dose,
            route = i.Route,
            frequency = i.Frequency,
            durationDays = i.DurationDays,
            quantity = i.Quantity,
            refillsAllowed = i.RefillsAllowed,
            instructions = i.Instructions,
            brandNameSnapshot = i.BrandNameSnapshot
        });
        var itemsJson = JsonSerializer.Serialize(itemsPayload, PrescriptionJson.Options);

        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Prescription_Create",
                new
                {
                    PrescriptionId = prescriptionId,
                    TenantId = tenantId,
                    EncounterId = encounterId,
                    ItemsJson = itemsJson,
                    request.GeneralInstructions,
                    request.AllergyOverrideJustification,
                    request.AllergyStatusCaptureEventId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    ActorDisplayName = actorDisplayName,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, prescriptionId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50530)
        {
            throw new PrescriptionAllergyCaptureRequiredException(ex.Message);
        }
        catch (SqlException ex) when (ex.Number == 50540)
        {
            throw new PrescriptionControlledSubstanceException(ex.Message);
        }
        catch (SqlException ex) when (ex.Number == 50531)
        {
            throw new PrescriptionAllergyOverrideRequiredException(ex.Message);
        }
        catch (SqlException ex) when (ex.Number is 50501 or 50502 or 50503)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is >= 50510 and <= 50520)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<PrescriptionDto?> GetByIdAsync(Guid tenantId, Guid prescriptionId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Prescription_GetById",
            new { TenantId = tenantId, PrescriptionId = prescriptionId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        await using var multi = await conn.QueryMultipleAsync(cmd);
        var header = await multi.ReadSingleOrDefaultAsync();
        if (header is null)
            return null;
        var items = (await multi.ReadAsync()).ToList();
        return MapPrescription(header, items);
    }

    public async Task<IReadOnlyList<PrescriptionDto>> ListBySubjectAsync(
        Guid tenantId, Guid subjectId, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        var cmd = new CommandDefinition(
            "sp_Prescription_ListBySubject",
            new { TenantId = tenantId, SubjectId = subjectId },
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        await using var multi = await conn.QueryMultipleAsync(cmd);
        var headers = (await multi.ReadAsync()).ToList();
        var items = (await multi.ReadAsync()).ToList();
        var byRx = items.GroupBy(i => (Guid)i.PrescriptionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<PrescriptionDto>(headers.Count);
        foreach (var h in headers)
        {
            var id = (Guid)h.PrescriptionId;
            byRx.TryGetValue(id, out var list);
            result.Add(MapPrescription(h, list ?? []));
        }

        return result;
    }

    public async Task<PrescriptionDto?> SignAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid authorProfessionalId,
        string contentHash, string authorLicenseSnapshot, string? facilitySnapshotJson,
        DateTimeOffset signedAtUtc, DateTimeOffset? validUntilUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Prescription_Sign",
                new
                {
                    TenantId = tenantId,
                    PrescriptionId = prescriptionId,
                    ActorUserId = actorUserId,
                    AuthorProfessionalId = authorProfessionalId,
                    ContentHash = contentHash,
                    AuthorLicenseSnapshot = authorLicenseSnapshot,
                    FacilitySnapshotJson = facilitySnapshotJson,
                    SignedAtUtc = signedAtUtc.UtcDateTime,
                    ValidUntilUtc = validUntilUtc?.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, prescriptionId, ct);
        }
        catch (SqlException ex) when (ex.Number is 50551 or 50552 or 50553 or 50554)
        {
            throw new UnauthorizedAccessException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50555)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50503)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number == 50550)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    public async Task<PrescriptionDto?> SealAsync(
        Guid tenantId, Guid prescriptionId, DateTimeOffset sealedAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Prescription_Seal",
                new
                {
                    TenantId = tenantId,
                    PrescriptionId = prescriptionId,
                    SealedAtUtc = sealedAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, prescriptionId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50556)
        {
            throw new InvalidOperationException(ex.Message, ex);
        }
    }

    public async Task<PrescriptionDto?> CancelAsync(
        Guid tenantId, Guid prescriptionId, Guid actorUserId, Guid? actorProfessionalId,
        string reason, DateTimeOffset occurredAtUtc, CancellationToken ct)
    {
        using var conn = connectionFactory.Create();
        try
        {
            var cmd = new CommandDefinition(
                "sp_Prescription_Cancel",
                new
                {
                    TenantId = tenantId,
                    PrescriptionId = prescriptionId,
                    ActorUserId = actorUserId,
                    ActorProfessionalId = actorProfessionalId,
                    Reason = reason,
                    OccurredAtUtc = occurredAtUtc.UtcDateTime
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);
            await conn.ExecuteAsync(cmd);
            return await GetByIdAsync(tenantId, prescriptionId, ct);
        }
        catch (SqlException ex) when (ex.Number == 50503)
        {
            throw new KeyNotFoundException(ex.Message, ex);
        }
        catch (SqlException ex) when (ex.Number is 50560 or 50561)
        {
            throw new ArgumentException(ex.Message, ex);
        }
    }

    private static MedicationDto MapMedication(dynamic row) => new()
    {
        MedicationId = row.MedicationId,
        TenantId = row.TenantId,
        GenericName = row.GenericName,
        BrandName = row.BrandName,
        Presentation = row.Presentation,
        Concentration = row.Concentration,
        DefaultRoute = row.DefaultRoute,
        SaleClassification = row.SaleClassification,
        IsControlledSubstance = row.IsControlledSubstance,
        IsActive = row.IsActive
    };

    private static PrescriptionDto MapPrescription(dynamic header, IReadOnlyList<dynamic> itemRows)
    {
        var items = itemRows.Select(MapItem).OrderBy(i => i.LineNumber).ToList();
        return new PrescriptionDto
        {
            PrescriptionId = header.PrescriptionId,
            TenantId = header.TenantId,
            BranchId = header.BranchId,
            EncounterId = header.EncounterId,
            SubjectId = header.SubjectId,
            ProfessionalId = header.ProfessionalId,
            AuthorUserId = header.AuthorUserId,
            AuthorDisplayName = header.AuthorDisplayName,
            AuthorLicenseSnapshot = header.AuthorLicenseSnapshot,
            FacilitySnapshotJson = header.FacilitySnapshotJson,
            IssuedAtUtc = ToOffset(header.IssuedAtUtc),
            ValidUntilUtc = ToOffset(header.ValidUntilUtc),
            AllergyStatusAtIssue = header.AllergyStatusAtIssue,
            AllergyStatusCaptureEventId = header.AllergyStatusCaptureEventId,
            AllergyOverrideJustification = header.AllergyOverrideJustification,
            ContentHash = header.ContentHash,
            SignedAtUtc = ToOffset(header.SignedAtUtc),
            SealedAtUtc = ToOffset(header.SealedAtUtc),
            SealState = header.SealState,
            CancelledAtUtc = ToOffset(header.CancelledAtUtc),
            CancelReason = header.CancelReason,
            GeneralInstructions = header.GeneralInstructions,
            OccurredAtUtc = ToOffset(header.OccurredAtUtc) ?? DateTimeOffset.UtcNow,
            RecordedAtUtc = ToOffset(header.RecordedAtUtc) ?? DateTimeOffset.UtcNow,
            Items = items
        };
    }

    private static PrescriptionItemDto MapItem(dynamic row)
    {
        var doseJson = (string)row.DoseJson;
        var freqJson = (string)row.FrequencyJson;
        var dose = JsonSerializer.Deserialize<DoseDto>(doseJson, PrescriptionJson.Options) ?? new DoseDto();
        var freq = JsonSerializer.Deserialize<FrequencyDto>(freqJson, PrescriptionJson.Options) ?? new FrequencyDto();

        return new PrescriptionItemDto
        {
            PrescriptionItemId = row.PrescriptionItemId,
            PrescriptionId = row.PrescriptionId,
            LineNumber = row.LineNumber,
            MedicationId = row.MedicationId,
            GenericNameSnapshot = row.GenericNameSnapshot,
            BrandNameSnapshot = row.BrandNameSnapshot,
            Dose = dose,
            Route = row.Route,
            Frequency = freq,
            DurationDays = row.DurationDays,
            Quantity = row.Quantity,
            RefillsAllowed = row.RefillsAllowed,
            Instructions = row.Instructions
        };
    }

    private static DateTimeOffset? ToOffset(object? value)
    {
        if (value is null or DBNull)
            return null;
        return value switch
        {
            DateTimeOffset dto => dto,
            DateTime dt => new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)),
            _ => null
        };
    }
}
