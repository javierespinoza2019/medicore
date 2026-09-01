-- 0007_episodio_urgencias.sql — MediCore M4 / WS-E (idempotente)
-- Episodio de atención, ingreso y cola de urgencias.
-- Sin DELETE, DROP ni TRUNCATE: sólo CREATE IF NOT EXISTS / índices.
--
-- Fundamento (no se afirma cumplimiento de producto):
-- Reglamento LGS Prestación de Servicios arts. 71–73, 85, 19 fracc. V, 81 — doc 01 §2
-- LGS arts. 51 Bis 2 y 469 — doc 01 §2 (verificado 2026-08-22)
-- NOM-004-SSA3-2012 numeral 10.3 (hoja al MP) — doc 01 §2
-- NOM-027-SSA3-2013 numeral 5.4 — doc 01 §2
--
-- Salvaguardas:
-- · Abrir episodio: sólo SubjectId + BranchId (+ tipo). Nada admin bloquea.
-- · MinisterioPublicoNotified BIT NULL (sí / no / no valorado). Nunca false por omisión.
-- · Disposition NULL hasta el cierre; sin default a alta_domicilio.
-- · Care-without-consent exige dos ProfessionalId distintos (art. 81 reforzado).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.Encounter ─────────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.Encounter', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Encounter (
        EncounterId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Encounter PRIMARY KEY,
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        BranchId                    UNIQUEIDENTIFIER NOT NULL,
        SubjectId                   UNIQUEIDENTIFIER NOT NULL,
        EncounterType               NVARCHAR(32) NOT NULL,   -- urgencias | consulta_externa
        State                       NVARCHAR(32) NOT NULL,   -- abierto | en_observacion | cerrado
        Disposition                 NVARCHAR(40) NULL,       -- sin default
        ArrivalAtUtc                DATETIME2(3) NOT NULL,
        AccessRoute                 NVARCHAR(128) NULL,      -- catálogo abierto (BM-URG-08)
        AdmissionCircumstance       NVARCHAR(64) NULL,       -- catálogo abierto
        AdmissionCircumstanceText   NVARCHAR(500) NULL,
        MinisterioPublicoNotified   BIT NULL,                -- NULL = no valorado
        AttendingProfessionalId     UNIQUEIDENTIFIER NULL,
        TurnNumber                  INT NOT NULL,            -- monitor: por omisión sólo este dato
        ClosedAtUtc                 DATETIME2(3) NULL,
        CreatedByUserId             UNIQUEIDENTIFIER NOT NULL,
        CreatedByProfessionalId     UNIQUEIDENTIFIER NULL,
        IsDeleted                   BIT NOT NULL CONSTRAINT DF_Encounter_IsDeleted DEFAULT (0),
        CreatedAtUtc                DATETIME2(3) NOT NULL CONSTRAINT DF_Encounter_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc                DATETIME2(3) NOT NULL CONSTRAINT DF_Encounter_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Encounter_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_Encounter_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId),
        CONSTRAINT FK_Encounter_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_Encounter_AttendingProfessional FOREIGN KEY (AttendingProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId)
    );

    CREATE INDEX IX_Encounter_Tenant_Branch_State
        ON dbo.Encounter (TenantId, BranchId, State, ArrivalAtUtc)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Encounter_Tenant_Subject
        ON dbo.Encounter (TenantId, SubjectId, ArrivalAtUtc DESC)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Encounter_Tenant_Branch_Arrival
        ON dbo.Encounter (TenantId, BranchId, ArrivalAtUtc)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.EncounterStateEvent (append-only) ─────────────────────────────────
IF OBJECT_ID(N'dbo.EncounterStateEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EncounterStateEvent (
        EventId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_EncounterStateEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        EncounterId             UNIQUEIDENTIFIER NOT NULL,
        FromState               NVARCHAR(32) NULL,
        ToState                 NVARCHAR(32) NOT NULL,
        Disposition             NVARCHAR(40) NULL,
        Justification           NVARCHAR(1000) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_EncounterStateEvent_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_EncounterStateEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_EncounterStateEvent_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId)
    );

    CREATE INDEX IX_EncounterStateEvent_Encounter_Occurred
        ON dbo.EncounterStateEvent (TenantId, EncounterId, OccurredAtUtc);
END
GO

-- ── dbo.MinisterioPublicoNotice (append-only; NOM-004 10.3) ───────────────
IF OBJECT_ID(N'dbo.MinisterioPublicoNotice', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MinisterioPublicoNotice (
        NoticeId                    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MinisterioPublicoNotice PRIMARY KEY,
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        EncounterId                 UNIQUEIDENTIFIER NOT NULL,
        BranchId                    UNIQUEIDENTIFIER NOT NULL,
        -- 10.3.1 establecimiento notificador (snapshot textual; acepta identidad provisional del paciente)
        EstablishmentNameSnapshot   NVARCHAR(300) NOT NULL,
        -- 10.3.2 fecha de elaboración
        ElaboratedAtUtc             DATETIME2(3) NOT NULL,
        -- 10.3.3 identificación del paciente (provisional admitida)
        PatientIdentificationText   NVARCHAR(500) NOT NULL,
        -- 10.3.4 acto notificado
        NotifiedAct                 NVARCHAR(1000) NOT NULL,
        -- 10.3.5 reporte de lesiones (opcional)
        InjuryReportText            NVARCHAR(2000) NULL,
        -- 10.3.6 agencia del MP
        MpAgencyName                NVARCHAR(300) NOT NULL,
        -- 10.3.7 nombre y firma del médico (autoría verificable)
        NotifyingProfessionalId     UNIQUEIDENTIFIER NOT NULL,
        NotifyingProfessionalName   NVARCHAR(200) NOT NULL,
        ActorUserId                 UNIQUEIDENTIFIER NOT NULL,
        OccurredAtUtc               DATETIME2(3) NOT NULL,
        RecordedAtUtc               DATETIME2(3) NOT NULL CONSTRAINT DF_MpNotice_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_MpNotice_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_MpNotice_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_MpNotice_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId),
        CONSTRAINT FK_MpNotice_Professional FOREIGN KEY (NotifyingProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId)
    );

    CREATE INDEX IX_MpNotice_Encounter
        ON dbo.MinisterioPublicoNotice (TenantId, EncounterId, ElaboratedAtUtc);
END
GO

-- ── dbo.EncounterCareWithoutConsent (LGS 51 Bis 2 / Regl. art. 81) ────────
IF OBJECT_ID(N'dbo.EncounterCareWithoutConsent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EncounterCareWithoutConsent (
        RecordId                    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_EncounterCareWithoutConsent PRIMARY KEY,
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        EncounterId                 UNIQUEIDENTIFIER NOT NULL,
        ClinicalAssessment          NVARCHAR(2000) NOT NULL,
        UrgencyRationale            NVARCHAR(2000) NOT NULL,
        NoRelativeOrRepresentative  BIT NOT NULL,
        ProfessionalId1             UNIQUEIDENTIFIER NOT NULL,
        ProfessionalId2             UNIQUEIDENTIFIER NOT NULL,
        ActorUserId                 UNIQUEIDENTIFIER NOT NULL,
        OccurredAtUtc               DATETIME2(3) NOT NULL,
        RecordedAtUtc               DATETIME2(3) NOT NULL CONSTRAINT DF_CareWoc_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_CareWoc_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_CareWoc_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_CareWoc_Prof1 FOREIGN KEY (ProfessionalId1)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT FK_CareWoc_Prof2 FOREIGN KEY (ProfessionalId2)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT CK_CareWoc_DistinctProfessionals CHECK (ProfessionalId1 <> ProfessionalId2)
    );

    CREATE INDEX IX_CareWoc_Encounter
        ON dbo.EncounterCareWithoutConsent (TenantId, EncounterId, OccurredAtUtc);
END
GO
