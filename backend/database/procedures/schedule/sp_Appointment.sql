-- SPs de agenda (M9 / WS-J). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- Todo SP recibe @TenantId y filtra por él. Traslape → THROW 50201/50202.
USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_ConsultingRoom_List
    @TenantId   UNIQUEIDENTIFIER,
    @BranchId   UNIQUEIDENTIFIER = NULL,
    @OnlyActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        RoomId, TenantId, BranchId, Code, Name, IsActive,
        CreatedAtUtc, UpdatedAtUtc
    FROM dbo.ConsultingRoom
    WHERE TenantId = @TenantId
      AND IsDeleted = 0
      AND (@BranchId IS NULL OR BranchId = @BranchId)
      AND (@OnlyActive = 0 OR IsActive = 1)
    ORDER BY Code;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ConsultingRoom_Upsert
    @TenantId       UNIQUEIDENTIFIER,
    @RoomId         UNIQUEIDENTIFIER,
    @BranchId       UNIQUEIDENTIFIER,
    @Code           NVARCHAR(64),
    @Name           NVARCHAR(200),
    @IsActive       BIT = 1,
    @ActorUserId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsDeleted = 0
    )
    BEGIN
        THROW 50210, N'La sucursal no existe en el tenant o está dada de baja.', 1;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.ConsultingRoom
        WHERE TenantId = @TenantId
          AND BranchId = @BranchId
          AND Code = @Code
          AND RoomId <> @RoomId
          AND IsDeleted = 0
    )
    BEGIN
        THROW 50211, N'Ya existe un consultorio con ese código en la sucursal.', 1;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.ConsultingRoom
        WHERE RoomId = @RoomId AND TenantId = @TenantId AND IsDeleted = 0
    )
    BEGIN
        UPDATE dbo.ConsultingRoom
        SET Code = @Code,
            Name = @Name,
            BranchId = @BranchId,
            IsActive = @IsActive,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE RoomId = @RoomId AND TenantId = @TenantId AND IsDeleted = 0;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.ConsultingRoom (
            RoomId, TenantId, BranchId, Code, Name, IsActive
        )
        VALUES (
            @RoomId, @TenantId, @BranchId, @Code, @Name, @IsActive
        );
    END

    SELECT
        RoomId, TenantId, BranchId, Code, Name, IsActive,
        CreatedAtUtc, UpdatedAtUtc
    FROM dbo.ConsultingRoom
    WHERE RoomId = @RoomId AND TenantId = @TenantId AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_Create
    @AppointmentId              UNIQUEIDENTIFIER,
    @TenantId                   UNIQUEIDENTIFIER,
    @BranchId                   UNIQUEIDENTIFIER,
    @SubjectId                  UNIQUEIDENTIFIER,
    @ProfessionalId             UNIQUEIDENTIFIER,
    @RoomId                     UNIQUEIDENTIFIER = NULL,
    @ScheduledStartUtc          DATETIME2(3),
    @ScheduledEndUtc            DATETIME2(3),
    @ServiceCode                NVARCHAR(64) = NULL,
    @Notes                      NVARCHAR(1000) = NULL,
    @ActorUserId                UNIQUEIDENTIFIER,
    @ActorProfessionalId        UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName           NVARCHAR(200),
    @OccurredAtUtc              DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ScheduledEndUtc <= @ScheduledStartUtc
        THROW 50220, N'La hora de fin debe ser posterior a la de inicio.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsDeleted = 0
    )
        THROW 50210, N'La sucursal no existe en el tenant o está dada de baja.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Subject
        WHERE TenantId = @TenantId AND SubjectId = @SubjectId AND IsDeleted = 0
    )
        THROW 50221, N'El sujeto no existe en el tenant o está dado de baja.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE TenantId = @TenantId AND HealthcareProfessionalId = @ProfessionalId AND IsDeleted = 0
    )
        THROW 50222, N'El profesional no existe en el tenant o está dado de baja.', 1;

    IF @RoomId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ConsultingRoom
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND RoomId = @RoomId AND IsDeleted = 0
    )
        THROW 50223, N'El consultorio no existe en la sucursal o está dado de baja.', 1;

    -- Traslape de profesional (citas activas ocupan el intervalo).
    IF EXISTS (
        SELECT 1 FROM dbo.Appointment
        WHERE TenantId = @TenantId
          AND ProfessionalId = @ProfessionalId
          AND IsDeleted = 0
          AND State NOT IN (N'cancelada', N'no_asistio')
          AND ScheduledStartUtc < @ScheduledEndUtc
          AND ScheduledEndUtc > @ScheduledStartUtc
    )
        THROW 50201, N'Traslape de agenda del profesional en el intervalo solicitado.', 1;

    IF @RoomId IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.Appointment
        WHERE TenantId = @TenantId
          AND RoomId = @RoomId
          AND IsDeleted = 0
          AND State NOT IN (N'cancelada', N'no_asistio')
          AND ScheduledStartUtc < @ScheduledEndUtc
          AND ScheduledEndUtc > @ScheduledStartUtc
    )
        THROW 50202, N'Traslape de consultorio en el intervalo solicitado.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.Appointment (
        AppointmentId, TenantId, BranchId, SubjectId, ProfessionalId, RoomId,
        ScheduledStartUtc, ScheduledEndUtc, State, ServiceCode, Notes,
        CreatedByUserId, CreatedByProfessionalId, CreatedByDisplayName,
        OccurredAtUtc, RecordedAtUtc, UpdatedAtUtc
    )
    VALUES (
        @AppointmentId, @TenantId, @BranchId, @SubjectId, @ProfessionalId, @RoomId,
        @ScheduledStartUtc, @ScheduledEndUtc, N'agendada', @ServiceCode, @Notes,
        @ActorUserId, @ActorProfessionalId, @ActorDisplayName,
        @OccurredAtUtc, SYSUTCDATETIME(), SYSUTCDATETIME()
    );

    INSERT INTO dbo.AppointmentEvent (
        EventId, TenantId, AppointmentId, EventType,
        FromState, ToState, FromStartUtc, FromEndUtc, ToStartUtc, ToEndUtc,
        Reason, ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        NEWID(), @TenantId, @AppointmentId, N'created',
        NULL, N'agendada', NULL, NULL, @ScheduledStartUtc, @ScheduledEndUtc,
        NULL, @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'appointment.create',
        @EntityName = N'Appointment',
        @EntityId = @AppointmentId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT TRAN;

    EXEC dbo.sp_Appointment_GetById @TenantId = @TenantId, @AppointmentId = @AppointmentId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_GetById
    @TenantId       UNIQUEIDENTIFIER,
    @AppointmentId  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.AppointmentId, a.TenantId, a.BranchId, a.SubjectId, a.ProfessionalId, a.RoomId,
        a.ScheduledStartUtc, a.ScheduledEndUtc, a.State, a.ServiceCode, a.Notes,
        a.CreatedByUserId, a.CreatedByProfessionalId, a.CreatedByDisplayName,
        a.OccurredAtUtc, a.RecordedAtUtc, a.UpdatedAtUtc,
        s.GivenName AS SubjectGivenName,
        s.FirstSurname AS SubjectFirstSurname,
        s.SecondSurname AS SubjectSecondSurname,
        s.PreferredName AS SubjectPreferredName,
        s.IdentificationState AS SubjectIdentificationState,
        lbl.OperationalLabel AS SubjectOperationalLabel,
        hp.FullName AS ProfessionalFullName,
        hp.ProfessionalLicense AS ProfessionalLicense,
        r.Code AS RoomCode,
        r.Name AS RoomName
    FROM dbo.Appointment a
    INNER JOIN dbo.Subject s ON s.SubjectId = a.SubjectId AND s.TenantId = a.TenantId
    INNER JOIN dbo.HealthcareProfessional hp
        ON hp.HealthcareProfessionalId = a.ProfessionalId AND hp.TenantId = a.TenantId
    LEFT JOIN dbo.ConsultingRoom r
        ON r.RoomId = a.RoomId AND r.TenantId = a.TenantId AND r.IsDeleted = 0
    LEFT JOIN dbo.SubjectTemporaryLabel lbl
        ON lbl.SubjectId = a.SubjectId AND lbl.TenantId = a.TenantId AND lbl.IsActive = 1
    WHERE a.TenantId = @TenantId
      AND a.AppointmentId = @AppointmentId
      AND a.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_Reschedule
    @TenantId           UNIQUEIDENTIFIER,
    @AppointmentId      UNIQUEIDENTIFIER,
    @ScheduledStartUtc  DATETIME2(3),
    @ScheduledEndUtc    DATETIME2(3),
    @RoomId             UNIQUEIDENTIFIER = NULL,
    @ProfessionalId     UNIQUEIDENTIFIER = NULL,
    @ServiceCode        NVARCHAR(64) = NULL,
    @Notes              NVARCHAR(1000) = NULL,
    @ActorUserId        UNIQUEIDENTIFIER,
    @ActorProfessionalId UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc      DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ScheduledEndUtc <= @ScheduledStartUtc
        THROW 50220, N'La hora de fin debe ser posterior a la de inicio.', 1;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @CurrProfessional UNIQUEIDENTIFIER;
    DECLARE @CurrRoom UNIQUEIDENTIFIER;
    DECLARE @CurrStart DATETIME2(3);
    DECLARE @CurrEnd DATETIME2(3);
    DECLARE @CurrState NVARCHAR(32);
    DECLARE @CurrService NVARCHAR(64);
    DECLARE @CurrNotes NVARCHAR(1000);

    SELECT
        @BranchId = BranchId,
        @SubjectId = SubjectId,
        @CurrProfessional = ProfessionalId,
        @CurrRoom = RoomId,
        @CurrStart = ScheduledStartUtc,
        @CurrEnd = ScheduledEndUtc,
        @CurrState = State,
        @CurrService = ServiceCode,
        @CurrNotes = Notes
    FROM dbo.Appointment
    WHERE TenantId = @TenantId AND AppointmentId = @AppointmentId AND IsDeleted = 0;

    IF @BranchId IS NULL
        RETURN; -- API → 404

    IF @CurrState IN (N'cancelada', N'atendida')
        THROW 50224, N'No se puede reprogramar una cita cancelada o atendida.', 1;

    -- Room/profesional omitidos (NULL) conservan el valor actual; el caller pasa el room si debe quedar NULL.
    DECLARE @NewProfessional UNIQUEIDENTIFIER = ISNULL(@ProfessionalId, @CurrProfessional);
    DECLARE @NewRoom UNIQUEIDENTIFIER = ISNULL(@RoomId, @CurrRoom);

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE TenantId = @TenantId AND HealthcareProfessionalId = @NewProfessional AND IsDeleted = 0
    )
        THROW 50222, N'El profesional no existe en el tenant o está dado de baja.', 1;

    IF @NewRoom IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.ConsultingRoom
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND RoomId = @NewRoom AND IsDeleted = 0
    )
        THROW 50223, N'El consultorio no existe en la sucursal o está dado de baja.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Appointment
        WHERE TenantId = @TenantId
          AND ProfessionalId = @NewProfessional
          AND AppointmentId <> @AppointmentId
          AND IsDeleted = 0
          AND State NOT IN (N'cancelada', N'no_asistio')
          AND ScheduledStartUtc < @ScheduledEndUtc
          AND ScheduledEndUtc > @ScheduledStartUtc
    )
        THROW 50201, N'Traslape de agenda del profesional en el intervalo solicitado.', 1;

    IF @NewRoom IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.Appointment
        WHERE TenantId = @TenantId
          AND RoomId = @NewRoom
          AND AppointmentId <> @AppointmentId
          AND IsDeleted = 0
          AND State NOT IN (N'cancelada', N'no_asistio')
          AND ScheduledStartUtc < @ScheduledEndUtc
          AND ScheduledEndUtc > @ScheduledStartUtc
    )
        THROW 50202, N'Traslape de consultorio en el intervalo solicitado.', 1;

    BEGIN TRAN;

    UPDATE dbo.Appointment
    SET ScheduledStartUtc = @ScheduledStartUtc,
        ScheduledEndUtc = @ScheduledEndUtc,
        ProfessionalId = @NewProfessional,
        RoomId = @NewRoom,
        ServiceCode = ISNULL(@ServiceCode, @CurrService),
        Notes = ISNULL(@Notes, @CurrNotes),
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND AppointmentId = @AppointmentId AND IsDeleted = 0;

    INSERT INTO dbo.AppointmentEvent (
        EventId, TenantId, AppointmentId, EventType,
        FromState, ToState, FromStartUtc, FromEndUtc, ToStartUtc, ToEndUtc,
        Reason, ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        NEWID(), @TenantId, @AppointmentId, N'rescheduled',
        @CurrState, @CurrState, @CurrStart, @CurrEnd, @ScheduledStartUtc, @ScheduledEndUtc,
        NULL, @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'appointment.reschedule',
        @EntityName = N'Appointment',
        @EntityId = @AppointmentId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT TRAN;

    EXEC dbo.sp_Appointment_GetById @TenantId = @TenantId, @AppointmentId = @AppointmentId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_ChangeState
    @TenantId               UNIQUEIDENTIFIER,
    @AppointmentId          UNIQUEIDENTIFIER,
    @ToState                NVARCHAR(32),
    @Reason                 NVARCHAR(1000) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @ToState NOT IN (N'agendada', N'confirmada', N'atendida', N'no_asistio', N'cancelada')
        THROW 50225, N'Estado de cita no reconocido.', 1;

    IF @ToState = N'cancelada' AND (NULLIF(LTRIM(RTRIM(@Reason)), N'') IS NULL)
        THROW 50226, N'Cancelar una cita exige motivo.', 1;

    DECLARE @BranchId UNIQUEIDENTIFIER;
    DECLARE @SubjectId UNIQUEIDENTIFIER;
    DECLARE @FromState NVARCHAR(32);
    DECLARE @StartUtc DATETIME2(3);
    DECLARE @EndUtc DATETIME2(3);

    SELECT
        @BranchId = BranchId,
        @SubjectId = SubjectId,
        @FromState = State,
        @StartUtc = ScheduledStartUtc,
        @EndUtc = ScheduledEndUtc
    FROM dbo.Appointment
    WHERE TenantId = @TenantId AND AppointmentId = @AppointmentId AND IsDeleted = 0;

    IF @BranchId IS NULL
        RETURN;

    IF @FromState = @ToState
        THROW 50227, N'La cita ya está en ese estado.', 1;

    IF @FromState = N'cancelada'
        THROW 50228, N'Una cita cancelada no cambia de estado.', 1;

    BEGIN TRAN;

    UPDATE dbo.Appointment
    SET State = @ToState,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND AppointmentId = @AppointmentId AND IsDeleted = 0;

    INSERT INTO dbo.AppointmentEvent (
        EventId, TenantId, AppointmentId, EventType,
        FromState, ToState, FromStartUtc, FromEndUtc, ToStartUtc, ToEndUtc,
        Reason, ActorUserId, ActorProfessionalId, OccurredAtUtc
    )
    VALUES (
        NEWID(), @TenantId, @AppointmentId, N'state_changed',
        @FromState, @ToState, @StartUtc, @EndUtc, @StartUtc, @EndUtc,
        @Reason, @ActorUserId, @ActorProfessionalId, @OccurredAtUtc
    );

    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();
    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = @ActorProfessionalId,
        @BranchId = @BranchId,
        @EventType = N'appointment.state',
        @EntityName = N'Appointment',
        @EntityId = @AppointmentId,
        @SubjectId = @SubjectId,
        @DetailJson = NULL,
        @OccurredAtUtc = @OccurredAtUtc,
        @DeviceId = NULL,
        @IpAddress = NULL;

    COMMIT TRAN;

    EXEC dbo.sp_Appointment_GetById @TenantId = @TenantId, @AppointmentId = @AppointmentId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_ListByRange
    @TenantId           UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER,
    @FromUtc            DATETIME2(3),
    @ToUtc              DATETIME2(3),
    @ProfessionalId     UNIQUEIDENTIFIER = NULL,
    @RoomId             UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.AppointmentId, a.TenantId, a.BranchId, a.SubjectId, a.ProfessionalId, a.RoomId,
        a.ScheduledStartUtc, a.ScheduledEndUtc, a.State, a.ServiceCode, a.Notes,
        a.CreatedByUserId, a.CreatedByProfessionalId, a.CreatedByDisplayName,
        a.OccurredAtUtc, a.RecordedAtUtc, a.UpdatedAtUtc,
        s.GivenName AS SubjectGivenName,
        s.FirstSurname AS SubjectFirstSurname,
        s.SecondSurname AS SubjectSecondSurname,
        s.PreferredName AS SubjectPreferredName,
        s.IdentificationState AS SubjectIdentificationState,
        lbl.OperationalLabel AS SubjectOperationalLabel,
        hp.FullName AS ProfessionalFullName,
        hp.ProfessionalLicense AS ProfessionalLicense,
        r.Code AS RoomCode,
        r.Name AS RoomName
    FROM dbo.Appointment a
    INNER JOIN dbo.Subject s ON s.SubjectId = a.SubjectId AND s.TenantId = a.TenantId
    INNER JOIN dbo.HealthcareProfessional hp
        ON hp.HealthcareProfessionalId = a.ProfessionalId AND hp.TenantId = a.TenantId
    LEFT JOIN dbo.ConsultingRoom r
        ON r.RoomId = a.RoomId AND r.TenantId = a.TenantId AND r.IsDeleted = 0
    LEFT JOIN dbo.SubjectTemporaryLabel lbl
        ON lbl.SubjectId = a.SubjectId AND lbl.TenantId = a.TenantId AND lbl.IsActive = 1
    WHERE a.TenantId = @TenantId
      AND a.BranchId = @BranchId
      AND a.IsDeleted = 0
      AND a.ScheduledStartUtc < @ToUtc
      AND a.ScheduledEndUtc > @FromUtc
      AND (@ProfessionalId IS NULL OR a.ProfessionalId = @ProfessionalId)
      AND (@RoomId IS NULL OR a.RoomId = @RoomId)
    ORDER BY a.ScheduledStartUtc;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Appointment_ListBySubject
    @TenantId   UNIQUEIDENTIFIER,
    @SubjectId  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.AppointmentId, a.TenantId, a.BranchId, a.SubjectId, a.ProfessionalId, a.RoomId,
        a.ScheduledStartUtc, a.ScheduledEndUtc, a.State, a.ServiceCode, a.Notes,
        a.CreatedByUserId, a.CreatedByProfessionalId, a.CreatedByDisplayName,
        a.OccurredAtUtc, a.RecordedAtUtc, a.UpdatedAtUtc,
        s.GivenName AS SubjectGivenName,
        s.FirstSurname AS SubjectFirstSurname,
        s.SecondSurname AS SubjectSecondSurname,
        s.PreferredName AS SubjectPreferredName,
        s.IdentificationState AS SubjectIdentificationState,
        lbl.OperationalLabel AS SubjectOperationalLabel,
        hp.FullName AS ProfessionalFullName,
        hp.ProfessionalLicense AS ProfessionalLicense,
        r.Code AS RoomCode,
        r.Name AS RoomName
    FROM dbo.Appointment a
    INNER JOIN dbo.Subject s ON s.SubjectId = a.SubjectId AND s.TenantId = a.TenantId
    INNER JOIN dbo.HealthcareProfessional hp
        ON hp.HealthcareProfessionalId = a.ProfessionalId AND hp.TenantId = a.TenantId
    LEFT JOIN dbo.ConsultingRoom r
        ON r.RoomId = a.RoomId AND r.TenantId = a.TenantId AND r.IsDeleted = 0
    LEFT JOIN dbo.SubjectTemporaryLabel lbl
        ON lbl.SubjectId = a.SubjectId AND lbl.TenantId = a.TenantId AND lbl.IsActive = 1
    WHERE a.TenantId = @TenantId
      AND a.SubjectId = @SubjectId
      AND a.IsDeleted = 0
    ORDER BY a.ScheduledStartUtc DESC;
END
GO
