-- SPs de triage y signos vitales (M5 / WS-F). CREATE OR ALTER. Sin DELETE/DROP/TRUNCATE.
USE [$(DbName)];
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Escala efectiva: sucursal > tenant (ratificado 2026-08-27).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_TriageScaleConfig_GetEffective
    @TenantId   UNIQUEIDENTIFIER,
    @BranchId   UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Prioridad: sucursal activa, luego tenant.
    IF @BranchId IS NOT NULL
    BEGIN
        IF EXISTS (
            SELECT 1 FROM dbo.TriageScaleConfig
            WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1
        )
        BEGIN
            SELECT ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson,
                   IsActive, UpdatedByUserId, CreatedAtUtc, UpdatedAtUtc,
                   CAST(N'branch' AS NVARCHAR(16)) AS ResolvedFrom
            FROM dbo.TriageScaleConfig
            WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1;
            RETURN;
        END
    END

    SELECT ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson,
           IsActive, UpdatedByUserId, CreatedAtUtc, UpdatedAtUtc,
           CAST(N'tenant' AS NVARCHAR(16)) AS ResolvedFrom
    FROM dbo.TriageScaleConfig
    WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_TriageScaleConfig_Upsert
    @ConfigId           UNIQUEIDENTIFIER,
    @TenantId           UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER = NULL,
    @ScaleCode          NVARCHAR(64),
    @DisplayName        NVARCHAR(200),
    @LevelsJson         NVARCHAR(MAX),
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ScaleCode IS NULL OR LTRIM(RTRIM(@ScaleCode)) = N''
        THROW 50201, N'ScaleCode es obligatorio.', 1;
    IF @DisplayName IS NULL OR LTRIM(RTRIM(@DisplayName)) = N''
        THROW 50201, N'DisplayName es obligatorio.', 1;
    IF @LevelsJson IS NULL OR LTRIM(RTRIM(@LevelsJson)) = N''
        THROW 50201, N'LevelsJson es obligatorio.', 1;
    IF ISJSON(@LevelsJson) <> 1
        THROW 50201, N'LevelsJson debe ser JSON válido.', 1;

    IF @BranchId IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM dbo.Branch
           WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50203, N'La sucursal no existe en el tenant o está dada de baja.', 1;

    BEGIN TRAN;

    -- Baja lógica de la config activa previa en el mismo ámbito (sin DELETE).
    IF @BranchId IS NULL
    BEGIN
        UPDATE dbo.TriageScaleConfig
        SET IsActive = 0, UpdatedAtUtc = SYSUTCDATETIME(), UpdatedByUserId = @ActorUserId
        WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1
          AND ConfigId <> @ConfigId;
    END
    ELSE
    BEGIN
        UPDATE dbo.TriageScaleConfig
        SET IsActive = 0, UpdatedAtUtc = SYSUTCDATETIME(), UpdatedByUserId = @ActorUserId
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1
          AND ConfigId <> @ConfigId;
    END

    IF EXISTS (SELECT 1 FROM dbo.TriageScaleConfig WHERE ConfigId = @ConfigId)
    BEGIN
        UPDATE dbo.TriageScaleConfig
        SET ScaleCode = @ScaleCode,
            DisplayName = @DisplayName,
            LevelsJson = @LevelsJson,
            IsActive = 1,
            UpdatedByUserId = @ActorUserId,
            UpdatedAtUtc = SYSUTCDATETIME(),
            BranchId = @BranchId,
            TenantId = @TenantId
        WHERE ConfigId = @ConfigId AND TenantId = @TenantId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.TriageScaleConfig (
            ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson,
            IsActive, UpdatedByUserId
        )
        VALUES (
            @ConfigId, @TenantId, @BranchId, @ScaleCode, @DisplayName, @LevelsJson,
            1, @ActorUserId
        );
    END

    COMMIT;

    SELECT ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson,
           IsActive, UpdatedByUserId, CreatedAtUtc, UpdatedAtUtc,
           CASE WHEN BranchId IS NULL THEN N'tenant' ELSE N'branch' END AS ResolvedFrom
    FROM dbo.TriageScaleConfig
    WHERE ConfigId = @ConfigId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper implícito vía SP: guarda triage + signos + evento + auditoría.
-- No exige signos medidos. No hace UPDATE del triage vigente previo:
-- baja lógica (IsDeleted=1) e inserta nuevo (append-only efectivo).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Triage_Save
    @TriageId               UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @EncounterId            UNIQUEIDENTIFIER,
    @Level                  NVARCHAR(64) = NULL,
    @ScaleCode              NVARCHAR(64),
    @ScaleConfigId          UNIQUEIDENTIFIER = NULL,
    @LevelPriority          INT = NULL,
    @ChiefComplaint         NVARCHAR(1000) = NULL,
    @PainScore              INT = NULL,
    @PainAssessable         NVARCHAR(32) = N'valorable',
    @VitalsJson             NVARCHAR(MAX) = NULL,   -- array de mediciones; puede ser [] o NULL
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @PrevLevel NVARCHAR(64) = NULL;
    DECLARE @PrevTriageId UNIQUEIDENTIFIER = NULL;
    DECLARE @VitalSetId UNIQUEIDENTIFIER = NEWID();
    DECLARE @EventId UNIQUEIDENTIFIER = NEWID();
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @EventType NVARCHAR(32) = N'saved';
    DECLARE @EventDetailJson NVARCHAR(MAX);
    DECLARE @AuditDetailJson NVARCHAR(MAX);

    IF @ScaleCode IS NULL OR LTRIM(RTRIM(@ScaleCode)) = N''
        THROW 50210, N'ScaleCode es obligatorio (escala efectiva usada).', 1;
    IF @ActorDisplayName IS NULL OR LTRIM(RTRIM(@ActorDisplayName)) = N''
        THROW 50210, N'ActorDisplayName es obligatorio.', 1;
    IF @PainAssessable NOT IN (N'valorable', N'no_valorable')
        THROW 50210, N'PainAssessable inválido (valorable|no_valorable).', 1;
    IF @PainAssessable = N'no_valorable' AND @PainScore IS NOT NULL
        THROW 50210, N'Dolor no valorable no admite PainScore.', 1;
    IF @PainScore IS NOT NULL AND (@PainScore < 0 OR @PainScore > 10)
        THROW 50210, N'PainScore debe estar entre 0 y 10.', 1;
    IF @Level IS NOT NULL AND LTRIM(RTRIM(@Level)) = N''
        SET @Level = NULL;
    IF @Level IS NULL
        SET @LevelPriority = NULL;

    SELECT @BranchId = BranchId, @SubjectId = SubjectId
    FROM dbo.Encounter
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    IF @BranchId IS NULL
        THROW 50211, N'Episodio no encontrado.', 1;

    IF @VitalsJson IS NOT NULL AND ISJSON(@VitalsJson) <> 1
        THROW 50210, N'VitalsJson debe ser JSON válido.', 1;

    SELECT TOP (1) @PrevTriageId = TriageId, @PrevLevel = Level
    FROM dbo.TriageAssessment
    WHERE TenantId = @TenantId AND EncounterId = @EncounterId AND IsDeleted = 0
    ORDER BY OccurredAtUtc DESC;

    IF @PrevTriageId IS NOT NULL
        SET @EventType = N'reclassified';

    SET @EventDetailJson = N'{"vitalSetId":"' + CONVERT(NVARCHAR(36), @VitalSetId) + N'"}';
    SET @AuditDetailJson = N'{"encounterId":"' + CONVERT(NVARCHAR(36), @EncounterId)
        + N'","level":' + CASE WHEN @Level IS NULL THEN N'null' ELSE N'"' + REPLACE(@Level, N'"', N'') + N'"' END
        + N',"eventType":"' + @EventType + N'"}';

    BEGIN TRAN;

    IF @PrevTriageId IS NOT NULL
    BEGIN
        UPDATE dbo.TriageAssessment
        SET IsDeleted = 1
        WHERE TriageId = @PrevTriageId AND TenantId = @TenantId AND IsDeleted = 0;
    END

    INSERT INTO dbo.TriageAssessment (
        TriageId, TenantId, EncounterId, Level, ScaleCode, ScaleConfigId, LevelPriority,
        ChiefComplaint, PainScore, PainAssessable, ClassifiedByProfessionalId,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc
    )
    VALUES (
        @TriageId, @TenantId, @EncounterId, @Level, @ScaleCode, @ScaleConfigId, @LevelPriority,
        @ChiefComplaint, @PainScore, @PainAssessable, @ActorProfessionalId,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc
    );

    INSERT INTO dbo.VitalSignSet (
        VitalSetId, TenantId, EncounterId, TriageId, SourceContext,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @VitalSetId, @TenantId, @EncounterId, @TriageId, N'triage',
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    -- Mediciones: sin fabricar valores. Filas ausentes = no hay fila (UI/Business
    -- normaliza faltantes a no_medido antes de llamar). Aquí sólo persiste lo enviado.
    IF @VitalsJson IS NOT NULL AND LEN(LTRIM(RTRIM(@VitalsJson))) > 2
    BEGIN
        INSERT INTO dbo.VitalSignMeasurement (
            MeasurementId, VitalSetId, TenantId, SignCode, Value, Unit, State, Source, NotMeasuredReason
        )
        SELECT
            NEWID(),
            @VitalSetId,
            @TenantId,
            LOWER(LTRIM(RTRIM(j.signCode))),
            j.value,
            LTRIM(RTRIM(j.unit)),
            LOWER(LTRIM(RTRIM(j.state))),
            LOWER(LTRIM(RTRIM(ISNULL(j.source, N'medido')))),
            NULLIF(LTRIM(RTRIM(j.notMeasuredReason)), N'')
        FROM OPENJSON(@VitalsJson)
        WITH (
            signCode            NVARCHAR(64)  N'$.signCode',
            value               DECIMAL(18,4) N'$.value',
            unit                NVARCHAR(32)  N'$.unit',
            state               NVARCHAR(32)  N'$.state',
            source              NVARCHAR(32)  N'$.source',
            notMeasuredReason   NVARCHAR(500) N'$.notMeasuredReason'
        ) j
        WHERE j.signCode IS NOT NULL AND LTRIM(RTRIM(j.signCode)) <> N''
          AND j.unit IS NOT NULL AND LTRIM(RTRIM(j.unit)) <> N''
          AND j.state IS NOT NULL;
    END

    INSERT INTO dbo.TriageEvent (
        EventId, TenantId, EncounterId, TriageId, EventType,
        FromLevel, ToLevel, DetailJson, ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @EventId, @TenantId, @EncounterId, @TriageId, @EventType,
        @PrevLevel, @Level,
        @EventDetailJson,
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'triage.save',
        @EntityName = N'TriageAssessment',
        @EntityId = @TriageId,
        @SubjectId = @SubjectId,
        @DetailJson = @AuditDetailJson,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    -- Resultado: triage + set de signos (dos result sets).
    SELECT
        t.TriageId, t.TenantId, t.EncounterId, t.Level, t.ScaleCode, t.ScaleConfigId,
        t.LevelPriority, t.ChiefComplaint, t.PainScore, t.PainAssessable,
        t.ClassifiedByProfessionalId, t.ActorUserId, t.ActorProfessionalId,
        t.ActorDisplayName, t.OccurredAtUtc, t.RecordedAtUtc,
        @VitalSetId AS VitalSetId
    FROM dbo.TriageAssessment t
    WHERE t.TriageId = @TriageId AND t.TenantId = @TenantId;

    SELECT
        m.MeasurementId, m.VitalSetId, m.SignCode, m.Value, m.Unit, m.State, m.Source, m.NotMeasuredReason
    FROM dbo.VitalSignMeasurement m
    WHERE m.VitalSetId = @VitalSetId
    ORDER BY m.SignCode;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Triage_GetByEncounter
    @TenantId       UNIQUEIDENTIFIER,
    @EncounterId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TriageId UNIQUEIDENTIFIER;
    DECLARE @VitalSetId UNIQUEIDENTIFIER;

    SELECT TOP (1) @TriageId = TriageId
    FROM dbo.TriageAssessment
    WHERE TenantId = @TenantId AND EncounterId = @EncounterId AND IsDeleted = 0
    ORDER BY OccurredAtUtc DESC;

    IF @TriageId IS NULL
        RETURN;

    SELECT TOP (1) @VitalSetId = VitalSetId
    FROM dbo.VitalSignSet
    WHERE TenantId = @TenantId AND EncounterId = @EncounterId AND TriageId = @TriageId
    ORDER BY OccurredAtUtc DESC;

    SELECT
        t.TriageId, t.TenantId, t.EncounterId, t.Level, t.ScaleCode, t.ScaleConfigId,
        t.LevelPriority, t.ChiefComplaint, t.PainScore, t.PainAssessable,
        t.ClassifiedByProfessionalId, t.ActorUserId, t.ActorProfessionalId,
        t.ActorDisplayName, t.OccurredAtUtc, t.RecordedAtUtc,
        @VitalSetId AS VitalSetId
    FROM dbo.TriageAssessment t
    WHERE t.TriageId = @TriageId;

    IF @VitalSetId IS NOT NULL
    BEGIN
        SELECT
            m.MeasurementId, m.VitalSetId, m.SignCode, m.Value, m.Unit, m.State, m.Source, m.NotMeasuredReason
        FROM dbo.VitalSignMeasurement m
        WHERE m.VitalSetId = @VitalSetId
        ORDER BY m.SignCode;
    END
    ELSE
    BEGIN
        SELECT
            CAST(NULL AS UNIQUEIDENTIFIER) AS MeasurementId,
            CAST(NULL AS UNIQUEIDENTIFIER) AS VitalSetId,
            CAST(NULL AS NVARCHAR(64)) AS SignCode,
            CAST(NULL AS DECIMAL(18,4)) AS Value,
            CAST(NULL AS NVARCHAR(32)) AS Unit,
            CAST(NULL AS NVARCHAR(32)) AS State,
            CAST(NULL AS NVARCHAR(32)) AS Source,
            CAST(NULL AS NVARCHAR(500)) AS NotMeasuredReason
        WHERE 1 = 0;
    END
END
GO

-- Reclasificar = mismo camino que Save con nivel (Business valida).
CREATE OR ALTER PROCEDURE dbo.sp_Triage_Reclassify
    @TriageId               UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @EncounterId            UNIQUEIDENTIFIER,
    @Level                  NVARCHAR(64),
    @ScaleCode              NVARCHAR(64),
    @ScaleConfigId          UNIQUEIDENTIFIER = NULL,
    @LevelPriority          INT = NULL,
    @ChiefComplaint         NVARCHAR(1000) = NULL,
    @PainScore              INT = NULL,
    @PainAssessable         NVARCHAR(32) = N'valorable',
    @VitalsJson             NVARCHAR(MAX) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Level IS NULL OR LTRIM(RTRIM(@Level)) = N''
        THROW 50212, N'Reclasificar exige Level (no se reclasifica a sin_clasificar).', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.TriageAssessment
        WHERE TenantId = @TenantId AND EncounterId = @EncounterId AND IsDeleted = 0
    )
        THROW 50213, N'No hay triage previo para reclasificar; use Save.', 1;

    EXEC dbo.sp_Triage_Save
        @TriageId = @TriageId,
        @TenantId = @TenantId,
        @EncounterId = @EncounterId,
        @Level = @Level,
        @ScaleCode = @ScaleCode,
        @ScaleConfigId = @ScaleConfigId,
        @LevelPriority = @LevelPriority,
        @ChiefComplaint = @ChiefComplaint,
        @PainScore = @PainScore,
        @PainAssessable = @PainAssessable,
        @VitalsJson = @VitalsJson,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_VitalSigns_Append
    @VitalSetId             UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @EncounterId            UNIQUEIDENTIFIER,
    @VitalsJson             NVARCHAR(MAX),
    @SourceContext          NVARCHAR(32) = N'evolucion',
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @AuditDetailJson NVARCHAR(MAX);

    IF @VitalsJson IS NULL OR ISJSON(@VitalsJson) <> 1
        THROW 50220, N'VitalsJson es obligatorio y debe ser JSON válido.', 1;
    IF @SourceContext NOT IN (N'triage', N'evolucion', N'otro')
        THROW 50220, N'SourceContext inválido.', 1;

    SELECT @SubjectId = SubjectId, @BranchId = BranchId
    FROM dbo.Encounter
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    IF @SubjectId IS NULL
        THROW 50211, N'Episodio no encontrado.', 1;

    SET @AuditDetailJson = N'{"encounterId":"' + CONVERT(NVARCHAR(36), @EncounterId) + N'"}';

    BEGIN TRAN;

    INSERT INTO dbo.VitalSignSet (
        VitalSetId, TenantId, EncounterId, TriageId, SourceContext,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @VitalSetId, @TenantId, @EncounterId, NULL, @SourceContext,
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    INSERT INTO dbo.VitalSignMeasurement (
        MeasurementId, VitalSetId, TenantId, SignCode, Value, Unit, State, Source, NotMeasuredReason
    )
    SELECT
        NEWID(),
        @VitalSetId,
        @TenantId,
        LOWER(LTRIM(RTRIM(j.signCode))),
        j.value,
        LTRIM(RTRIM(j.unit)),
        LOWER(LTRIM(RTRIM(j.state))),
        LOWER(LTRIM(RTRIM(ISNULL(j.source, N'medido')))),
        NULLIF(LTRIM(RTRIM(j.notMeasuredReason)), N'')
    FROM OPENJSON(@VitalsJson)
    WITH (
        signCode            NVARCHAR(64)  N'$.signCode',
        value               DECIMAL(18,4) N'$.value',
        unit                NVARCHAR(32)  N'$.unit',
        state               NVARCHAR(32)  N'$.state',
        source              NVARCHAR(32)  N'$.source',
        notMeasuredReason   NVARCHAR(500) N'$.notMeasuredReason'
    ) j
    WHERE j.signCode IS NOT NULL AND LTRIM(RTRIM(j.signCode)) <> N''
      AND j.unit IS NOT NULL AND LTRIM(RTRIM(j.unit)) <> N''
      AND j.state IS NOT NULL;

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'vitals.append',
        @EntityName = N'VitalSignSet',
        @EntityId = @VitalSetId,
        @SubjectId = @SubjectId,
        @DetailJson = @AuditDetailJson,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT
        VitalSetId, TenantId, EncounterId, TriageId, SourceContext,
        ActorUserId, ActorProfessionalId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.VitalSignSet
    WHERE VitalSetId = @VitalSetId;

    SELECT
        MeasurementId, VitalSetId, SignCode, Value, Unit, State, Source, NotMeasuredReason
    FROM dbo.VitalSignMeasurement
    WHERE VitalSetId = @VitalSetId
    ORDER BY SignCode;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_VitalSigns_ListByEncounter
    @TenantId       UNIQUEIDENTIFIER,
    @EncounterId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        VitalSetId, TenantId, EncounterId, TriageId, SourceContext,
        ActorUserId, ActorProfessionalId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.VitalSignSet
    WHERE TenantId = @TenantId AND EncounterId = @EncounterId
    ORDER BY OccurredAtUtc DESC;

    SELECT
        m.MeasurementId, m.VitalSetId, m.SignCode, m.Value, m.Unit, m.State, m.Source, m.NotMeasuredReason
    FROM dbo.VitalSignMeasurement m
    INNER JOIN dbo.VitalSignSet s ON s.VitalSetId = m.VitalSetId
    WHERE s.TenantId = @TenantId AND s.EncounterId = @EncounterId
    ORDER BY s.OccurredAtUtc DESC, m.SignCode;
END
GO
