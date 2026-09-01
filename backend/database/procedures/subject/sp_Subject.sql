-- SPs de sujeto e identidad progresiva (M3 / WS-D). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- Auditoría: cada mutación invoca sp_Audit_Append en la misma transacción del hecho.
USE [$(DbName)];
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Config de etiqueta: cascada sucursal > tenant
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_UnidentifiedLabelConfig_GetEffective
    @TenantId   UNIQUEIDENTIFIER,
    @BranchId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Sucursal gana si existe activa; si no, tenant.
    IF EXISTS (
        SELECT 1 FROM dbo.UnidentifiedLabelConfig
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1
    )
    BEGIN
        SELECT ConfigId, TenantId, BranchId, SchemeCode, SchemeParamsJson, IsActive,
               CreatedAtUtc, UpdatedAtUtc, UpdatedByUserId,
               CAST(N'sucursal' AS NVARCHAR(16)) AS ResolvedFrom
        FROM dbo.UnidentifiedLabelConfig
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1;
        RETURN;
    END

    SELECT ConfigId, TenantId, BranchId, SchemeCode, SchemeParamsJson, IsActive,
           CreatedAtUtc, UpdatedAtUtc, UpdatedByUserId,
           CAST(N'tenant' AS NVARCHAR(16)) AS ResolvedFrom
    FROM dbo.UnidentifiedLabelConfig
    WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_UnidentifiedLabelConfig_Upsert
    @ConfigId           UNIQUEIDENTIFIER,
    @TenantId           UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER = NULL,
    @SchemeCode         NVARCHAR(64),
    @SchemeParamsJson   NVARCHAR(MAX),
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    BEGIN TRAN;

    -- Desactivar la config activa del mismo ámbito (baja lógica; no DELETE).
    IF @BranchId IS NULL
    BEGIN
        UPDATE dbo.UnidentifiedLabelConfig
        SET IsActive = 0, UpdatedAtUtc = @NowUtc, UpdatedByUserId = @ActorUserId
        WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1 AND ConfigId <> @ConfigId;
    END
    ELSE
    BEGIN
        UPDATE dbo.UnidentifiedLabelConfig
        SET IsActive = 0, UpdatedAtUtc = @NowUtc, UpdatedByUserId = @ActorUserId
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsActive = 1 AND ConfigId <> @ConfigId;
    END

    IF EXISTS (SELECT 1 FROM dbo.UnidentifiedLabelConfig WHERE ConfigId = @ConfigId AND TenantId = @TenantId)
    BEGIN
        UPDATE dbo.UnidentifiedLabelConfig
        SET SchemeCode = @SchemeCode,
            SchemeParamsJson = @SchemeParamsJson,
            BranchId = @BranchId,
            IsActive = 1,
            UpdatedAtUtc = @NowUtc,
            UpdatedByUserId = @ActorUserId
        WHERE ConfigId = @ConfigId AND TenantId = @TenantId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.UnidentifiedLabelConfig (
            ConfigId, TenantId, BranchId, SchemeCode, SchemeParamsJson, IsActive, UpdatedByUserId
        )
        VALUES (
            @ConfigId, @TenantId, @BranchId, @SchemeCode, @SchemeParamsJson, 1, @ActorUserId
        );
    END

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @BranchId = @BranchId,
        @EventType = N'unidentified_label_config.upsert',
        @EntityName = N'UnidentifiedLabelConfig',
        @EntityId = @ConfigId,
        @DetailJson = @SchemeParamsJson,
        @OccurredAtUtc = @NowUtc;

    COMMIT;

    SELECT ConfigId, TenantId, BranchId, SchemeCode, SchemeParamsJson, IsActive,
           CreatedAtUtc, UpdatedAtUtc, UpdatedByUserId,
           CASE WHEN BranchId IS NULL THEN N'tenant' ELSE N'sucursal' END AS ResolvedFrom
    FROM dbo.UnidentifiedLabelConfig
    WHERE ConfigId = @ConfigId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Crear sujeto (sólo BranchId obligatorio a nivel de negocio)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_Create
    @SubjectId              UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @BranchId               UNIQUEIDENTIFIER,
    @IdentificationState    NVARCHAR(40),
    @GivenName              NVARCHAR(100) = NULL,
    @FirstSurname           NVARCHAR(100) = NULL,
    @SecondSurname          NVARCHAR(100) = NULL,
    @PreferredName          NVARCHAR(100) = NULL,
    @BirthDate              DATE = NULL,
    @EstimatedAgeJson       NVARCHAR(400) = NULL,
    @BiologicalSex          NVARCHAR(32) = NULL,
    @SexSource              NVARCHAR(32) = NULL,
    @GenderIdentity         NVARCHAR(8) = NULL,   -- opcional; NULL = no capturado; no usar en clínica
    @Curp                   NVARCHAR(18) = NULL,
    @BloodTypeJson          NVARCHAR(400) = NULL,
    @RecordNumber           NVARCHAR(64) = NULL,
    @ApparentSex            NVARCHAR(32) = NULL,
    @ApparentAgeRange       NVARCHAR(64) = NULL,
    @ArrivalAtUtc           DATETIME2(3) = NULL,
    @DescriptorFreeText     NVARCHAR(500) = NULL,
    @IssueTemporaryLabel    BIT = 0,
    @LabelId                UNIQUEIDENTIFIER = NULL,
    @InternalCode           NVARCHAR(128) = NULL,
    @OperationalLabel       NVARCHAR(64) = NULL,
    @ConfigSnapshotJson     NVARCHAR(MAX) = NULL,
    @DeviceId               UNIQUEIDENTIFIER = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
    )
    BEGIN
        THROW 50021, N'La sucursal no existe en el tenant o está dada de baja.', 1;
    END

    -- Centinelas SINBA prohibidos en el modelo clínico.
    IF @BirthDate = CONVERT(DATE, '9999-09-09')
    BEGIN
        THROW 50022, N'Fecha centinela SINBA (09/09/9999) prohibida en Subject; usar NULL o edad estimada.', 1;
    END

    IF @Curp IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND Curp = @Curp AND IsDeleted = 0
    )
    BEGIN
        THROW 50023, N'Ya existe un sujeto con esa CURP en el tenant.', 1;
    END

    BEGIN TRAN;

    INSERT INTO dbo.Subject (
        SubjectId, TenantId, OriginBranchId, RecordNumber, IdentificationState,
        GivenName, FirstSurname, SecondSurname, PreferredName,
        BirthDate, EstimatedAgeJson, BiologicalSex, SexSource, GenderIdentity, Curp, BloodTypeJson,
        CreatedAtUtc, UpdatedAtUtc
    )
    VALUES (
        @SubjectId, @TenantId, @BranchId, @RecordNumber, @IdentificationState,
        @GivenName, @FirstSurname, @SecondSurname, @PreferredName,
        @BirthDate, @EstimatedAgeJson, @BiologicalSex, @SexSource, @GenderIdentity, @Curp, @BloodTypeJson,
        SYSUTCDATETIME(), SYSUTCDATETIME()
    );

    DECLARE @EventId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO dbo.SubjectIdentityEvent (
        EventId, TenantId, SubjectId, FromState, ToState,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @EventId, @TenantId, @SubjectId, NULL, @IdentificationState,
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    IF @ApparentSex IS NOT NULL OR @ApparentAgeRange IS NOT NULL
       OR @ArrivalAtUtc IS NOT NULL OR @DescriptorFreeText IS NOT NULL
    BEGIN
        INSERT INTO dbo.SubjectDescriptor (
            DescriptorId, TenantId, SubjectId, ApparentSex, ApparentAgeRange,
            ArrivalAtUtc, DescriptorText
        )
        VALUES (
            NEWID(), @TenantId, @SubjectId, @ApparentSex, @ApparentAgeRange,
            @ArrivalAtUtc, @DescriptorFreeText
        );
    END

    IF @IssueTemporaryLabel = 1
    BEGIN
        IF @LabelId IS NULL OR @InternalCode IS NULL OR @OperationalLabel IS NULL
        BEGIN
            THROW 50024, N'Emisión de etiqueta temporal exige LabelId, InternalCode y OperationalLabel.', 1;
        END

        INSERT INTO dbo.SubjectTemporaryLabel (
            LabelId, TenantId, SubjectId, BranchId, InternalCode, OperationalLabel,
            ConfigSnapshotJson, DeviceId, IsActive
        )
        VALUES (
            @LabelId, @TenantId, @SubjectId, @BranchId, @InternalCode, @OperationalLabel,
            @ConfigSnapshotJson, @DeviceId, 1
        );
    END

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(MAX) = CONCAT(
        N'{"identificationState":"', @IdentificationState,
        N'","issuedLabel":', CASE WHEN @IssueTemporaryLabel = 1 THEN N'true' ELSE N'false' END, N'}');

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'subject.create',
        @EntityName = N'Subject',
        @EntityId = @SubjectId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = @DeviceId;

    COMMIT;

    -- Devolver sujeto + etiqueta activa + descriptor (mismo shape que GetById)
    EXEC dbo.sp_Subject_GetById @TenantId = @TenantId, @SubjectId = @SubjectId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- GetById — resuelve cadena de vínculos (sobreviviente)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_GetById
    @TenantId   UNIQUEIDENTIFIER,
    @SubjectId  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Cierre de vínculos: seguir absorciones activas (sin reversión posterior).
    DECLARE @ResolvedId UNIQUEIDENTIFIER = @SubjectId;
    DECLARE @Hop INT = 0;
    DECLARE @NextId UNIQUEIDENTIFIER;

    WHILE @Hop < 20
    BEGIN
        SET @NextId = NULL;
        SELECT TOP (1) @NextId = l.SurvivingSubjectId
        FROM dbo.SubjectLink l
        WHERE l.TenantId = @TenantId
          AND l.AbsorbedSubjectId = @ResolvedId
          AND l.LinkType = N'vinculacion'
          AND NOT EXISTS (
              SELECT 1 FROM dbo.SubjectLink r
              WHERE r.TenantId = @TenantId
                AND r.RevertsLinkId = l.LinkId
                AND r.LinkType = N'vinculacion_revertida'
          )
        ORDER BY l.RecordedAtUtc DESC;

        IF @NextId IS NULL BREAK;
        SET @ResolvedId = @NextId;
        SET @Hop = @Hop + 1;
    END

    -- Result set 1: sujeto
    SELECT
        s.SubjectId, s.TenantId, s.OriginBranchId, s.RecordNumber, s.IdentificationState,
        s.GivenName, s.FirstSurname, s.SecondSurname, s.PreferredName,
        s.BirthDate, s.EstimatedAgeJson, s.BiologicalSex, s.SexSource, s.GenderIdentity,
        s.Curp, s.CurpValidatedAtUtc, s.BloodTypeJson, s.DeceasedAtUtc,
        s.IsDeleted, s.CreatedAtUtc, s.UpdatedAtUtc,
        CASE WHEN @ResolvedId <> @SubjectId THEN @SubjectId ELSE NULL END AS RequestedSubjectId,
        @ResolvedId AS ResolvedSubjectId
    FROM dbo.Subject s
    WHERE s.TenantId = @TenantId
      AND s.SubjectId = @ResolvedId
      AND s.IsDeleted = 0;

    -- Result set 2: etiqueta activa
    SELECT TOP (1)
        LabelId, TenantId, SubjectId, BranchId, InternalCode, OperationalLabel,
        ConfigSnapshotJson, IssuedAtUtc, DeviceId, IsActive
    FROM dbo.SubjectTemporaryLabel
    WHERE TenantId = @TenantId AND SubjectId = @ResolvedId AND IsActive = 1
    ORDER BY IssuedAtUtc DESC;

    -- Result set 3: descriptor
    SELECT TOP (1)
        DescriptorId, TenantId, SubjectId, ApparentSex, ApparentAgeRange,
        ArrivalAtUtc, DescriptorText AS [FreeText], CreatedAtUtc, UpdatedAtUtc
    FROM dbo.SubjectDescriptor
    WHERE TenantId = @TenantId AND SubjectId = @ResolvedId;

    -- Result set 4: señas (acceso restringido se aplica en API)
    SELECT
        MarkId, TenantId, SubjectId, RawText, MarkType, AnatomicalRegion,
        Laterality, Description, StructuredAtUtc,
        ActorUserId, ActorProfessionalId, ActorDisplayName,
        OccurredAtUtc, RecordedAtUtc
    FROM dbo.SubjectDistinctiveMark
    WHERE TenantId = @TenantId AND SubjectId = @ResolvedId AND IsDeleted = 0
    ORDER BY OccurredAtUtc DESC;

    -- Result set 5: pertenencias
    SELECT
        BelongingId, TenantId, SubjectId, Description, Category,
        ActorUserId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.SubjectBelonging
    WHERE TenantId = @TenantId AND SubjectId = @ResolvedId AND IsDeleted = 0
    ORDER BY OccurredAtUtc DESC;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Search padrón
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_Search
    @TenantId               UNIQUEIDENTIFIER,
    @Query                  NVARCHAR(200) = NULL,
    @IncludeUnidentified    BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Q NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Query)), N'');

    SELECT TOP (100)
        s.SubjectId, s.TenantId, s.OriginBranchId, s.RecordNumber, s.IdentificationState,
        s.GivenName, s.FirstSurname, s.SecondSurname, s.PreferredName,
        s.BirthDate, s.EstimatedAgeJson, s.BiologicalSex, s.SexSource, s.GenderIdentity,
        s.Curp, s.CreatedAtUtc, s.UpdatedAtUtc,
        tl.OperationalLabel, tl.InternalCode,
        d.ApparentSex, d.ApparentAgeRange, d.ArrivalAtUtc, d.DescriptorText AS DescriptorFreeText
    FROM dbo.Subject s
    OUTER APPLY (
        SELECT TOP (1) OperationalLabel, InternalCode
        FROM dbo.SubjectTemporaryLabel t
        WHERE t.TenantId = s.TenantId AND t.SubjectId = s.SubjectId AND t.IsActive = 1
        ORDER BY t.IssuedAtUtc DESC
    ) tl
    LEFT JOIN dbo.SubjectDescriptor d
        ON d.TenantId = s.TenantId AND d.SubjectId = s.SubjectId
    WHERE s.TenantId = @TenantId
      AND s.IsDeleted = 0
      AND (
            @IncludeUnidentified = 1
            OR s.IdentificationState <> N'no_identificado'
      )
      AND (
            @Q IS NULL
            OR s.GivenName LIKE N'%' + @Q + N'%'
            OR s.FirstSurname LIKE N'%' + @Q + N'%'
            OR s.SecondSurname LIKE N'%' + @Q + N'%'
            OR s.Curp LIKE N'%' + @Q + N'%'
            OR s.RecordNumber LIKE N'%' + @Q + N'%'
            OR tl.OperationalLabel LIKE N'%' + @Q + N'%'
            OR tl.InternalCode LIKE N'%' + @Q + N'%'
      )
    ORDER BY s.UpdatedAtUtc DESC;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- UpdateIdentity
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_UpdateIdentity
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @GivenName              NVARCHAR(100) = NULL,
    @FirstSurname           NVARCHAR(100) = NULL,
    @SecondSurname          NVARCHAR(100) = NULL,
    @PreferredName          NVARCHAR(100) = NULL,
    @BirthDate              DATE = NULL,
    @ClearBirthDate         BIT = 0,
    @EstimatedAgeJson       NVARCHAR(400) = NULL,
    @ClearEstimatedAge      BIT = 0,
    @BiologicalSex          NVARCHAR(32) = NULL,
    @ClearBiologicalSex     BIT = 0,
    @SexSource              NVARCHAR(32) = NULL,
    @GenderIdentity         NVARCHAR(8) = NULL,
    @ClearGenderIdentity    BIT = 0,
    @Curp                   NVARCHAR(18) = NULL,
    @ClearCurp              BIT = 0,
    @BloodTypeJson          NVARCHAR(400) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0
    )
        RETURN;

    IF @BirthDate = CONVERT(DATE, '9999-09-09')
    BEGIN
        THROW 50022, N'Fecha centinela SINBA (09/09/9999) prohibida en Subject.', 1;
    END

    IF @Curp IS NOT NULL AND @ClearCurp = 0 AND EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND Curp = @Curp AND SubjectId <> @SubjectId AND IsDeleted = 0
    )
    BEGIN
        THROW 50023, N'Ya existe un sujeto con esa CURP en el tenant.', 1;
    END

    BEGIN TRAN;

    UPDATE dbo.Subject
    SET
        GivenName = COALESCE(@GivenName, GivenName),
        FirstSurname = COALESCE(@FirstSurname, FirstSurname),
        SecondSurname = COALESCE(@SecondSurname, SecondSurname),
        PreferredName = COALESCE(@PreferredName, PreferredName),
        BirthDate = CASE WHEN @ClearBirthDate = 1 THEN NULL ELSE COALESCE(@BirthDate, BirthDate) END,
        EstimatedAgeJson = CASE WHEN @ClearEstimatedAge = 1 THEN NULL ELSE COALESCE(@EstimatedAgeJson, EstimatedAgeJson) END,
        BiologicalSex = CASE WHEN @ClearBiologicalSex = 1 THEN NULL ELSE COALESCE(@BiologicalSex, BiologicalSex) END,
        SexSource = CASE WHEN @ClearBiologicalSex = 1 THEN NULL ELSE COALESCE(@SexSource, SexSource) END,
        GenderIdentity = CASE WHEN @ClearGenderIdentity = 1 THEN NULL ELSE COALESCE(@GenderIdentity, GenderIdentity) END,
        Curp = CASE WHEN @ClearCurp = 1 THEN NULL ELSE COALESCE(@Curp, Curp) END,
        BloodTypeJson = COALESCE(@BloodTypeJson, BloodTypeJson),
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.update_identity',
        @EntityName = N'Subject',
        @EntityId = @SubjectId,
        @SubjectId = @SubjectId,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    EXEC dbo.sp_Subject_GetById @TenantId = @TenantId, @SubjectId = @SubjectId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- TransitionIdentityState
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_TransitionIdentityState
    @EventId                UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @ToState                NVARCHAR(40),
    @EvidenceType           NVARCHAR(64) = NULL,
    @EvidenceReference      NVARCHAR(256) = NULL,
    @Justification          NVARCHAR(1000) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @FromState NVARCHAR(40);

    SELECT @FromState = IdentificationState
    FROM dbo.Subject
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    IF @FromState IS NULL
        RETURN;

    IF @FromState = @ToState
    BEGIN
        THROW 50025, N'La transición de identidad no cambia el estado actual.', 1;
    END

    -- Máquina mínima (validación reforzada en Business).
    IF @ToState NOT IN (
        N'no_identificado', N'declarada_sin_documento', N'verificada_con_documento',
        N'rectificada', N'no_recuperable'
    )
    BEGIN
        THROW 50026, N'Estado de identificación no reconocido.', 1;
    END

    IF @ToState IN (N'rectificada', N'no_recuperable') AND (
        @Justification IS NULL OR LTRIM(RTRIM(@Justification)) = N''
    )
    BEGIN
        THROW 50027, N'Justificación obligatoria para rectificación o no recuperable.', 1;
    END

    IF @ToState = N'verificada_con_documento' AND (
        @EvidenceType IS NULL OR LTRIM(RTRIM(@EvidenceType)) = N''
    )
    BEGIN
        THROW 50028, N'Verificación con documento exige EvidenceType.', 1;
    END

    BEGIN TRAN;

    INSERT INTO dbo.SubjectIdentityEvent (
        EventId, TenantId, SubjectId, FromState, ToState,
        EvidenceType, EvidenceReference, Justification,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @EventId, @TenantId, @SubjectId, @FromState, @ToState,
        @EvidenceType, @EvidenceReference, @Justification,
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    UPDATE dbo.Subject
    SET IdentificationState = @ToState, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(MAX) = CONCAT(
        N'{"from":"', @FromState, N'","to":"', @ToState, N'"}');

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @EventType = N'subject.identity_state',
        @EntityName = N'SubjectIdentityEvent',
        @EntityId = @EventId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT
        EventId, TenantId, SubjectId, FromState, ToState,
        EvidenceType, EvidenceReference, Justification,
        ActorUserId, ActorProfessionalId, OccurredAtUtc, RecordedAtUtc,
        @ToState AS ProjectedState
    FROM dbo.SubjectIdentityEvent
    WHERE EventId = @EventId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- IssueTemporaryLabel
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_IssueTemporaryLabel
    @LabelId                UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @BranchId               UNIQUEIDENTIFIER,
    @InternalCode           NVARCHAR(128),
    @OperationalLabel       NVARCHAR(64),
    @ConfigSnapshotJson     NVARCHAR(MAX) = NULL,
    @DeviceId               UNIQUEIDENTIFIER = NULL,
    @ActorUserId            UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0
    )
        RETURN;

    BEGIN TRAN;

    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    -- Desactivar etiquetas previas del sujeto (baja lógica).
    UPDATE dbo.SubjectTemporaryLabel
    SET IsActive = 0
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsActive = 1;

    INSERT INTO dbo.SubjectTemporaryLabel (
        LabelId, TenantId, SubjectId, BranchId, InternalCode, OperationalLabel,
        ConfigSnapshotJson, DeviceId, IsActive
    )
    VALUES (
        @LabelId, @TenantId, @SubjectId, @BranchId, @InternalCode, @OperationalLabel,
        @ConfigSnapshotJson, @DeviceId, 1
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @BranchId = @BranchId,
        @EventType = N'subject.issue_label',
        @EntityName = N'SubjectTemporaryLabel',
        @EntityId = @LabelId,
        @SubjectId = @SubjectId,
        @DetailJson = @ConfigSnapshotJson,
        @OccurredAtUtc = @NowUtc,
        @DeviceId = @DeviceId;

    COMMIT;

    SELECT LabelId, TenantId, SubjectId, BranchId, InternalCode, OperationalLabel,
           ConfigSnapshotJson, IssuedAtUtc, DeviceId, IsActive
    FROM dbo.SubjectTemporaryLabel
    WHERE LabelId = @LabelId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Señas y pertenencias
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_AddDistinctiveMark
    @MarkId                 UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @RawText                NVARCHAR(500) = NULL,
    @MarkType               NVARCHAR(64) = NULL,
    @AnatomicalRegion       NVARCHAR(64) = NULL,
    @Laterality             NVARCHAR(32) = NULL,
    @Description            NVARCHAR(500) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0
    )
        RETURN;

    BEGIN TRAN;

    INSERT INTO dbo.SubjectDistinctiveMark (
        MarkId, TenantId, SubjectId, RawText, MarkType, AnatomicalRegion,
        Laterality, Description, StructuredAtUtc,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc
    )
    VALUES (
        @MarkId, @TenantId, @SubjectId, @RawText, @MarkType, @AnatomicalRegion,
        @Laterality, @Description,
        CASE WHEN @MarkType IS NOT NULL THEN SYSUTCDATETIME() ELSE NULL END,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @EventType = N'subject.add_mark',
        @EntityName = N'SubjectDistinctiveMark',
        @EntityId = @MarkId,
        @SubjectId = @SubjectId,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT
        MarkId, TenantId, SubjectId, RawText, MarkType, AnatomicalRegion,
        Laterality, Description, StructuredAtUtc,
        ActorUserId, ActorProfessionalId, ActorDisplayName,
        OccurredAtUtc, RecordedAtUtc
    FROM dbo.SubjectDistinctiveMark
    WHERE MarkId = @MarkId AND TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_AddBelonging
    @BelongingId            UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @Description            NVARCHAR(500),
    @Category               NVARCHAR(64) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0
    )
        RETURN;

    BEGIN TRAN;

    INSERT INTO dbo.SubjectBelonging (
        BelongingId, TenantId, SubjectId, Description, Category, ActorUserId, OccurredAtUtc
    )
    VALUES (
        @BelongingId, @TenantId, @SubjectId, @Description, @Category, @ActorUserId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.add_belonging',
        @EntityName = N'SubjectBelonging',
        @EntityId = @BelongingId,
        @SubjectId = @SubjectId,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT BelongingId, TenantId, SubjectId, Description, Category,
           ActorUserId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.SubjectBelonging
    WHERE BelongingId = @BelongingId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- SearchByDescription — coincidencias al personal, sin nombres
-- Audita también búsquedas sin resultado (doc 08 §7)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_SearchByDescription
    @TenantId           UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER = NULL,
    @ApparentSex        NVARCHAR(32) = NULL,
    @AgeMin             INT = NULL,
    @AgeMax             INT = NULL,
    @MarkType           NVARCHAR(64) = NULL,
    @AnatomicalRegion   NVARCHAR(64) = NULL,
    @Laterality         NVARCHAR(32) = NULL,
    @ArrivalFromUtc     DATETIME2(3) = NULL,
    @ArrivalToUtc       DATETIME2(3) = NULL,
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Matches TABLE (
        SubjectId           UNIQUEIDENTIFIER NOT NULL,
        OperationalLabel    NVARCHAR(64) NULL,
        ArrivalAtUtc        DATETIME2(3) NULL
    );

    INSERT INTO @Matches (SubjectId, OperationalLabel, ArrivalAtUtc)
    SELECT DISTINCT s.SubjectId, tl.OperationalLabel, d.ArrivalAtUtc
    FROM dbo.Subject s
    LEFT JOIN dbo.SubjectDescriptor d
        ON d.TenantId = s.TenantId AND d.SubjectId = s.SubjectId
    OUTER APPLY (
        SELECT TOP (1) OperationalLabel
        FROM dbo.SubjectTemporaryLabel t
        WHERE t.TenantId = s.TenantId AND t.SubjectId = s.SubjectId AND t.IsActive = 1
        ORDER BY t.IssuedAtUtc DESC
    ) tl
    WHERE s.TenantId = @TenantId
      AND s.IsDeleted = 0
      AND (@BranchId IS NULL OR s.OriginBranchId = @BranchId)
      AND (@ApparentSex IS NULL OR d.ApparentSex = @ApparentSex)
      AND (@ArrivalFromUtc IS NULL OR d.ArrivalAtUtc >= @ArrivalFromUtc)
      AND (@ArrivalToUtc IS NULL OR d.ArrivalAtUtc <= @ArrivalToUtc)
      AND (
            (@MarkType IS NULL AND @AnatomicalRegion IS NULL AND @Laterality IS NULL)
            OR EXISTS (
                SELECT 1 FROM dbo.SubjectDistinctiveMark m
                WHERE m.TenantId = s.TenantId
                  AND m.SubjectId = s.SubjectId
                  AND m.IsDeleted = 0
                  AND (@MarkType IS NULL OR m.MarkType = @MarkType)
                  AND (@AnatomicalRegion IS NULL OR m.AnatomicalRegion = @AnatomicalRegion)
                  AND (@Laterality IS NULL OR m.Laterality = @Laterality)
            )
      );

    DECLARE @Count INT = (SELECT COUNT(*) FROM @Matches);
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(MAX) = CONCAT(N'{"matchCount":', @Count, N'}');
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @BranchId = @BranchId,
        @EventType = N'subject.search_by_description',
        @EntityName = N'Subject',
        @EntityId = @TenantId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @NowUtc;

    SELECT @Count AS MatchCount;

    SELECT SubjectId, OperationalLabel, ArrivalAtUtc
    FROM @Matches
    ORDER BY ArrivalAtUtc DESC;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Link / SoftDelete / ConsentLapse / MergeQueue (mínimos)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Subject_Link
    @LinkId                 UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @AbsorbedSubjectId      UNIQUEIDENTIFIER,
    @SurvivingSubjectId     UNIQUEIDENTIFIER,
    @Justification          NVARCHAR(1000),
    @ActorUserId            UNIQUEIDENTIFIER,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @AbsorbedSubjectId = @SurvivingSubjectId
    BEGIN
        THROW 50029, N'No se puede vincular un sujeto consigo mismo.', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Subject WHERE TenantId = @TenantId AND SubjectId = @AbsorbedSubjectId AND IsDeleted = 0)
       OR NOT EXISTS (SELECT 1 FROM dbo.Subject WHERE TenantId = @TenantId AND SubjectId = @SurvivingSubjectId AND IsDeleted = 0)
    BEGIN
        THROW 50030, N'Ambos sujetos deben existir en el tenant.', 1;
    END

    BEGIN TRAN;

    INSERT INTO dbo.SubjectLink (
        LinkId, TenantId, AbsorbedSubjectId, SurvivingSubjectId, LinkType,
        Justification, ActorUserId, OccurredAtUtc
    )
    VALUES (
        @LinkId, @TenantId, @AbsorbedSubjectId, @SurvivingSubjectId, N'vinculacion',
        @Justification, @ActorUserId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.link',
        @EntityName = N'SubjectLink',
        @EntityId = @LinkId,
        @SubjectId = @SurvivingSubjectId,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT LinkId, TenantId, AbsorbedSubjectId, SurvivingSubjectId, LinkType,
           Justification, ActorUserId, OccurredAtUtc, RecordedAtUtc, RevertsLinkId
    FROM dbo.SubjectLink
    WHERE LinkId = @LinkId AND TenantId = @TenantId;
END
GO

-- Reversión append-only (doc 08 §6.2 / SC-22): evento compensatorio + estado rectificada.
-- Prohibido DELETE del vínculo original. La alerta SubjectFlag la emite la API tras el SP
-- (sp_SubjectFlag_Set / expediente), para no acoplar el orden de despliegue de SPs.
CREATE OR ALTER PROCEDURE dbo.sp_Subject_RevertLink
    @RevertLinkId           UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @OriginalLinkId         UNIQUEIDENTIFIER,
    @Justification          NVARCHAR(1000),
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Justification IS NULL OR LTRIM(RTRIM(@Justification)) = N''
        THROW 50031, N'La reversión de vinculación exige justificación.', 1;

    DECLARE @Absorbed UNIQUEIDENTIFIER;
    DECLARE @Surviving UNIQUEIDENTIFIER;
    DECLARE @LinkType NVARCHAR(40);

    SELECT
        @Absorbed = AbsorbedSubjectId,
        @Surviving = SurvivingSubjectId,
        @LinkType = LinkType
    FROM dbo.SubjectLink
    WHERE LinkId = @OriginalLinkId AND TenantId = @TenantId;

    IF @Absorbed IS NULL
        THROW 50032, N'Vínculo no encontrado en el tenant.', 1;

    IF @SubjectId <> @Absorbed AND @SubjectId <> @Surviving
        THROW 50036, N'El sujeto de la ruta no participa en el vínculo.', 1;

    IF @LinkType <> N'vinculacion'
        THROW 50033, N'Sólo se revierten vínculos de tipo vinculacion.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.SubjectLink
        WHERE TenantId = @TenantId
          AND RevertsLinkId = @OriginalLinkId
          AND LinkType = N'vinculacion_revertida'
    )
        THROW 50034, N'El vínculo ya fue revertido (append-only; no se borra).', 1;

    DECLARE @FromState NVARCHAR(40);
    DECLARE @IdentityEventId UNIQUEIDENTIFIER = NEWID();

    SELECT @FromState = IdentificationState
    FROM dbo.Subject
    WHERE TenantId = @TenantId AND SubjectId = @Absorbed AND IsDeleted = 0;

    IF @FromState IS NULL
        THROW 50035, N'El sujeto absorbido no existe o está dado de baja.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.SubjectLink (
        LinkId, TenantId, AbsorbedSubjectId, SurvivingSubjectId, LinkType,
        Justification, ActorUserId, OccurredAtUtc, RevertsLinkId
    )
    VALUES (
        @RevertLinkId, @TenantId, @Absorbed, @Surviving, N'vinculacion_revertida',
        @Justification, @ActorUserId, @OccurredAtUtc, @OriginalLinkId
    );

    -- Estado rectificada en el absorbido (doc 08 §6.2); sin reescribir hechos clínicos.
    IF @FromState <> N'rectificada'
    BEGIN
        INSERT INTO dbo.SubjectIdentityEvent (
            EventId, TenantId, SubjectId, FromState, ToState,
            EvidenceType, EvidenceReference, Justification,
            ActorUserId, ActorProfessionalId, OccurredAtUtc
        )
        VALUES (
            @IdentityEventId, @TenantId, @Absorbed, @FromState, N'rectificada',
            N'vinculacion_revertida', CONVERT(NVARCHAR(36), @OriginalLinkId), @Justification,
            @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
        );

        UPDATE dbo.Subject
        SET IdentificationState = N'rectificada', UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId AND SubjectId = @Absorbed AND IsDeleted = 0;
    END

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(MAX) = CONCAT(
        N'{"originalLinkId":"', CONVERT(NVARCHAR(36), @OriginalLinkId),
        N'","revertLinkId":"', CONVERT(NVARCHAR(36), @RevertLinkId),
        N'","absorbedSubjectId":"', CONVERT(NVARCHAR(36), @Absorbed),
        N'","survivingSubjectId":"', CONVERT(NVARCHAR(36), @Surviving),
        N'","identityEventId":"', CONVERT(NVARCHAR(36), @IdentityEventId),
        N'"}');

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @EventType = N'subject.link.revert',
        @EntityName = N'SubjectLink',
        @EntityId = @RevertLinkId,
        @SubjectId = @Absorbed,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT LinkId, TenantId, AbsorbedSubjectId, SurvivingSubjectId, LinkType,
           Justification, ActorUserId, OccurredAtUtc, RecordedAtUtc, RevertsLinkId
    FROM dbo.SubjectLink
    WHERE LinkId = @RevertLinkId AND TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_SoftDelete
    @TenantId       UNIQUEIDENTIFIER,
    @SubjectId      UNIQUEIDENTIFIER,
    @ActorUserId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    UPDATE dbo.Subject
    SET IsDeleted = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0;

    IF @@ROWCOUNT = 0
    BEGIN
        COMMIT;
        RETURN;
    END

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.soft_delete',
        @EntityName = N'Subject',
        @EntityId = @SubjectId,
        @SubjectId = @SubjectId,
        @OccurredAtUtc = @NowUtc;

    COMMIT;

    SELECT 1 AS SoftDeleted;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_RegisterConsentLapse
    @LapseId            UNIQUEIDENTIFIER,
    @TenantId           UNIQUEIDENTIFIER,
    @SubjectId          UNIQUEIDENTIFIER,
    @LapseReason        NVARCHAR(128),
    @OccurredAtUtc      DATETIME2(3),
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    INSERT INTO dbo.SubjectConsentLapse (
        LapseId, TenantId, SubjectId, LapseReason, OccurredAtUtc, ActorUserId
    )
    VALUES (
        @LapseId, @TenantId, @SubjectId, @LapseReason, @OccurredAtUtc, @ActorUserId
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.consent_lapse',
        @EntityName = N'SubjectConsentLapse',
        @EntityId = @LapseId,
        @SubjectId = @SubjectId,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT LapseId, TenantId, SubjectId, LapseReason, OccurredAtUtc, ActorUserId, RecordedAtUtc
    FROM dbo.SubjectConsentLapse
    WHERE LapseId = @LapseId AND TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Subject_EnqueueMergeCandidate
    @CaseId         UNIQUEIDENTIFIER,
    @TenantId       UNIQUEIDENTIFIER,
    @SubjectIdA     UNIQUEIDENTIFIER,
    @SubjectIdB     UNIQUEIDENTIFIER,
    @Score          DECIMAL(5,4),
    @ActorUserId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    INSERT INTO dbo.SubjectMergeQueue (
        CaseId, TenantId, SubjectIdA, SubjectIdB, Score, Status, EnqueuedByUserId
    )
    VALUES (
        @CaseId, @TenantId, @SubjectIdA, @SubjectIdB, @Score, N'pendiente', @ActorUserId
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @EventType = N'subject.merge_enqueue',
        @EntityName = N'SubjectMergeQueue',
        @EntityId = @CaseId,
        @OccurredAtUtc = @NowUtc;

    COMMIT;

    SELECT CaseId, TenantId, SubjectIdA, SubjectIdB, Score, Status,
           EnqueuedByUserId, EnqueuedAtUtc, ResolvedByUserId, ResolvedAtUtc, ResolutionNote
    FROM dbo.SubjectMergeQueue
    WHERE CaseId = @CaseId AND TenantId = @TenantId;
END
GO

PRINT 'sp_Subject OK';
GO
