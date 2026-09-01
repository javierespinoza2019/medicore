-- 0008_triage_signos.sql — MediCore M5 / WS-F (idempotente)
-- Escala de triage configurable, valoración, signos vitales y eventos append-only.
-- Sin DELETE, DROP ni TRUNCATE: sólo CREATE IF NOT EXISTS / índices.
--
-- Decisiones ratificadas 2026-08-27/28:
-- · Escala configurable tenant/sucursal; cascada sucursal > tenant; sin escala fija de producto.
-- · Ningún signo obligatorio para guardar; faltantes = no_medido («no tomado») con razón.
-- · Sexo para rangos: sólo BiologicalSex del sujeto (opción B).
--
-- Fundamento (no se afirma cumplimiento de producto):
-- NOM-027-SSA3-2013 numeral 5.4 (clasificación = acto médico) — doc 01 §2
-- NOM-004-SSA3-2012 numerales 7.1.2 y 6.1.2 (signos en nota / exploración) — doc 01 §2
-- Escala prescrita por norma mexicana: no verificada (doc 01 §8) → configurable.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.TriageScaleConfig ─────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.TriageScaleConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TriageScaleConfig (
        ConfigId            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TriageScaleConfig PRIMARY KEY,
        TenantId            UNIQUEIDENTIFIER NOT NULL,
        BranchId            UNIQUEIDENTIFIER NULL,          -- NULL = ámbito tenant
        ScaleCode           NVARCHAR(64) NOT NULL,
        DisplayName         NVARCHAR(200) NOT NULL,
        LevelsJson          NVARCHAR(MAX) NOT NULL,         -- { levels: [{ code, label, priority, icon? }] }
        IsActive            BIT NOT NULL CONSTRAINT DF_TriageScaleConfig_IsActive DEFAULT (1),
        UpdatedByUserId     UNIQUEIDENTIFIER NOT NULL,
        CreatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_TriageScaleConfig_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_TriageScaleConfig_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TriageScaleConfig_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_TriageScaleConfig_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId)
    );

    -- Una config activa por tenant (ámbito tenant: BranchId NULL).
    CREATE UNIQUE INDEX UX_TriageScaleConfig_TenantActive
        ON dbo.TriageScaleConfig (TenantId)
        WHERE IsActive = 1 AND BranchId IS NULL;

    -- Una config activa por sucursal.
    CREATE UNIQUE INDEX UX_TriageScaleConfig_BranchActive
        ON dbo.TriageScaleConfig (TenantId, BranchId)
        WHERE IsActive = 1 AND BranchId IS NOT NULL;
END
GO

-- ── dbo.TriageAssessment ──────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.TriageAssessment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TriageAssessment (
        TriageId                    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TriageAssessment PRIMARY KEY,
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        EncounterId                 UNIQUEIDENTIFIER NOT NULL,
        Level                       NVARCHAR(64) NULL,       -- NULL = sin_clasificar
        ScaleCode                   NVARCHAR(64) NOT NULL,
        ScaleConfigId               UNIQUEIDENTIFIER NULL,   -- snapshot de config efectiva
        LevelPriority               INT NULL,                -- prioridad del nivel al guardar (NULL si sin clasificar)
        ChiefComplaint              NVARCHAR(1000) NULL,
        PainScore                   INT NULL,                -- 0–10 cuando valorable
        PainAssessable              NVARCHAR(32) NOT NULL,   -- valorable | no_valorable
        ClassifiedByProfessionalId  UNIQUEIDENTIFIER NULL,
        ActorUserId                 UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId         UNIQUEIDENTIFIER NULL,
        ActorDisplayName            NVARCHAR(200) NOT NULL,
        OccurredAtUtc               DATETIME2(3) NOT NULL,
        RecordedAtUtc               DATETIME2(3) NOT NULL CONSTRAINT DF_TriageAssessment_Recorded DEFAULT (SYSUTCDATETIME()),
        IsDeleted                   BIT NOT NULL CONSTRAINT DF_TriageAssessment_IsDeleted DEFAULT (0),
        CONSTRAINT FK_TriageAssessment_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_TriageAssessment_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_TriageAssessment_ScaleConfig FOREIGN KEY (ScaleConfigId) REFERENCES dbo.TriageScaleConfig(ConfigId),
        CONSTRAINT FK_TriageAssessment_Professional FOREIGN KEY (ClassifiedByProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT CK_TriageAssessment_Pain CHECK (
            (PainAssessable = N'no_valorable' AND PainScore IS NULL)
            OR (PainAssessable = N'valorable' AND (PainScore IS NULL OR (PainScore >= 0 AND PainScore <= 10)))
        )
    );

    -- Un triage vigente por episodio.
    CREATE UNIQUE INDEX UX_TriageAssessment_EncounterActive
        ON dbo.TriageAssessment (TenantId, EncounterId)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_TriageAssessment_Tenant_Encounter
        ON dbo.TriageAssessment (TenantId, EncounterId, OccurredAtUtc DESC);
END
GO

-- ── dbo.TriageEvent (append-only; reclasificaciones) ──────────────────────
IF OBJECT_ID(N'dbo.TriageEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TriageEvent (
        EventId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TriageEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        EncounterId             UNIQUEIDENTIFIER NOT NULL,
        TriageId                UNIQUEIDENTIFIER NOT NULL,
        EventType               NVARCHAR(32) NOT NULL,      -- saved | reclassified
        FromLevel               NVARCHAR(64) NULL,
        ToLevel                 NVARCHAR(64) NULL,
        DetailJson              NVARCHAR(MAX) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_TriageEvent_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_TriageEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_TriageEvent_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_TriageEvent_Triage FOREIGN KEY (TriageId) REFERENCES dbo.TriageAssessment(TriageId)
    );

    CREATE INDEX IX_TriageEvent_Encounter_Occurred
        ON dbo.TriageEvent (TenantId, EncounterId, OccurredAtUtc);
END
GO

-- ── dbo.VitalSignSet ──────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.VitalSignSet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VitalSignSet (
        VitalSetId              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_VitalSignSet PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        EncounterId             UNIQUEIDENTIFIER NOT NULL,
        TriageId                UNIQUEIDENTIFIER NULL,
        SourceContext           NVARCHAR(32) NOT NULL,      -- triage | evolucion | otro
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_VitalSignSet_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_VitalSignSet_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_VitalSignSet_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_VitalSignSet_Triage FOREIGN KEY (TriageId) REFERENCES dbo.TriageAssessment(TriageId)
    );

    CREATE INDEX IX_VitalSignSet_Encounter_Occurred
        ON dbo.VitalSignSet (TenantId, EncounterId, OccurredAtUtc DESC);
END
GO

-- ── dbo.VitalSignMeasurement (Medicion por signo) ─────────────────────────
IF OBJECT_ID(N'dbo.VitalSignMeasurement', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VitalSignMeasurement (
        MeasurementId           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_VitalSignMeasurement PRIMARY KEY,
        VitalSetId              UNIQUEIDENTIFIER NOT NULL,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SignCode                NVARCHAR(64) NOT NULL,
        Value                   DECIMAL(18, 4) NULL,         -- NULL si no_medido / no_valorable
        Unit                    NVARCHAR(32) NOT NULL,       -- obligatoria siempre (contexto de unidad)
        State                   NVARCHAR(32) NOT NULL,       -- medido | no_medido | no_valorable
        Source                  NVARCHAR(32) NOT NULL,       -- medido | estimado | declarado
        NotMeasuredReason       NVARCHAR(500) NULL,
        CONSTRAINT FK_VitalSignMeasurement_Set FOREIGN KEY (VitalSetId) REFERENCES dbo.VitalSignSet(VitalSetId),
        CONSTRAINT FK_VitalSignMeasurement_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT CK_VitalSignMeasurement_State CHECK (
            (State = N'medido' AND Value IS NOT NULL AND NotMeasuredReason IS NULL)
            OR (State IN (N'no_medido', N'no_valorable') AND Value IS NULL AND NotMeasuredReason IS NOT NULL)
        )
    );

    CREATE INDEX IX_VitalSignMeasurement_Set
        ON dbo.VitalSignMeasurement (VitalSetId, SignCode);

    CREATE INDEX IX_VitalSignMeasurement_EncounterSign
        ON dbo.VitalSignMeasurement (TenantId, SignCode);
END
GO

PRINT '0008_triage_signos OK';
GO
