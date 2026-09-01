-- SPs de expediente / historia clínica (M7 / WS-G). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- Auditoría: GetBySubject registra record.read vía sp_Audit_Append en la misma transacción.
-- Offline commandTypes previstos (handlers Sync en turno aparte):
--   history.save | history.amend | allergyStatus.set | allergy.add
USE [$(DbName)];
GO

-- Cuerpo vacío: todo en no_interrogado. Prohibido negado/normal por omisión (BM-PAC-14).
-- Lista vacía en «conocido» ≠ no_interrogado; aquí valor es NULL con estado no_interrogado.
CREATE OR ALTER FUNCTION dbo.fn_MedicalHistory_EmptyBodyJson()
RETURNS NVARCHAR(MAX)
AS
BEGIN
    RETURN N'{"heredoFamiliares":{"estado":"no_interrogado","valor":null},"personalesPatologicos":{"estado":"no_interrogado","valor":null},"personalesNoPatologicos":{"estado":"no_interrogado","valor":null},"ginecoObstetricos":{"estado":"no_interrogado","valor":null},"aparatosYSistemas":{"estado":"no_interrogado","valor":null},"habitusExterior":{"estado":"no_interrogado","valor":null},"padecimientoActual":{"estado":"no_interrogado","valor":null},"observaciones":null}';
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Ensure expediente (idempotente) + estado alérgico inicial no_interrogado + historia v1
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_ClinicalRecord_EnsureForSubject
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200) = N'sistema',
    @OccurredAtUtc          DATETIME2(3) = NULL,
    @RecordId               UNIQUEIDENTIFIER = NULL OUTPUT,
    @ReturnRow              BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE SubjectId = @SubjectId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50301, N'El sujeto no existe en el tenant o está dado de baja.', 1;

    DECLARE @Now DATETIME2(3) = ISNULL(@OccurredAtUtc, SYSUTCDATETIME());
    DECLARE @Existing UNIQUEIDENTIFIER;
    DECLARE @CreatedNow BIT = 0;

    SELECT @Existing = RecordId
    FROM dbo.ClinicalRecord
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    IF @Existing IS NOT NULL
    BEGIN
        SET @RecordId = @Existing;
        IF @ReturnRow = 1
            SELECT
                r.RecordId, r.TenantId, r.SubjectId, r.OpenedAtUtc,
                r.LastMedicalActAtUtc, r.LastMedicalActType, r.CreatedAtUtc, r.UpdatedAtUtc,
                CAST(0 AS BIT) AS CreatedNow
            FROM dbo.ClinicalRecord r
            WHERE r.RecordId = @Existing;
        RETURN;
    END

    DECLARE @NewId UNIQUEIDENTIFIER = NEWID();
    DECLARE @HistoryId UNIQUEIDENTIFIER = NEWID();
    DECLARE @StatusEventId UNIQUEIDENTIFIER = NEWID();
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Display NVARCHAR(200) = ISNULL(NULLIF(LTRIM(RTRIM(@ActorDisplayName)), N''), N'sistema');

    BEGIN TRAN;

    INSERT INTO dbo.ClinicalRecord (
        RecordId, TenantId, SubjectId, OpenedAtUtc,
        LastMedicalActAtUtc, LastMedicalActType, IsDeleted, CreatedAtUtc, UpdatedAtUtc
    )
    VALUES (
        @NewId, @TenantId, @SubjectId, @Now,
        NULL, NULL, 0, @Now, @Now
    );

    INSERT INTO dbo.MedicalHistory (
        HistoryId, TenantId, RecordId, SubjectId, Version, BodyJson, Origin,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @HistoryId, @TenantId, @NewId, @SubjectId, 1, dbo.fn_MedicalHistory_EmptyBodyJson(), N'capturado',
        @ActorUserId, @ActorProfessionalId, @Display, @Now, @Now
    );

    INSERT INTO dbo.AllergyStatusEvent (
        StatusEventId, TenantId, RecordId, SubjectId, Status,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @StatusEventId, @TenantId, @NewId, @SubjectId, N'no_interrogado',
        @ActorUserId, @ActorProfessionalId, @Display, @Now, @Now
    );

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'record.ensure',
        @EntityName = N'ClinicalRecord',
        @EntityId = @NewId,
        @SubjectId = @SubjectId,
        @DetailJson = N'{"origin":"ensure"}',
        @OccurredAtUtc = @Now,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SET @RecordId = @NewId;
    SET @CreatedNow = 1;

    IF @ReturnRow = 1
        SELECT
            r.RecordId, r.TenantId, r.SubjectId, r.OpenedAtUtc,
            r.LastMedicalActAtUtc, r.LastMedicalActType, r.CreatedAtUtc, r.UpdatedAtUtc,
            @CreatedNow AS CreatedNow
        FROM dbo.ClinicalRecord r
        WHERE r.RecordId = @NewId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Lectura de expediente + auditoría record.read (NOM-004 5.5.1 / 5.7)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_ClinicalRecord_GetBySubject
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3) = NULL,
    @EnsureIfMissing        BIT = 1,
    @ActorDisplayName       NVARCHAR(200) = N'sistema'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME2(3) = ISNULL(@OccurredAtUtc, SYSUTCDATETIME());
    DECLARE @RecordId UNIQUEIDENTIFIER;

    IF @EnsureIfMissing = 1
    BEGIN
        EXEC dbo.sp_ClinicalRecord_EnsureForSubject
            @TenantId = @TenantId,
            @SubjectId = @SubjectId,
            @ActorUserId = @ActorUserId,
            @ActorProfessionalId = @ActorProfessionalId,
            @ActorDisplayName = @ActorDisplayName,
            @OccurredAtUtc = @Now,
            @RecordId = @RecordId OUTPUT,
            @ReturnRow = 0;
    END
    ELSE
    BEGIN
        SELECT @RecordId = RecordId
        FROM dbo.ClinicalRecord
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

        IF @RecordId IS NULL
            THROW 50302, N'Expediente no encontrado para el sujeto.', 1;
    END

    BEGIN TRAN;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'record.read',
        @EntityName = N'ClinicalRecord',
        @EntityId = @RecordId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @Now,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    -- RS0: cabecera
    SELECT
        r.RecordId, r.TenantId, r.SubjectId, r.OpenedAtUtc,
        r.LastMedicalActAtUtc, r.LastMedicalActType, r.CreatedAtUtc, r.UpdatedAtUtc
    FROM dbo.ClinicalRecord r
    WHERE r.RecordId = @RecordId AND r.TenantId = @TenantId;

    -- RS1: historia actual (máxima versión)
    SELECT TOP (1)
        h.HistoryId, h.TenantId, h.RecordId, h.SubjectId, h.Version, h.BodyJson, h.Origin,
        h.ActorUserId, h.ActorProfessionalId, h.ActorDisplayName, h.OccurredAtUtc, h.RecordedAtUtc
    FROM dbo.MedicalHistory h
    WHERE h.TenantId = @TenantId AND h.RecordId = @RecordId
    ORDER BY h.Version DESC;

    -- RS2: addenda de la historia actual
    ;WITH CurrentHist AS (
        SELECT TOP (1) HistoryId
        FROM dbo.MedicalHistory
        WHERE TenantId = @TenantId AND RecordId = @RecordId
        ORDER BY Version DESC
    )
    SELECT
        a.AmendmentId, a.TenantId, a.RecordId, a.HistoryId, a.ReasonText, a.BodyJson,
        a.ActorUserId, a.ActorProfessionalId, a.ActorDisplayName, a.OccurredAtUtc, a.RecordedAtUtc
    FROM dbo.HistoryAmendment a
    INNER JOIN CurrentHist c ON c.HistoryId = a.HistoryId
    WHERE a.TenantId = @TenantId
    ORDER BY a.OccurredAtUtc;

    -- RS3: estado alérgico actual
    SELECT TOP (1)
        e.StatusEventId, e.TenantId, e.RecordId, e.SubjectId, e.Status,
        e.ActorUserId, e.ActorProfessionalId, e.ActorDisplayName, e.OccurredAtUtc, e.RecordedAtUtc
    FROM dbo.AllergyStatusEvent e
    WHERE e.TenantId = @TenantId AND e.RecordId = @RecordId
    ORDER BY e.OccurredAtUtc DESC, e.RecordedAtUtc DESC;

    -- RS4: alergias activas
    SELECT
        al.AllergyId, al.TenantId, al.RecordId, al.SubjectId,
        al.Substance, al.ReactionType, al.Category, al.Manifestation, al.Severity, al.Certainty, al.DataOrigin,
        al.ActorUserId, al.ActorProfessionalId, al.ActorDisplayName, al.OccurredAtUtc, al.RecordedAtUtc
    FROM dbo.Allergy al
    WHERE al.TenantId = @TenantId AND al.RecordId = @RecordId AND al.IsDeleted = 0
    ORDER BY al.OccurredAtUtc;

    -- RS5: flags activos
    SELECT
        f.FlagId, f.TenantId, f.SubjectId, f.RecordId, f.FlagType, f.PayloadJson, f.IsActive,
        f.ActorUserId, f.ActorProfessionalId, f.ActorDisplayName, f.OccurredAtUtc, f.RecordedAtUtc
    FROM dbo.SubjectFlag f
    WHERE f.TenantId = @TenantId AND f.SubjectId = @SubjectId AND f.IsActive = 1
    ORDER BY f.OccurredAtUtc;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Guardar historia = append de nueva versión (nunca UPDATE del BodyJson previo)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_MedicalHistory_Save
    @HistoryId              UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @BodyJson               NVARCHAR(MAX),
    @Origin                 NVARCHAR(40) = N'capturado',
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @BodyJson IS NULL OR LTRIM(RTRIM(@BodyJson)) = N''
        THROW 50310, N'BodyJson de historia clínica es obligatorio.', 1;

    IF @Origin NOT IN (N'capturado', N'prellenado_por_sistema')
        THROW 50311, N'Origin inválido (capturado|prellenado_por_sistema).', 1;

    IF ISNULL(LTRIM(RTRIM(@ActorDisplayName)), N'') = N''
        THROW 50312, N'ActorDisplayName es obligatorio.', 1;

    DECLARE @RecordId UNIQUEIDENTIFIER;

    EXEC dbo.sp_ClinicalRecord_EnsureForSubject
        @TenantId = @TenantId,
        @SubjectId = @SubjectId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc,
        @RecordId = @RecordId OUTPUT,
        @ReturnRow = 0;

    DECLARE @NextVersion INT;
    SELECT @NextVersion = ISNULL(MAX(Version), 0) + 1
    FROM dbo.MedicalHistory WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId AND RecordId = @RecordId;

    BEGIN TRAN;

    INSERT INTO dbo.MedicalHistory (
        HistoryId, TenantId, RecordId, SubjectId, Version, BodyJson, Origin,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @HistoryId, @TenantId, @RecordId, @SubjectId, @NextVersion, @BodyJson, @Origin,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME()
    );

    UPDATE dbo.ClinicalRecord
    SET UpdatedAtUtc = SYSUTCDATETIME()
    WHERE RecordId = @RecordId AND TenantId = @TenantId;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(200) = N'{"version":' + CAST(@NextVersion AS NVARCHAR(20)) + N'}';
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'history.save',
        @EntityName = N'MedicalHistory',
        @EntityId = @HistoryId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SELECT
        h.HistoryId, h.TenantId, h.RecordId, h.SubjectId, h.Version, h.BodyJson, h.Origin,
        h.ActorUserId, h.ActorProfessionalId, h.ActorDisplayName, h.OccurredAtUtc, h.RecordedAtUtc
    FROM dbo.MedicalHistory h
    WHERE h.HistoryId = @HistoryId AND h.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_MedicalHistory_AddAmendment
    @AmendmentId            UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @HistoryId              UNIQUEIDENTIFIER = NULL,
    @ReasonText             NVARCHAR(2000),
    @BodyJson               NVARCHAR(MAX) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ReasonText)), N'') = N''
        THROW 50320, N'ReasonText del addendum es obligatorio.', 1;

    DECLARE @RecordId UNIQUEIDENTIFIER;
    SELECT @RecordId = RecordId
    FROM dbo.ClinicalRecord
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    IF @RecordId IS NULL
        THROW 50302, N'Expediente no encontrado para el sujeto.', 1;

    IF @HistoryId IS NULL
    BEGIN
        SELECT TOP (1) @HistoryId = HistoryId
        FROM dbo.MedicalHistory
        WHERE TenantId = @TenantId AND RecordId = @RecordId
        ORDER BY Version DESC;
    END

    IF @HistoryId IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM dbo.MedicalHistory
            WHERE HistoryId = @HistoryId AND TenantId = @TenantId AND RecordId = @RecordId
        )
        THROW 50321, N'Historia clínica objetivo no encontrada.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.HistoryAmendment (
        AmendmentId, TenantId, RecordId, HistoryId, ReasonText, BodyJson,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @AmendmentId, @TenantId, @RecordId, @HistoryId, @ReasonText, @BodyJson,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME()
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'history.amend',
        @EntityName = N'HistoryAmendment',
        @EntityId = @AmendmentId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SELECT
        a.AmendmentId, a.TenantId, a.RecordId, a.HistoryId, a.ReasonText, a.BodyJson,
        a.ActorUserId, a.ActorProfessionalId, a.ActorDisplayName, a.OccurredAtUtc, a.RecordedAtUtc
    FROM dbo.HistoryAmendment a
    WHERE a.AmendmentId = @AmendmentId AND a.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_AllergyStatus_Set
    @StatusEventId          UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @Status                 NVARCHAR(40),
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Status NOT IN (
        N'no_interrogado', N'niega', N'refiere', N'se_desconoce', N'paciente_no_puede_responder'
    )
        THROW 50330, N'Status alérgico inválido.', 1;

    DECLARE @RecordId UNIQUEIDENTIFIER;
    EXEC dbo.sp_ClinicalRecord_EnsureForSubject
        @TenantId = @TenantId,
        @SubjectId = @SubjectId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc,
        @RecordId = @RecordId OUTPUT,
        @ReturnRow = 0;

    BEGIN TRAN;

    INSERT INTO dbo.AllergyStatusEvent (
        StatusEventId, TenantId, RecordId, SubjectId, Status,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @StatusEventId, @TenantId, @RecordId, @SubjectId, @Status,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME()
    );

    UPDATE dbo.ClinicalRecord
    SET UpdatedAtUtc = SYSUTCDATETIME()
    WHERE RecordId = @RecordId AND TenantId = @TenantId;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(200) = N'{"status":"' + @Status + N'"}';
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'allergyStatus.set',
        @EntityName = N'AllergyStatusEvent',
        @EntityId = @StatusEventId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SELECT
        e.StatusEventId, e.TenantId, e.RecordId, e.SubjectId, e.Status,
        e.ActorUserId, e.ActorProfessionalId, e.ActorDisplayName, e.OccurredAtUtc, e.RecordedAtUtc
    FROM dbo.AllergyStatusEvent e
    WHERE e.StatusEventId = @StatusEventId AND e.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Allergy_Add
    @AllergyId              UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @Substance              NVARCHAR(200),
    @ReactionType           NVARCHAR(40),
    @Category               NVARCHAR(40) = NULL,
    @Manifestation          NVARCHAR(500) = NULL,
    @Severity               NVARCHAR(40) = NULL,
    @Certainty              NVARCHAR(40) = NULL,
    @DataOrigin             NVARCHAR(64) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@Substance)), N'') = N''
        THROW 50340, N'Substance es obligatoria.', 1;

    IF @ReactionType NOT IN (N'alergia', N'intolerancia', N'efecto_adverso_conocido')
        THROW 50341, N'ReactionType inválido.', 1;

    DECLARE @RecordId UNIQUEIDENTIFIER;
    EXEC dbo.sp_ClinicalRecord_EnsureForSubject
        @TenantId = @TenantId,
        @SubjectId = @SubjectId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc,
        @RecordId = @RecordId OUTPUT,
        @ReturnRow = 0;

    BEGIN TRAN;

    INSERT INTO dbo.Allergy (
        AllergyId, TenantId, RecordId, SubjectId,
        Substance, ReactionType, Category, Manifestation, Severity, Certainty, DataOrigin,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc, IsDeleted
    )
    VALUES (
        @AllergyId, @TenantId, @RecordId, @SubjectId,
        LTRIM(RTRIM(@Substance)), @ReactionType, @Category, @Manifestation, @Severity, @Certainty, @DataOrigin,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME(), 0
    );

    -- Si el estado actual no es «refiere», se asienta «refiere» (append) para no dejar lista
    -- con alergias y estado no_interrogado (SC-01 / BM-PAC-01).
    DECLARE @CurrentStatus NVARCHAR(40);
    SELECT TOP (1) @CurrentStatus = Status
    FROM dbo.AllergyStatusEvent
    WHERE TenantId = @TenantId AND RecordId = @RecordId
    ORDER BY OccurredAtUtc DESC, RecordedAtUtc DESC;

    IF @CurrentStatus IS NULL OR @CurrentStatus <> N'refiere'
    BEGIN
        INSERT INTO dbo.AllergyStatusEvent (
            StatusEventId, TenantId, RecordId, SubjectId, Status,
            ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
        )
        VALUES (
            NEWID(), @TenantId, @RecordId, @SubjectId, N'refiere',
            @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME()
        );
    END

    UPDATE dbo.ClinicalRecord
    SET UpdatedAtUtc = SYSUTCDATETIME()
    WHERE RecordId = @RecordId AND TenantId = @TenantId;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'allergy.add',
        @EntityName = N'Allergy',
        @EntityId = @AllergyId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SELECT
        al.AllergyId, al.TenantId, al.RecordId, al.SubjectId,
        al.Substance, al.ReactionType, al.Category, al.Manifestation, al.Severity, al.Certainty, al.DataOrigin,
        al.ActorUserId, al.ActorProfessionalId, al.ActorDisplayName, al.OccurredAtUtc, al.RecordedAtUtc
    FROM dbo.Allergy al
    WHERE al.AllergyId = @AllergyId AND al.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Allergy_SoftDelete
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @AllergyId              UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @RecordId UNIQUEIDENTIFIER;
    SELECT @RecordId = RecordId
    FROM dbo.ClinicalRecord
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    IF @RecordId IS NULL
        THROW 50302, N'Expediente no encontrado para el sujeto.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Allergy
        WHERE AllergyId = @AllergyId AND TenantId = @TenantId AND RecordId = @RecordId AND IsDeleted = 0
    )
        THROW 50342, N'Alergia no encontrada o ya dada de baja.', 1;

    BEGIN TRAN;

    UPDATE dbo.Allergy
    SET IsDeleted = 1,
        SoftDeletedAtUtc = @OccurredAtUtc,
        SoftDeletedByUserId = @ActorUserId
    WHERE AllergyId = @AllergyId AND TenantId = @TenantId AND IsDeleted = 0;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = NULL,
        @BranchId = NULL,
        @EventType = N'allergy.softDelete',
        @EntityName = N'Allergy',
        @EntityId = @AllergyId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    SELECT CAST(1 AS BIT) AS SoftDeleted;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_SubjectFlag_Set
    @FlagId                 UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @FlagType               NVARCHAR(40),
    @PayloadJson            NVARCHAR(MAX) = NULL,
    @IsActive               BIT = 1,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @FlagType NOT IN (N'alergia_grave', N'riesgo', N'embarazo', N'otro')
        THROW 50350, N'FlagType inválido.', 1;

    DECLARE @RecordId UNIQUEIDENTIFIER;
    EXEC dbo.sp_ClinicalRecord_EnsureForSubject
        @TenantId = @TenantId,
        @SubjectId = @SubjectId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @ActorDisplayName = @ActorDisplayName,
        @OccurredAtUtc = @OccurredAtUtc,
        @RecordId = @RecordId OUTPUT,
        @ReturnRow = 0;

    BEGIN TRAN;

    -- Desactivar flags activos del mismo tipo (append semántico: baja lógica del anterior).
    UPDATE dbo.SubjectFlag
    SET IsActive = 0,
        DeactivatedAtUtc = @OccurredAtUtc
    WHERE TenantId = @TenantId
      AND SubjectId = @SubjectId
      AND FlagType = @FlagType
      AND IsActive = 1;

    IF @IsActive = 1
    BEGIN
        INSERT INTO dbo.SubjectFlag (
            FlagId, TenantId, SubjectId, RecordId, FlagType, PayloadJson, IsActive,
            ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
        )
        VALUES (
            @FlagId, @TenantId, @SubjectId, @RecordId, @FlagType, @PayloadJson, 1,
            @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc, SYSUTCDATETIME()
        );
    END

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = NULL,
        @EventType = N'subjectFlag.set',
        @EntityName = N'SubjectFlag',
        @EntityId = @FlagId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT;

    IF @IsActive = 1
        SELECT
            f.FlagId, f.TenantId, f.SubjectId, f.RecordId, f.FlagType, f.PayloadJson, f.IsActive,
            f.ActorUserId, f.ActorProfessionalId, f.ActorDisplayName, f.OccurredAtUtc, f.RecordedAtUtc
        FROM dbo.SubjectFlag f
        WHERE f.FlagId = @FlagId AND f.TenantId = @TenantId;
    ELSE
        SELECT
            @FlagId AS FlagId, @TenantId AS TenantId, @SubjectId AS SubjectId, @RecordId AS RecordId,
            @FlagType AS FlagType, @PayloadJson AS PayloadJson, CAST(0 AS BIT) AS IsActive,
            @ActorUserId AS ActorUserId, @ActorProfessionalId AS ActorProfessionalId,
            @ActorDisplayName AS ActorDisplayName, @OccurredAtUtc AS OccurredAtUtc,
            SYSUTCDATETIME() AS RecordedAtUtc;
END
GO

-- Pregunta H abierta: actualiza el reloj sin afirmar qué ActType son válidos.
CREATE OR ALTER PROCEDURE dbo.sp_ClinicalRecord_TouchMedicalAct
    @TenantId               UNIQUEIDENTIFIER,
    @RecordId               UNIQUEIDENTIFIER,
    @ActUtc                 DATETIME2(3),
    @ActType                NVARCHAR(64),
    @ActorUserId            UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ActType)), N'') = N''
        THROW 50360, N'ActType es obligatorio (lista de actos que cuentan: pendiente pregunta H).', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalRecord
        WHERE RecordId = @RecordId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50302, N'Expediente no encontrado.', 1;

    BEGIN TRAN;

    UPDATE dbo.ClinicalRecord
    SET LastMedicalActAtUtc = CASE
            WHEN LastMedicalActAtUtc IS NULL OR @ActUtc >= LastMedicalActAtUtc THEN @ActUtc
            ELSE LastMedicalActAtUtc
        END,
        LastMedicalActType = CASE
            WHEN LastMedicalActAtUtc IS NULL OR @ActUtc >= LastMedicalActAtUtc THEN @ActType
            ELSE LastMedicalActType
        END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE RecordId = @RecordId AND TenantId = @TenantId;

    COMMIT;

    SELECT
        r.RecordId, r.TenantId, r.SubjectId, r.OpenedAtUtc,
        r.LastMedicalActAtUtc, r.LastMedicalActType, r.CreatedAtUtc, r.UpdatedAtUtc
    FROM dbo.ClinicalRecord r
    WHERE r.RecordId = @RecordId AND r.TenantId = @TenantId;
END
GO
