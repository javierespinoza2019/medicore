-- 0009_expediente.sql — MediCore M7 / WS-G (idempotente)
-- Expediente único por sujeto+tenant, historia versionada, estado alérgico, flags.
-- Requiere sqlcmd DbName. Sin DELETE, DROP ni TRUNCATE.
--
-- Fundamento (no se afirma cumplimiento de producto):
-- NOM-004-SSA3-2012 numerales 4.4, 5.4, 5.5/5.5.1, 5.11, 6.1.1, 6.1.2 — doc 01 (verificado 2026-08-22)
-- BM-PAC-01 / BM-PAC-14: no fabricar «negado»/«normal»; estado explícito no_interrogado.
--
-- Pregunta H / decisión 61 (doc 06): LastMedicalActAtUtc es nullable.
-- Qué actos cuentan para el reloj de retención (NOM-004 5.4) queda pendiente; no se afirma lista.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.ClinicalRecord (expediente único, numeral 4.4) ────────────────────
IF OBJECT_ID(N'dbo.ClinicalRecord', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalRecord (
        RecordId                UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ClinicalRecord PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        OpenedAtUtc             DATETIME2(3) NOT NULL,
        -- Reloj de retención (NOM-004 5.4). NULL = aún sin acto contado.
        -- Regla de qué actos cuentan: pendiente (pregunta H / decisión 61).
        LastMedicalActAtUtc     DATETIME2(3) NULL,
        LastMedicalActType      NVARCHAR(64) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_ClinicalRecord_IsDeleted DEFAULT (0),
        CreatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_ClinicalRecord_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_ClinicalRecord_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ClinicalRecord_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ClinicalRecord_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE UNIQUE INDEX UQ_ClinicalRecord_Tenant_Subject
        ON dbo.ClinicalRecord (TenantId, SubjectId)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_ClinicalRecord_Tenant_Opened
        ON dbo.ClinicalRecord (TenantId, OpenedAtUtc)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.MedicalHistory (append-only por versión; sin UPDATE destructivo del cuerpo) ──
IF OBJECT_ID(N'dbo.MedicalHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MedicalHistory (
        HistoryId               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MedicalHistory PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        RecordId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        Version                 INT NOT NULL,
        -- EstadoInterrogatorio tipado por sección (JSON). Estado inicial: todo no_interrogado.
        BodyJson                NVARCHAR(MAX) NOT NULL,
        Origin                  NVARCHAR(40) NOT NULL, -- capturado | prellenado_por_sistema
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_MedicalHistory_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_MedicalHistory_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_MedicalHistory_Record FOREIGN KEY (RecordId) REFERENCES dbo.ClinicalRecord(RecordId),
        CONSTRAINT FK_MedicalHistory_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT CK_MedicalHistory_Origin CHECK (Origin IN (N'capturado', N'prellenado_por_sistema')),
        CONSTRAINT CK_MedicalHistory_Version CHECK (Version >= 1)
    );

    CREATE UNIQUE INDEX UQ_MedicalHistory_Record_Version
        ON dbo.MedicalHistory (TenantId, RecordId, Version);

    CREATE INDEX IX_MedicalHistory_Record_Recorded
        ON dbo.MedicalHistory (TenantId, RecordId, RecordedAtUtc DESC);
END
GO

-- ── dbo.HistoryAmendment (addendum append-only; numeral 5.11) ─────────────
IF OBJECT_ID(N'dbo.HistoryAmendment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HistoryAmendment (
        AmendmentId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_HistoryAmendment PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        RecordId                UNIQUEIDENTIFIER NOT NULL,
        HistoryId               UNIQUEIDENTIFIER NOT NULL,
        ReasonText              NVARCHAR(2000) NOT NULL,
        BodyJson                NVARCHAR(MAX) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_HistoryAmendment_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_HistoryAmendment_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_HistoryAmendment_Record FOREIGN KEY (RecordId) REFERENCES dbo.ClinicalRecord(RecordId),
        CONSTRAINT FK_HistoryAmendment_History FOREIGN KEY (HistoryId) REFERENCES dbo.MedicalHistory(HistoryId)
    );

    CREATE INDEX IX_HistoryAmendment_History_Occurred
        ON dbo.HistoryAmendment (TenantId, HistoryId, OccurredAtUtc);
END
GO

-- ── dbo.AllergyStatusEvent (estado alérgico append-only; actual = mayor OccurredAtUtc) ──
-- Códigos: no_interrogado | niega | refiere | se_desconoce | paciente_no_puede_responder
-- alergias:[] NUNCA significa «sin alergias» si el estado es no_interrogado (BM-PAC-01).
IF OBJECT_ID(N'dbo.AllergyStatusEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AllergyStatusEvent (
        StatusEventId           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AllergyStatusEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        RecordId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        Status                  NVARCHAR(40) NOT NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_AllergyStatusEvent_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AllergyStatusEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_AllergyStatusEvent_Record FOREIGN KEY (RecordId) REFERENCES dbo.ClinicalRecord(RecordId),
        CONSTRAINT FK_AllergyStatusEvent_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT CK_AllergyStatusEvent_Status CHECK (Status IN (
            N'no_interrogado', N'niega', N'refiere', N'se_desconoce', N'paciente_no_puede_responder'
        ))
    );

    CREATE INDEX IX_AllergyStatusEvent_Record_Occurred
        ON dbo.AllergyStatusEvent (TenantId, RecordId, OccurredAtUtc DESC);
END
GO

-- ── dbo.Allergy (filas tipadas; baja lógica) ───────────────────────────────
IF OBJECT_ID(N'dbo.Allergy', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Allergy (
        AllergyId               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Allergy PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        RecordId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        Substance               NVARCHAR(200) NOT NULL,
        ReactionType            NVARCHAR(40) NOT NULL,  -- alergia | intolerancia | efecto_adverso_conocido
        Category                NVARCHAR(40) NULL,      -- medicamento | alimento | ...
        Manifestation           NVARCHAR(500) NULL,
        Severity                NVARCHAR(40) NULL,      -- leve | moderada | grave | anafilaxia | desconocida
        Certainty               NVARCHAR(40) NULL,      -- confirmada | probable | referida_por_paciente
        DataOrigin              NVARCHAR(64) NULL,      -- paciente | familiar | expediente_previo | ...
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_Allergy_Recorded DEFAULT (SYSUTCDATETIME()),
        IsDeleted               BIT NOT NULL CONSTRAINT DF_Allergy_IsDeleted DEFAULT (0),
        SoftDeletedAtUtc        DATETIME2(3) NULL,
        SoftDeletedByUserId     UNIQUEIDENTIFIER NULL,
        CONSTRAINT FK_Allergy_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_Allergy_Record FOREIGN KEY (RecordId) REFERENCES dbo.ClinicalRecord(RecordId),
        CONSTRAINT FK_Allergy_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT CK_Allergy_ReactionType CHECK (ReactionType IN (
            N'alergia', N'intolerancia', N'efecto_adverso_conocido'
        ))
    );

    CREATE INDEX IX_Allergy_Record_Active
        ON dbo.Allergy (TenantId, RecordId)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.SubjectFlag (alertas destacadas; embarazo tipado, no texto libre) ──
IF OBJECT_ID(N'dbo.SubjectFlag', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectFlag (
        FlagId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectFlag PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        RecordId                UNIQUEIDENTIFIER NOT NULL,
        FlagType                NVARCHAR(40) NOT NULL, -- alergia_grave | riesgo | embarazo | otro
        -- Embarazo: { "gestationalAgeWeeks": n | null, "estimatedDueDate": "..." | null }
        PayloadJson             NVARCHAR(MAX) NULL,
        IsActive                BIT NOT NULL CONSTRAINT DF_SubjectFlag_IsActive DEFAULT (1),
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectFlag_Recorded DEFAULT (SYSUTCDATETIME()),
        DeactivatedAtUtc        DATETIME2(3) NULL,
        CONSTRAINT FK_SubjectFlag_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectFlag_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_SubjectFlag_Record FOREIGN KEY (RecordId) REFERENCES dbo.ClinicalRecord(RecordId),
        CONSTRAINT CK_SubjectFlag_Type CHECK (FlagType IN (
            N'alergia_grave', N'riesgo', N'embarazo', N'otro'
        ))
    );

    CREATE INDEX IX_SubjectFlag_Subject_Active
        ON dbo.SubjectFlag (TenantId, SubjectId)
        WHERE IsActive = 1;
END
GO

PRINT '0009_expediente OK';
GO
