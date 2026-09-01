-- 0012_agenda.sql — MediCore M9 / WS-J (idempotente)
-- Agenda: consultorio como entidad, citas con historial append-only, sin DELETE físico.
-- Requiere sqlcmd DbName. Depende de M1 (profesional), M3 (sujeto), M11 (sucursal).
--
-- ─────────────────────────── Por qué esta forma ───────────────────────────
--
-- 1. ConsultingRoom es entidad (BM-AGE-02): no se agenda contra un string libre de
--    consultorio. Code+Name por sucursal; baja lógica con IsDeleted.
--
-- 2. Appointment exige SubjectId (el sujeto siempre existe; puede no tener identidad
--    completa — BM-AGE-03) y ProfessionalId (FK a HealthcareProfessional). RoomId es
--    opcional. Estados: agendada | confirmada | atendida | no_asistio | cancelada.
--
-- 3. AppointmentEvent es append-only: cancelación y cambios de estado/horario dejan
--    motivo, actor e historial (BM-AGE-01). No hay SP de DELETE físico de la cita.
--
-- 4. Traslape de profesional o consultorio se rechaza en el SP (409 en API). Las citas
--    canceladas / no_asistio no ocupan el intervalo.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.ConsultingRoom ────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.ConsultingRoom', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsultingRoom (
        RoomId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ConsultingRoom PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        BranchId        UNIQUEIDENTIFIER NOT NULL,
        Code            NVARCHAR(64) NOT NULL,
        Name            NVARCHAR(200) NOT NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_ConsultingRoom_IsActive DEFAULT (1),
        IsDeleted       BIT NOT NULL CONSTRAINT DF_ConsultingRoom_IsDeleted DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_ConsultingRoom_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_ConsultingRoom_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ConsultingRoom_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ConsultingRoom_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId)
    );

    CREATE UNIQUE INDEX UQ_ConsultingRoom_Tenant_Branch_Code
        ON dbo.ConsultingRoom (TenantId, BranchId, Code)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_ConsultingRoom_Tenant_Branch
        ON dbo.ConsultingRoom (TenantId, BranchId)
        WHERE IsDeleted = 0 AND IsActive = 1;
END
GO

-- ── dbo.Appointment ───────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.Appointment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Appointment (
        AppointmentId               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Appointment PRIMARY KEY,
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        BranchId                    UNIQUEIDENTIFIER NOT NULL,
        SubjectId                   UNIQUEIDENTIFIER NOT NULL,
        ProfessionalId              UNIQUEIDENTIFIER NOT NULL,
        RoomId                      UNIQUEIDENTIFIER NULL,
        ScheduledStartUtc           DATETIME2(3) NOT NULL,
        ScheduledEndUtc             DATETIME2(3) NOT NULL,
        State                       NVARCHAR(32) NOT NULL,
        ServiceCode                 NVARCHAR(64) NULL,
        Notes                       NVARCHAR(1000) NULL,
        CreatedByUserId             UNIQUEIDENTIFIER NOT NULL,
        CreatedByProfessionalId     UNIQUEIDENTIFIER NULL,
        CreatedByDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc               DATETIME2(3) NOT NULL,
        RecordedAtUtc               DATETIME2(3) NOT NULL CONSTRAINT DF_Appointment_Recorded DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc                DATETIME2(3) NOT NULL CONSTRAINT DF_Appointment_Updated DEFAULT (SYSUTCDATETIME()),
        IsDeleted                   BIT NOT NULL CONSTRAINT DF_Appointment_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Appointment_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_Appointment_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId),
        CONSTRAINT FK_Appointment_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_Appointment_Professional FOREIGN KEY (ProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT FK_Appointment_Room FOREIGN KEY (RoomId) REFERENCES dbo.ConsultingRoom(RoomId),
        CONSTRAINT CK_Appointment_Range CHECK (ScheduledEndUtc > ScheduledStartUtc)
    );

    CREATE INDEX IX_Appointment_Tenant_Branch_Range
        ON dbo.Appointment (TenantId, BranchId, ScheduledStartUtc, ScheduledEndUtc)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Appointment_Tenant_Professional_Range
        ON dbo.Appointment (TenantId, ProfessionalId, ScheduledStartUtc, ScheduledEndUtc)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Appointment_Tenant_Room_Range
        ON dbo.Appointment (TenantId, RoomId, ScheduledStartUtc, ScheduledEndUtc)
        WHERE IsDeleted = 0 AND RoomId IS NOT NULL;

    CREATE INDEX IX_Appointment_Tenant_Subject
        ON dbo.Appointment (TenantId, SubjectId, ScheduledStartUtc)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.AppointmentEvent (append-only) ────────────────────────────────────
IF OBJECT_ID(N'dbo.AppointmentEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppointmentEvent (
        EventId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AppointmentEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        AppointmentId           UNIQUEIDENTIFIER NOT NULL,
        EventType               NVARCHAR(40) NOT NULL, -- created | rescheduled | state_changed
        FromState               NVARCHAR(32) NULL,
        ToState                 NVARCHAR(32) NULL,
        FromStartUtc            DATETIME2(3) NULL,
        FromEndUtc              DATETIME2(3) NULL,
        ToStartUtc              DATETIME2(3) NULL,
        ToEndUtc                DATETIME2(3) NULL,
        Reason                  NVARCHAR(1000) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_AppointmentEvent_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AppointmentEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_AppointmentEvent_Appointment FOREIGN KEY (AppointmentId) REFERENCES dbo.Appointment(AppointmentId)
    );

    CREATE INDEX IX_AppointmentEvent_Appointment_Occurred
        ON dbo.AppointmentEvent (TenantId, AppointmentId, OccurredAtUtc);
END
GO

PRINT '0012_agenda OK — ConsultingRoom + Appointment + AppointmentEvent (append-only).';
GO
