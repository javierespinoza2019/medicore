-- sp_Prescription.sql — MediCore M8 / WS-I
-- Receta: captura explícita de estado alérgico, rechazo de controlados, firma fail closed.
-- Offline previstos (NO cableados en SyncService en este turno):
--   prescription.create | prescription.sign | allergyStatus.set (antes, si aplica)

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_Create
    @PrescriptionId                 UNIQUEIDENTIFIER,
    @TenantId                       UNIQUEIDENTIFIER,
    @EncounterId                    UNIQUEIDENTIFIER,
    @ItemsJson                      NVARCHAR(MAX),
    @GeneralInstructions            NVARCHAR(2000) = NULL,
    @AllergyOverrideJustification   NVARCHAR(1000) = NULL,
    @AllergyStatusCaptureEventId    UNIQUEIDENTIFIER = NULL,
    @ActorUserId                    UNIQUEIDENTIFIER,
    @ActorProfessionalId            UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName               NVARCHAR(200),
    @OccurredAtUtc                  DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ActorDisplayName)), N'') = N''
        THROW 50510, N'ActorDisplayName es obligatorio.', 1;

    IF ISNULL(LTRIM(RTRIM(@ItemsJson)), N'') = N'' OR ISJSON(@ItemsJson) <> 1
        THROW 50513, N'ItemsJson es obligatorio y debe ser JSON válido.', 1;

    IF NOT EXISTS (SELECT 1 FROM OPENJSON(@ItemsJson))
        THROW 50514, N'La receta exige al menos un medicamento.', 1;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @RecordId UNIQUEIDENTIFIER;
    DECLARE @AllergyStatus NVARCHAR(40);
    DECLARE @LatestStatusEventId UNIQUEIDENTIFIER;
    DECLARE @StatusEventCount INT;
    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @CaptureOk BIT = 0;
    DECLARE @MatchedAllergy BIT = 0;
    DECLARE @ItemCount INT;

    SELECT @BranchId = e.BranchId, @SubjectId = e.SubjectId
    FROM dbo.Encounter e
    WHERE e.EncounterId = @EncounterId AND e.TenantId = @TenantId AND e.IsDeleted = 0;

    IF @SubjectId IS NULL
        THROW 50501, N'Episodio no encontrado.', 1;

    -- Ensure silencioso (sin result set) para poder leer estado alérgico.
    EXEC dbo.sp_ClinicalRecord_EnsureForSubject
        @TenantId = @TenantId,
        @SubjectId = @SubjectId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc,
        @RecordId = @RecordId OUTPUT,
        @ReturnRow = 0;

    IF @RecordId IS NULL
        THROW 50502, N'Expediente clínico no encontrado.', 1;

    SELECT TOP (1)
        @LatestStatusEventId = e.StatusEventId,
        @AllergyStatus = e.Status
    FROM dbo.AllergyStatusEvent e
    WHERE e.TenantId = @TenantId AND e.RecordId = @RecordId
    ORDER BY e.OccurredAtUtc DESC;

    IF @AllergyStatus IS NULL
        SET @AllergyStatus = N'no_interrogado';

    SELECT @StatusEventCount = COUNT(*)
    FROM dbo.AllergyStatusEvent e
    WHERE e.TenantId = @TenantId AND e.RecordId = @RecordId;

    -- Captura explícita: semilla Ensure (1 evento no_interrogado) NO basta.
    IF EXISTS (
        SELECT 1 FROM dbo.AuditEvent a
        WHERE a.TenantId = @TenantId
          AND a.SubjectId = @SubjectId
          AND a.EventType = N'allergyStatus.set'
    )
        SET @CaptureOk = 1;

    IF @CaptureOk = 0 AND @StatusEventCount > 1
        SET @CaptureOk = 1;

    IF @CaptureOk = 0 AND @AllergyStatusCaptureEventId IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.AllergyStatusEvent e
            WHERE e.StatusEventId = @AllergyStatusCaptureEventId
              AND e.TenantId = @TenantId
              AND e.SubjectId = @SubjectId
       )
        SET @CaptureOk = 1;

    IF @CaptureOk = 0
        THROW 50530, N'Falta captura explícita del estado alérgico antes de prescritir. Registre el estado (puede ser no_interrogado o paciente_no_puede_responder) con rastro; no se bloquea hasta conocer las alergias.', 1;

    -- Materializar ítems validados
    CREATE TABLE #Items (
        LineNumber          INT NOT NULL,
        MedicationId        UNIQUEIDENTIFIER NOT NULL,
        GenericName         NVARCHAR(200) NOT NULL,
        BrandNameSnapshot   NVARCHAR(200) NULL,
        DoseJson            NVARCHAR(500) NOT NULL,
        Route               NVARCHAR(64) NOT NULL,
        FrequencyJson       NVARCHAR(200) NOT NULL,
        DurationDays        INT NULL,
        Quantity            DECIMAL(18,4) NULL,
        RefillsAllowed      INT NOT NULL,
        Instructions        NVARCHAR(1000) NULL
    );

    ;WITH raw AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS LineNumber,
            TRY_CONVERT(UNIQUEIDENTIFIER, j.medicationId) AS MedicationId,
            j.dose AS DoseJson,
            LTRIM(RTRIM(j.route)) AS Route,
            j.frequency AS FrequencyJson,
            j.durationDays,
            j.quantity,
            ISNULL(j.refillsAllowed, 0) AS RefillsAllowed,
            NULLIF(LTRIM(RTRIM(j.instructions)), N'') AS Instructions,
            NULLIF(LTRIM(RTRIM(j.brandNameSnapshot)), N'') AS BrandNameSnapshot
        FROM OPENJSON(@ItemsJson)
        WITH (
            medicationId        NVARCHAR(64)   N'$.medicationId',
            dose                NVARCHAR(MAX)  N'$.dose' AS JSON,
            route               NVARCHAR(64)   N'$.route',
            frequency           NVARCHAR(MAX)  N'$.frequency' AS JSON,
            durationDays        INT            N'$.durationDays',
            quantity            DECIMAL(18,4)  N'$.quantity',
            refillsAllowed      INT            N'$.refillsAllowed',
            instructions        NVARCHAR(1000) N'$.instructions',
            brandNameSnapshot   NVARCHAR(200)  N'$.brandNameSnapshot'
        ) j
    )
    INSERT INTO #Items (
        LineNumber, MedicationId, GenericName, BrandNameSnapshot, DoseJson, Route,
        FrequencyJson, DurationDays, Quantity, RefillsAllowed, Instructions
    )
    SELECT
        r.LineNumber,
        r.MedicationId,
        m.GenericName,
        COALESCE(r.BrandNameSnapshot, m.BrandName),
        r.DoseJson,
        r.Route,
        r.FrequencyJson,
        r.durationDays,
        r.quantity,
        r.RefillsAllowed,
        r.Instructions
    FROM raw r
    INNER JOIN dbo.Medication m
        ON m.MedicationId = r.MedicationId
       AND m.TenantId = @TenantId
       AND m.IsDeleted = 0
       AND m.IsActive = 1;

    SELECT @ItemCount = COUNT(*) FROM #Items;
    IF @ItemCount = 0 OR @ItemCount <> (SELECT COUNT(*) FROM OPENJSON(@ItemsJson))
        THROW 50520, N'Medicamento no encontrado, inactivo o ítem mal formado.', 1;

    IF EXISTS (SELECT 1 FROM #Items WHERE MedicationId IS NULL OR Route IS NULL OR Route = N'')
        THROW 50516, N'medicationId y route son obligatorios en cada ítem.', 1;

    IF EXISTS (SELECT 1 FROM #Items WHERE DoseJson IS NULL OR ISJSON(DoseJson) <> 1)
        THROW 50517, N'dose debe ser Medicion JSON estructurada.', 1;

    IF EXISTS (
        SELECT 1 FROM #Items i
        WHERE LOWER(LTRIM(RTRIM(JSON_VALUE(i.DoseJson, '$.estado'))))
              NOT IN (N'medido', N'no_medido', N'no_valorable')
    )
        THROW 50517, N'dose.estado inválido (medido|no_medido|no_valorable).', 1;

    IF EXISTS (SELECT 1 FROM #Items WHERE FrequencyJson IS NULL OR ISJSON(FrequencyJson) <> 1)
        THROW 50518, N'frequency debe ser JSON estructurado (no texto libre).', 1;

    IF EXISTS (
        SELECT 1 FROM #Items i
        WHERE LOWER(LTRIM(RTRIM(JSON_VALUE(i.FrequencyJson, '$.kind'))))
              NOT IN (N'every_n_hours', N'n_times_per_day')
           OR TRY_CONVERT(INT, JSON_VALUE(i.FrequencyJson, '$.n')) IS NULL
           OR TRY_CONVERT(INT, JSON_VALUE(i.FrequencyJson, '$.n')) < 1
    )
        THROW 50518, N'frequency.kind debe ser every_n_hours|n_times_per_day con n >= 1.', 1;

    IF EXISTS (SELECT 1 FROM #Items WHERE RefillsAllowed < 0 OR RefillsAllowed > 3)
        THROW 50519, N'refillsAllowed debe estar entre 0 y 3 (LGS art. 226).', 1;

    -- Controlados: rechazo en el propio SP (no solo Business).
    IF EXISTS (
        SELECT 1
        FROM #Items i
        INNER JOIN dbo.Medication m ON m.MedicationId = i.MedicationId AND m.TenantId = @TenantId
        WHERE m.IsControlledSubstance = 1
    )
        THROW 50540, N'Medicamento controlado (estupefaciente/psicotrópico) impedido: fuera del alcance comercial (Fases 1–4). Su suministro requiere recetario especial con código de barras asignado por la autoridad (LGS arts. 240–241). No se implementan recetarios de controlados; reabrir solo con decisión escrita y Reglamento de Insumos verificado.', 1;

    IF EXISTS (
        SELECT 1
        FROM #Items i
        INNER JOIN dbo.Allergy a
            ON a.TenantId = @TenantId
           AND a.SubjectId = @SubjectId
           AND a.IsDeleted = 0
           AND (
                LOWER(a.Substance) LIKE N'%' + LOWER(i.GenericName) + N'%'
             OR LOWER(i.GenericName) LIKE N'%' + LOWER(a.Substance) + N'%'
           )
    )
        SET @MatchedAllergy = 1;

    IF @MatchedAllergy = 1 AND ISNULL(LTRIM(RTRIM(@AllergyOverrideJustification)), N'') = N''
        THROW 50531, N'Prescribir un medicamento al que el paciente refiere alergia exige justificación explícita registrada (SC-02).', 1;

    BEGIN TRAN;

    INSERT INTO dbo.Prescription (
        PrescriptionId, TenantId, BranchId, EncounterId, SubjectId,
        ProfessionalId, AuthorUserId, AuthorDisplayName,
        AllergyStatusAtIssue, AllergyStatusCaptureEventId, AllergyOverrideJustification,
        GeneralInstructions, SealState, OccurredAtUtc, RecordedAtUtc, UpdatedAtUtc
    )
    VALUES (
        @PrescriptionId, @TenantId, @BranchId, @EncounterId, @SubjectId,
        @ActorProfessionalId, @ActorUserId, LTRIM(RTRIM(@ActorDisplayName)),
        @AllergyStatus,
        COALESCE(@AllergyStatusCaptureEventId, @LatestStatusEventId),
        NULLIF(LTRIM(RTRIM(@AllergyOverrideJustification)), N''),
        NULLIF(LTRIM(RTRIM(@GeneralInstructions)), N''),
        N'pendiente', @OccurredAtUtc, @Now, @Now
    );

    INSERT INTO dbo.PrescriptionItem (
        PrescriptionItemId, TenantId, PrescriptionId, LineNumber, MedicationId,
        GenericNameSnapshot, BrandNameSnapshot, DoseJson, Route, FrequencyJson,
        DurationDays, Quantity, RefillsAllowed, Instructions
    )
    SELECT
        NEWID(), @TenantId, @PrescriptionId, LineNumber, MedicationId,
        GenericName, BrandNameSnapshot, DoseJson, Route, FrequencyJson,
        DurationDays, Quantity, RefillsAllowed, Instructions
    FROM #Items;

    DECLARE @Detail NVARCHAR(500) = CONCAT(
        N'{"allergyStatus":"', @AllergyStatus,
        N'","itemCount":', @ItemCount,
        N',"captureEventId":"', CONVERT(NVARCHAR(36), COALESCE(@AllergyStatusCaptureEventId, @LatestStatusEventId)),
        N'"}'
    );

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'prescription.create',
        @EntityName = N'Prescription',
        @EntityId = @PrescriptionId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL;

    COMMIT;

    DROP TABLE #Items;

    EXEC dbo.sp_Prescription_GetById @TenantId = @TenantId, @PrescriptionId = @PrescriptionId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_Sign
    @TenantId                   UNIQUEIDENTIFIER,
    @PrescriptionId             UNIQUEIDENTIFIER,
    @ActorUserId                UNIQUEIDENTIFIER,
    @AuthorProfessionalId       UNIQUEIDENTIFIER,
    @ContentHash                NVARCHAR(128),
    @AuthorLicenseSnapshot      NVARCHAR(MAX),
    @FacilitySnapshotJson       NVARCHAR(MAX) = NULL,
    @SignedAtUtc                DATETIME2(3),
    @ValidUntilUtc              DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ContentHash)), N'') = N''
        THROW 50550, N'ContentHash es obligatorio.', 1;

    IF @AuthorProfessionalId IS NULL
        THROW 50551, N'AuthorProfessionalId es obligatorio para firmar/emitir (fail closed).', 1;

    IF ISNULL(LTRIM(RTRIM(@AuthorLicenseSnapshot)), N'') = N''
        THROW 50552, N'AuthorLicenseSnapshot es obligatorio al firmar.', 1;

    DECLARE @License NVARCHAR(64);
    DECLARE @IsActive BIT;

    SELECT @License = p.ProfessionalLicense, @IsActive = p.IsActive
    FROM dbo.HealthcareProfessional p
    WHERE p.HealthcareProfessionalId = @AuthorProfessionalId
      AND p.TenantId = @TenantId
      AND p.IsDeleted = 0;

    IF @IsActive IS NULL OR @IsActive = 0
        THROW 50553, N'Profesional no encontrado o inactivo.', 1;

    IF ISNULL(LTRIM(RTRIM(@License)), N'') = N''
        THROW 50554, N'Sin cédula profesional capturada; no se puede firmar (fail closed).', 1;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @AlreadySigned DATETIME2(3);

    BEGIN TRAN;

    SELECT
        @SubjectId = pr.SubjectId,
        @BranchId = pr.BranchId,
        @AlreadySigned = pr.SignedAtUtc
    FROM dbo.Prescription pr WITH (UPDLOCK, ROWLOCK)
    WHERE pr.PrescriptionId = @PrescriptionId
      AND pr.TenantId = @TenantId
      AND pr.IsDeleted = 0
      AND pr.CancelledAtUtc IS NULL;

    IF @SubjectId IS NULL
        THROW 50503, N'Receta no encontrada o cancelada.', 1;

    IF @AlreadySigned IS NOT NULL
        THROW 50555, N'La receta ya está firmada (inmutable).', 1;

    UPDATE dbo.Prescription
    SET ProfessionalId = @AuthorProfessionalId,
        AuthorLicenseSnapshot = @AuthorLicenseSnapshot,
        FacilitySnapshotJson = @FacilitySnapshotJson,
        ContentHash = @ContentHash,
        SignedAtUtc = @SignedAtUtc,
        IssuedAtUtc = @SignedAtUtc,
        ValidUntilUtc = @ValidUntilUtc,
        UpdatedAtUtc = @Now
    WHERE PrescriptionId = @PrescriptionId
      AND TenantId = @TenantId
      AND SignedAtUtc IS NULL;

    IF @@ROWCOUNT = 0
        THROW 50555, N'La receta ya está firmada (inmutable).', 1;

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @AuthorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'prescription.sign',
        @EntityName = N'Prescription',
        @EntityId = @PrescriptionId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @SignedAtUtc,
        @DeviceId = NULL;

    COMMIT;

    EXEC dbo.sp_Prescription_GetById @TenantId = @TenantId, @PrescriptionId = @PrescriptionId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_Seal
    @TenantId           UNIQUEIDENTIFIER,
    @PrescriptionId     UNIQUEIDENTIFIER,
    @SealedAtUtc        DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId AND TenantId = @TenantId
          AND IsDeleted = 0 AND SignedAtUtc IS NOT NULL
    )
        THROW 50556, N'Sólo se sella una receta firmada.', 1;

    UPDATE dbo.Prescription
    SET SealState = N'sellado',
        SealedAtUtc = @SealedAtUtc,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE PrescriptionId = @PrescriptionId
      AND TenantId = @TenantId
      AND SignedAtUtc IS NOT NULL;

    EXEC dbo.sp_Prescription_GetById @TenantId = @TenantId, @PrescriptionId = @PrescriptionId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_Cancel
    @TenantId               UNIQUEIDENTIFIER,
    @PrescriptionId         UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @Reason                 NVARCHAR(1000),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@Reason)), N'') = N''
        THROW 50560, N'Cancelar una receta exige motivo (reverso, no DELETE).', 1;

    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();

    BEGIN TRAN;

    SELECT @SubjectId = SubjectId, @BranchId = BranchId
    FROM dbo.Prescription WITH (UPDLOCK, ROWLOCK)
    WHERE PrescriptionId = @PrescriptionId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    IF @SubjectId IS NULL
        THROW 50503, N'Receta no encontrada.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Prescription
        WHERE PrescriptionId = @PrescriptionId AND TenantId = @TenantId AND CancelledAtUtc IS NOT NULL
    )
        THROW 50561, N'La receta ya está cancelada.', 1;

    UPDATE dbo.Prescription
    SET CancelledAtUtc = @OccurredAtUtc,
        CancelReason = LTRIM(RTRIM(@Reason)),
        CancelledByUserId = @ActorUserId,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE PrescriptionId = @PrescriptionId AND TenantId = @TenantId;

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'prescription.cancel',
        @EntityName = N'Prescription',
        @EntityId = @PrescriptionId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL;

    COMMIT;

    EXEC dbo.sp_Prescription_GetById @TenantId = @TenantId, @PrescriptionId = @PrescriptionId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_GetById
    @TenantId           UNIQUEIDENTIFIER,
    @PrescriptionId     UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PrescriptionId, p.TenantId, p.BranchId, p.EncounterId, p.SubjectId,
        p.ProfessionalId, p.AuthorUserId, p.AuthorDisplayName,
        p.AuthorLicenseSnapshot, p.FacilitySnapshotJson,
        p.IssuedAtUtc, p.ValidUntilUtc,
        p.AllergyStatusAtIssue, p.AllergyStatusCaptureEventId, p.AllergyOverrideJustification,
        p.ContentHash, p.SignedAtUtc, p.SealedAtUtc, p.SealState,
        p.CancelledAtUtc, p.CancelReason, p.GeneralInstructions,
        p.OccurredAtUtc, p.RecordedAtUtc
    FROM dbo.Prescription p
    WHERE p.PrescriptionId = @PrescriptionId
      AND p.TenantId = @TenantId
      AND p.IsDeleted = 0;

    SELECT
        i.PrescriptionItemId, i.PrescriptionId, i.LineNumber, i.MedicationId,
        i.GenericNameSnapshot, i.BrandNameSnapshot, i.DoseJson, i.Route,
        i.FrequencyJson, i.DurationDays, i.Quantity, i.RefillsAllowed, i.Instructions
    FROM dbo.PrescriptionItem i
    WHERE i.PrescriptionId = @PrescriptionId
      AND i.TenantId = @TenantId
    ORDER BY i.LineNumber;
END
GO

-- SC-04: recetas "pendientes" = borrador sin firmar (SignedAtUtc NULL), no canceladas.
CREATE OR ALTER PROCEDURE dbo.sp_Prescription_CountUnsignedByEncounter
    @TenantId       UNIQUEIDENTIFIER,
    @EncounterId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(1)
    FROM dbo.Prescription
    WHERE TenantId = @TenantId
      AND EncounterId = @EncounterId
      AND IsDeleted = 0
      AND CancelledAtUtc IS NULL
      AND SignedAtUtc IS NULL;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Prescription_ListBySubject
    @TenantId       UNIQUEIDENTIFIER,
    @SubjectId      UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PrescriptionId, p.TenantId, p.BranchId, p.EncounterId, p.SubjectId,
        p.ProfessionalId, p.AuthorUserId, p.AuthorDisplayName,
        p.AuthorLicenseSnapshot, p.FacilitySnapshotJson,
        p.IssuedAtUtc, p.ValidUntilUtc,
        p.AllergyStatusAtIssue, p.AllergyStatusCaptureEventId, p.AllergyOverrideJustification,
        p.ContentHash, p.SignedAtUtc, p.SealedAtUtc, p.SealState,
        p.CancelledAtUtc, p.CancelReason, p.GeneralInstructions,
        p.OccurredAtUtc, p.RecordedAtUtc
    FROM dbo.Prescription p
    WHERE p.TenantId = @TenantId
      AND p.SubjectId = @SubjectId
      AND p.IsDeleted = 0
    ORDER BY p.OccurredAtUtc DESC;

    SELECT
        i.PrescriptionItemId, i.PrescriptionId, i.LineNumber, i.MedicationId,
        i.GenericNameSnapshot, i.BrandNameSnapshot, i.DoseJson, i.Route,
        i.FrequencyJson, i.DurationDays, i.Quantity, i.RefillsAllowed, i.Instructions
    FROM dbo.PrescriptionItem i
    INNER JOIN dbo.Prescription p ON p.PrescriptionId = i.PrescriptionId AND p.TenantId = i.TenantId
    WHERE p.TenantId = @TenantId
      AND p.SubjectId = @SubjectId
      AND p.IsDeleted = 0
    ORDER BY i.PrescriptionId, i.LineNumber;
END
GO

PRINT 'sp_Prescription OK';
GO
