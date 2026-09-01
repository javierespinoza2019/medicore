-- SPs de episodio / urgencias (M4 / WS-E). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- Auditoría: cada mutación invoca sp_Audit_Append en la misma transacción.
-- Offline commandTypes previstos (handlers Sync en turno aparte):
--   encounter.open | encounter.admission | encounter.state
--   encounter.mpNotice | encounter.careWithoutConsent | encounter.assignProfessional
USE [$(DbName)];
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Abrir episodio (sólo SubjectId + BranchId + tipo; nada admin bloquea)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_Open
    @EncounterId            UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @BranchId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER,
    @EncounterType          NVARCHAR(32),
    @ArrivalAtUtc           DATETIME2(3),
    @AccessRoute            NVARCHAR(128) = NULL,
    @AdmissionCircumstance  NVARCHAR(64) = NULL,
    @AdmissionCircumstanceText NVARCHAR(500) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @EncounterType NOT IN (N'urgencias', N'consulta_externa')
        THROW 50108, N'EncounterType inválido (urgencias|consulta_externa).', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50103, N'La sucursal no existe en el tenant o está dada de baja.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE SubjectId = @SubjectId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50102, N'El sujeto no existe en el tenant.', 1;

    BEGIN TRAN;

    -- Turno del día (UTC) por sucursal: correlativo, sin fabricar clínico.
    DECLARE @DayStart DATETIME2(3) = CONVERT(DATETIME2(3), CONVERT(DATE, @ArrivalAtUtc));
    DECLARE @DayEnd   DATETIME2(3) = DATEADD(DAY, 1, @DayStart);
    DECLARE @TurnNumber INT;
    SELECT @TurnNumber = ISNULL(MAX(TurnNumber), 0) + 1
    FROM dbo.Encounter WITH (UPDLOCK, HOLDLOCK)
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND ArrivalAtUtc >= @DayStart
      AND ArrivalAtUtc < @DayEnd
      AND IsDeleted = 0;

    INSERT INTO dbo.Encounter (
        EncounterId, TenantId, BranchId, SubjectId, EncounterType, State,
        Disposition, ArrivalAtUtc, AccessRoute, AdmissionCircumstance, AdmissionCircumstanceText,
        MinisterioPublicoNotified, AttendingProfessionalId, TurnNumber,
        CreatedByUserId, CreatedByProfessionalId, CreatedAtUtc, UpdatedAtUtc
    )
    VALUES (
        @EncounterId, @TenantId, @BranchId, @SubjectId, @EncounterType, N'abierto',
        NULL, @ArrivalAtUtc, @AccessRoute, @AdmissionCircumstance, @AdmissionCircumstanceText,
        NULL, -- no valorado; nunca false por omisión
        @ActorProfessionalId, @TurnNumber,
        @ActorUserId, @ActorProfessionalId, SYSUTCDATETIME(), SYSUTCDATETIME()
    );

    DECLARE @EventId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO dbo.EncounterStateEvent (
        EventId, TenantId, EncounterId, FromState, ToState,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @EventId, @TenantId, @EncounterId, NULL, N'abierto',
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(400) = N'{"encounterType":"' + @EncounterType + N'","turnNumber":'
        + CONVERT(NVARCHAR(12), @TurnNumber) + N'}';
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'encounter.open',
        @EntityName = N'Encounter',
        @EntityId = @EncounterId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    EXEC dbo.sp_Encounter_GetById @TenantId = @TenantId, @EncounterId = @EncounterId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_GetById
    @TenantId       UNIQUEIDENTIFIER,
    @EncounterId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EncounterId, e.TenantId, e.BranchId, e.SubjectId, e.EncounterType, e.State,
        e.Disposition, e.ArrivalAtUtc, e.AccessRoute, e.AdmissionCircumstance,
        e.AdmissionCircumstanceText, e.MinisterioPublicoNotified, e.AttendingProfessionalId,
        e.TurnNumber, e.ClosedAtUtc, e.CreatedByUserId, e.CreatedByProfessionalId,
        e.CreatedAtUtc, e.UpdatedAtUtc,
        -- Triage aún no existe (M5): siempre sin clasificar.
        CAST(NULL AS NVARCHAR(64)) AS TriageLevel,
        CAST(NULL AS NVARCHAR(64)) AS TriageScaleCode,
        s.GivenName, s.FirstSurname, s.SecondSurname, s.PreferredName,
        s.IdentificationState,
        lbl.OperationalLabel,
        lbl.InternalCode
    FROM dbo.Encounter e
    INNER JOIN dbo.Subject s ON s.SubjectId = e.SubjectId AND s.TenantId = e.TenantId
    OUTER APPLY (
        SELECT TOP (1) t.OperationalLabel, t.InternalCode
        FROM dbo.SubjectTemporaryLabel t
        WHERE t.SubjectId = e.SubjectId AND t.TenantId = e.TenantId AND t.IsActive = 1
        ORDER BY t.IssuedAtUtc DESC
    ) lbl
    WHERE e.EncounterId = @EncounterId
      AND e.TenantId = @TenantId
      AND e.IsDeleted = 0;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_UpdateAdmissionData
    @TenantId                   UNIQUEIDENTIFIER,
    @EncounterId                UNIQUEIDENTIFIER,
    @AccessRoute                NVARCHAR(128) = NULL,
    @AdmissionCircumstance      NVARCHAR(64) = NULL,
    @AdmissionCircumstanceText  NVARCHAR(500) = NULL,
    @MinisterioPublicoNotified  BIT = NULL,
    @ClearMpNotified            BIT = 0,          -- 1 = volver a «no valorado» (NULL)
    @SetMpNotified              BIT = 0,          -- 1 = aplicar @MinisterioPublicoNotified (incluye 0/1)
    @ActorUserId                UNIQUEIDENTIFIER,
    @ActorProfessionalId        UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc              DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Encounter
        WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50107, N'Episodio no encontrado.', 1;

    BEGIN TRAN;

    UPDATE dbo.Encounter
    SET AccessRoute = COALESCE(@AccessRoute, AccessRoute),
        AdmissionCircumstance = COALESCE(@AdmissionCircumstance, AdmissionCircumstance),
        AdmissionCircumstanceText = COALESCE(@AdmissionCircumstanceText, AdmissionCircumstanceText),
        MinisterioPublicoNotified = CASE
            WHEN @ClearMpNotified = 1 THEN NULL
            WHEN @SetMpNotified = 1 THEN @MinisterioPublicoNotified
            ELSE MinisterioPublicoNotified
        END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    SELECT @SubjectId = SubjectId, @BranchId = BranchId
    FROM dbo.Encounter WHERE EncounterId = @EncounterId AND TenantId = @TenantId;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'encounter.admission',
        @EntityName = N'Encounter',
        @EntityId = @EncounterId,
        @SubjectId = @SubjectId,
        @DetailJson = N'{"action":"update_admission"}',
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    EXEC dbo.sp_Encounter_GetById @TenantId = @TenantId, @EncounterId = @EncounterId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_TransitionState
    @TenantId                           UNIQUEIDENTIFIER,
    @EncounterId                        UNIQUEIDENTIFIER,
    @EventId                            UNIQUEIDENTIFIER,
    @ToState                            NVARCHAR(32),
    @Disposition                        NVARCHAR(40) = NULL,
    @Justification                      NVARCHAR(1000) = NULL,
    @PendingPrescriptionsOverrideReason NVARCHAR(1000) = NULL,
    @ActorUserId                        UNIQUEIDENTIFIER,
    @ActorProfessionalId                UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc                      DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ToState NOT IN (N'abierto', N'en_observacion', N'cerrado')
        THROW 50108, N'Estado de episodio inválido (abierto|en_observacion|cerrado).', 1;

    DECLARE @FromState NVARCHAR(32);
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @CurrentDisposition NVARCHAR(40);
    DECLARE @PendingUnsigned INT = 0;
    DECLARE @OverrideNorm NVARCHAR(1000) = NULL;

    SELECT @FromState = State, @SubjectId = SubjectId, @BranchId = BranchId,
           @CurrentDisposition = Disposition
    FROM dbo.Encounter
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    IF @FromState IS NULL
        THROW 50107, N'Episodio no encontrado.', 1;

    IF @FromState = @ToState
        THROW 50104, N'El episodio ya está en ese estado.', 1;

    IF @FromState = N'cerrado'
        THROW 50104, N'No se puede transicionar un episodio cerrado.', 1;

    -- Máquina: abierto ↔ en_observacion; cualquiera abierto/en_observacion → cerrado.
    IF NOT (
        (@FromState = N'abierto' AND @ToState IN (N'en_observacion', N'cerrado'))
        OR (@FromState = N'en_observacion' AND @ToState IN (N'abierto', N'cerrado'))
    )
        THROW 50104, N'Transición de estado no permitida.', 1;

    IF @ToState = N'cerrado'
    BEGIN
        IF @Disposition IS NULL OR LTRIM(RTRIM(@Disposition)) = N''
            THROW 50108, N'El cierre exige Disposition (sin default a alta_domicilio).', 1;

        IF @Disposition NOT IN (
            N'alta_domicilio', N'traslado', N'alta_voluntaria',
            N'defuncion', N'fuga', N'referencia'
        )
            THROW 50108, N'Disposition inválida.', 1;

        -- Cierre sin motivo documentado → 422 en API.
        IF @Justification IS NULL OR LTRIM(RTRIM(@Justification)) = N''
            THROW 50106, N'El cierre exige justificación (motivo).', 1;

        -- Bloqueo legítimo: cierre sin triage (SC-03). M5 creará TriageAssessment.
        IF OBJECT_ID(N'dbo.TriageAssessment', N'U') IS NOT NULL
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM dbo.TriageAssessment
                WHERE EncounterId = @EncounterId
                  AND TenantId = @TenantId
                  AND Level IS NOT NULL
                  AND IsDeleted = 0
            )
                THROW 50101, N'No se puede cerrar el episodio sin clasificación de triage.', 1;
        END
        ELSE
        BEGIN
            -- Tabla aún no existe: no hay clasificación posible → bloquear cierre.
            THROW 50101, N'No se puede cerrar el episodio sin clasificación de triage.', 1;
        END

        -- SC-04: alta con recetas sin firmar exige motivo de forzado (fuente dura).
        IF OBJECT_ID(N'dbo.Prescription', N'U') IS NOT NULL
        BEGIN
            SELECT @PendingUnsigned = COUNT(1)
            FROM dbo.Prescription
            WHERE TenantId = @TenantId
              AND EncounterId = @EncounterId
              AND IsDeleted = 0
              AND CancelledAtUtc IS NULL
              AND SignedAtUtc IS NULL;

            IF @PendingUnsigned > 0
            BEGIN
                SET @OverrideNorm = NULLIF(LTRIM(RTRIM(@PendingPrescriptionsOverrideReason)), N'');
                IF @OverrideNorm IS NULL
                BEGIN
                    DECLARE @PendingRxErr NVARCHAR(400) =
                        N'CLOSE_WITH_PENDING_RX:' + CAST(@PendingUnsigned AS NVARCHAR(10))
                        + N':El alta está bloqueada: hay recetas sin firmar. Para forzarla envíe pendingPrescriptionsOverrideReason.';
                    THROW 50109, @PendingRxErr, 1;
                END
            END
        END
    END

    BEGIN TRAN;

    UPDATE dbo.Encounter
    SET State = @ToState,
        Disposition = CASE WHEN @ToState = N'cerrado' THEN @Disposition ELSE Disposition END,
        ClosedAtUtc = CASE WHEN @ToState = N'cerrado' THEN @OccurredAtUtc ELSE ClosedAtUtc END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    INSERT INTO dbo.EncounterStateEvent (
        EventId, TenantId, EncounterId, FromState, ToState, Disposition, Justification,
        ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        @EventId, @TenantId, @EncounterId, @FromState, @ToState,
        CASE WHEN @ToState = N'cerrado' THEN @Disposition ELSE NULL END,
        @Justification,
        @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Detail NVARCHAR(600) =
        N'{"from":"' + @FromState + N'","to":"' + @ToState + N'"}';
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'encounter.state',
        @EntityName = N'Encounter',
        @EntityId = @EncounterId,
        @SubjectId = @SubjectId,
        @DetailJson = @Detail,
        @OccurredAtUtc = @OccurredAtUtc;

    -- SC-04: excepción clínica auditable en la misma TX del cierre forzado.
    IF @ToState = N'cerrado' AND @PendingUnsigned > 0 AND @OverrideNorm IS NOT NULL
    BEGIN
        DECLARE @ExceptionAuditId UNIQUEIDENTIFIER = NEWID();
        DECLARE @ExceptionDetail NVARCHAR(MAX) =
            N'{"pendingCount":' + CAST(@PendingUnsigned AS NVARCHAR(20))
            + N',"reason":"'
            + REPLACE(REPLACE(@OverrideNorm, N'\', N'\\'), N'"', N'\"')
            + N'"}';
        EXEC dbo.sp_Audit_Append
            @AuditEventId = @ExceptionAuditId,
            @TenantId = @TenantId,
            @ActorUserId = @ActorUserId,
            @ActorProfessionalId = @ActorProfessionalId,
            @BranchId = @BranchId,
            @EventType = N'clinical_exception.discharge_with_pending_prescriptions',
            @EntityName = N'Encounter',
            @EntityId = @EncounterId,
            @SubjectId = @SubjectId,
            @DetailJson = @ExceptionDetail,
            @OccurredAtUtc = @OccurredAtUtc;
    END

    COMMIT;

    EXEC dbo.sp_Encounter_GetById @TenantId = @TenantId, @EncounterId = @EncounterId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_AssignProfessional
    @TenantId               UNIQUEIDENTIFIER,
    @EncounterId            UNIQUEIDENTIFIER,
    @ProfessionalId         UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Encounter
        WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50107, N'Episodio no encontrado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @ProfessionalId
          AND TenantId = @TenantId
          AND IsDeleted = 0
          AND IsActive = 1
    )
        THROW 50108, N'Profesional no encontrado o inactivo.', 1;

    BEGIN TRAN;

    UPDATE dbo.Encounter
    SET AttendingProfessionalId = @ProfessionalId,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @BranchId UNIQUEIDENTIFIER;
    SELECT @SubjectId = SubjectId, @BranchId = BranchId
    FROM dbo.Encounter WHERE EncounterId = @EncounterId AND TenantId = @TenantId;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'encounter.assignProfessional',
        @EntityName = N'Encounter',
        @EntityId = @EncounterId,
        @SubjectId = @SubjectId,
        @DetailJson = N'{"action":"assign"}',
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    EXEC dbo.sp_Encounter_GetById @TenantId = @TenantId, @EncounterId = @EncounterId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
-- Cola: sin clasificar arriba (prioridad 0), luego nivel, estado, llegada.
-- M5: TriageLevel / prioridad desde TriageAssessment vigente (si existe).
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_ListQueue
    @TenantId       UNIQUEIDENTIFIER,
    @BranchId       UNIQUEIDENTIFIER,
    @IncludeClosed  BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50103, N'La sucursal no existe en el tenant o está dada de baja.', 1;

    SELECT
        e.EncounterId, e.TenantId, e.BranchId, e.SubjectId, e.EncounterType, e.State,
        e.Disposition, e.ArrivalAtUtc, e.AccessRoute, e.AdmissionCircumstance,
        e.AdmissionCircumstanceText, e.MinisterioPublicoNotified, e.AttendingProfessionalId,
        e.TurnNumber, e.ClosedAtUtc, e.CreatedByUserId, e.CreatedByProfessionalId,
        e.CreatedAtUtc, e.UpdatedAtUtc,
        tri.Level AS TriageLevel,
        tri.ScaleCode AS TriageScaleCode,
        -- 0 = sin clasificar (arriba). Clasificado: LevelPriority de la escala (1+).
        CAST(CASE
            WHEN tri.TriageId IS NULL OR tri.Level IS NULL THEN 0
            WHEN tri.LevelPriority IS NULL THEN 1
            ELSE tri.LevelPriority
        END AS INT) AS TriagePriority,
        CASE e.State
            WHEN N'abierto' THEN 0
            WHEN N'en_observacion' THEN 1
            WHEN N'cerrado' THEN 2
            ELSE 9
        END AS StateSort,
        s.GivenName, s.FirstSurname, s.SecondSurname, s.PreferredName,
        s.IdentificationState,
        lbl.OperationalLabel,
        lbl.InternalCode
    FROM dbo.Encounter e
    INNER JOIN dbo.Subject s ON s.SubjectId = e.SubjectId AND s.TenantId = e.TenantId
    OUTER APPLY (
        SELECT TOP (1) t.OperationalLabel, t.InternalCode
        FROM dbo.SubjectTemporaryLabel t
        WHERE t.SubjectId = e.SubjectId AND t.TenantId = e.TenantId AND t.IsActive = 1
        ORDER BY t.IssuedAtUtc DESC
    ) lbl
    OUTER APPLY (
        SELECT TOP (1) ta.TriageId, ta.Level, ta.ScaleCode, ta.LevelPriority
        FROM dbo.TriageAssessment ta
        WHERE ta.EncounterId = e.EncounterId AND ta.TenantId = e.TenantId AND ta.IsDeleted = 0
        ORDER BY ta.OccurredAtUtc DESC
    ) tri
    WHERE e.TenantId = @TenantId
      AND e.BranchId = @BranchId
      AND e.IsDeleted = 0
      AND e.EncounterType = N'urgencias'
      AND (@IncludeClosed = 1 OR e.State <> N'cerrado')
    ORDER BY
        TriagePriority ASC,
        StateSort ASC,
        e.ArrivalAtUtc ASC;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_Encounter_ListBySubject
    @TenantId       UNIQUEIDENTIFIER,
    @SubjectId      UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EncounterId, e.TenantId, e.BranchId, e.SubjectId, e.EncounterType, e.State,
        e.Disposition, e.ArrivalAtUtc, e.AccessRoute, e.AdmissionCircumstance,
        e.AdmissionCircumstanceText, e.MinisterioPublicoNotified, e.AttendingProfessionalId,
        e.TurnNumber, e.ClosedAtUtc, e.CreatedByUserId, e.CreatedByProfessionalId,
        e.CreatedAtUtc, e.UpdatedAtUtc,
        CAST(NULL AS NVARCHAR(64)) AS TriageLevel,
        CAST(NULL AS NVARCHAR(64)) AS TriageScaleCode,
        s.GivenName, s.FirstSurname, s.SecondSurname, s.PreferredName,
        s.IdentificationState,
        lbl.OperationalLabel,
        lbl.InternalCode
    FROM dbo.Encounter e
    INNER JOIN dbo.Subject s ON s.SubjectId = e.SubjectId AND s.TenantId = e.TenantId
    OUTER APPLY (
        SELECT TOP (1) t.OperationalLabel, t.InternalCode
        FROM dbo.SubjectTemporaryLabel t
        WHERE t.SubjectId = e.SubjectId AND t.TenantId = e.TenantId AND t.IsActive = 1
        ORDER BY t.IssuedAtUtc DESC
    ) lbl
    WHERE e.TenantId = @TenantId
      AND e.SubjectId = @SubjectId
      AND e.IsDeleted = 0
    ORDER BY e.ArrivalAtUtc DESC;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_MinisterioPublicoNotice_Create
    @NoticeId                   UNIQUEIDENTIFIER,
    @TenantId                   UNIQUEIDENTIFIER,
    @EncounterId                UNIQUEIDENTIFIER,
    @EstablishmentNameSnapshot  NVARCHAR(300),
    @ElaboratedAtUtc            DATETIME2(3),
    @PatientIdentificationText  NVARCHAR(500),
    @NotifiedAct                NVARCHAR(1000),
    @InjuryReportText           NVARCHAR(2000) = NULL,
    @MpAgencyName               NVARCHAR(300),
    @NotifyingProfessionalId    UNIQUEIDENTIFIER,
    @NotifyingProfessionalName  NVARCHAR(200),
    @ActorUserId                UNIQUEIDENTIFIER,
    @OccurredAtUtc              DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;

    SELECT @BranchId = BranchId, @SubjectId = SubjectId
    FROM dbo.Encounter
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    IF @BranchId IS NULL
        THROW 50107, N'Episodio no encontrado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @NotifyingProfessionalId
          AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50108, N'Profesional notificador no encontrado.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.MinisterioPublicoNotice (
        NoticeId, TenantId, EncounterId, BranchId,
        EstablishmentNameSnapshot, ElaboratedAtUtc, PatientIdentificationText,
        NotifiedAct, InjuryReportText, MpAgencyName,
        NotifyingProfessionalId, NotifyingProfessionalName,
        ActorUserId, OccurredAtUtc
    )
    VALUES (
        @NoticeId, @TenantId, @EncounterId, @BranchId,
        @EstablishmentNameSnapshot, @ElaboratedAtUtc, @PatientIdentificationText,
        @NotifiedAct, @InjuryReportText, @MpAgencyName,
        @NotifyingProfessionalId, @NotifyingProfessionalName,
        @ActorUserId, @OccurredAtUtc
    );

    -- Marca «sí notificado» sólo cuando el humano genera la hoja; no se auto-dispara.
    UPDATE dbo.Encounter
    SET MinisterioPublicoNotified = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @NotifyingProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'encounter.mpNotice',
        @EntityName = N'MinisterioPublicoNotice',
        @EntityId = @NoticeId,
        @SubjectId = @SubjectId,
        @DetailJson = N'{"action":"create_mp_notice"}',
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT
        NoticeId, TenantId, EncounterId, BranchId,
        EstablishmentNameSnapshot, ElaboratedAtUtc, PatientIdentificationText,
        NotifiedAct, InjuryReportText, MpAgencyName,
        NotifyingProfessionalId, NotifyingProfessionalName,
        ActorUserId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.MinisterioPublicoNotice
    WHERE NoticeId = @NoticeId AND TenantId = @TenantId;
END
GO

-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE dbo.sp_EncounterCareWithoutConsent_Create
    @RecordId                   UNIQUEIDENTIFIER,
    @TenantId                   UNIQUEIDENTIFIER,
    @EncounterId                UNIQUEIDENTIFIER,
    @ClinicalAssessment         NVARCHAR(2000),
    @UrgencyRationale           NVARCHAR(2000),
    @NoRelativeOrRepresentative BIT,
    @ProfessionalId1            UNIQUEIDENTIFIER,
    @ProfessionalId2            UNIQUEIDENTIFIER,
    @ActorUserId                UNIQUEIDENTIFIER,
    @OccurredAtUtc              DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ProfessionalId1 = @ProfessionalId2
        THROW 50105, N'Care-without-consent exige dos ProfessionalId distintos.', 1;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;

    SELECT @BranchId = BranchId, @SubjectId = SubjectId
    FROM dbo.Encounter
    WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0;

    IF @BranchId IS NULL
        THROW 50107, N'Episodio no encontrado.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @ProfessionalId1 AND TenantId = @TenantId
          AND IsDeleted = 0 AND IsActive = 1
    ) OR NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @ProfessionalId2 AND TenantId = @TenantId
          AND IsDeleted = 0 AND IsActive = 1
    )
        THROW 50108, N'Ambos profesionales deben existir y estar activos.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.EncounterCareWithoutConsent (
        RecordId, TenantId, EncounterId, ClinicalAssessment, UrgencyRationale,
        NoRelativeOrRepresentative, ProfessionalId1, ProfessionalId2,
        ActorUserId, OccurredAtUtc
    )
    VALUES (
        @RecordId, @TenantId, @EncounterId, @ClinicalAssessment, @UrgencyRationale,
        @NoRelativeOrRepresentative, @ProfessionalId1, @ProfessionalId2,
        @ActorUserId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @BranchId = @BranchId,
        @EventType = N'encounter.careWithoutConsent',
        @EntityName = N'EncounterCareWithoutConsent',
        @EntityId = @RecordId,
        @SubjectId = @SubjectId,
        @DetailJson = N'{"action":"create"}',
        @OccurredAtUtc = @OccurredAtUtc;

    COMMIT;

    SELECT
        RecordId, TenantId, EncounterId, ClinicalAssessment, UrgencyRationale,
        NoRelativeOrRepresentative, ProfessionalId1, ProfessionalId2,
        ActorUserId, OccurredAtUtc, RecordedAtUtc
    FROM dbo.EncounterCareWithoutConsent
    WHERE RecordId = @RecordId AND TenantId = @TenantId;
END
GO
