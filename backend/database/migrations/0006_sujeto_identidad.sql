-- 0006_sujeto_identidad.sql — MediCore M3 / WS-D (idempotente)
-- Identidad progresiva (doc 08). Requiere sqlcmd DbName.
-- Sin DELETE, DROP ni TRUNCATE: sólo CREATE IF NOT EXISTS / índices filtrados.
--
-- Fundamento (no se afirma cumplimiento de producto):
-- NOM-004-SSA3-2012 numerales 5.9, 5.11, 6.1.1, 7.1 — doc 01 §2 (verificado 2026-08-22)
-- NOM-024-SSA3-2012 numeral 6.5.1 (prohibido autogenerar CURP) — doc 01 §3
-- Centinelas SINBA (09/09/9999, 999) NUNCA en Subject — sólo capa de reporte (Fase 4)
-- LFPDPPP vigente (DOF 20-03-2025, reforma 14-11-2025) arts. 8 y 9 fracciones V y VI — doc 01 §4
--
-- Etiqueta no identificado: UnidentifiedLabelConfig con cascada sucursal > tenant
-- (ratificado 2026-08-27). Ningún token de etiqueta puede ser un color.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.Subject ───────────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.Subject', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Subject (
        SubjectId               UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Subject PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        OriginBranchId          UNIQUEIDENTIFIER NOT NULL, -- sucursal de primer contacto (único requerido)
        RecordNumber            NVARCHAR(64) NULL,         -- folio ámbito tenant+sucursal (BM-PAC-12)
        IdentificationState     NVARCHAR(40) NOT NULL,
        GivenName               NVARCHAR(100) NULL,
        FirstSurname            NVARCHAR(100) NULL,
        SecondSurname           NVARCHAR(100) NULL,
        PreferredName           NVARCHAR(100) NULL,
        BirthDate               DATE NULL,                -- nunca 09/09/9999
        EstimatedAgeJson        NVARCHAR(400) NULL,        -- EdadEstimada; edad desconocida = NULL
        BiologicalSex           NVARCHAR(32) NULL,         -- sin valor por omisión
        SexSource               NVARCHAR(32) NULL,         -- documento | observado | declarado
        Curp                    NVARCHAR(18) NULL,         -- nunca autogenerada
        CurpValidatedAtUtc      DATETIME2(3) NULL,
        BloodTypeJson           NVARCHAR(400) NULL,        -- EstadoInterrogatorio
        DeceasedAtUtc           DATETIME2(3) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_Subject_IsDeleted DEFAULT (0),
        CreatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_Subject_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_Subject_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Subject_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_Subject_OriginBranch FOREIGN KEY (OriginBranchId) REFERENCES dbo.Branch(BranchId)
    );

    CREATE UNIQUE INDEX UQ_Subject_Tenant_Curp
        ON dbo.Subject (TenantId, Curp)
        WHERE Curp IS NOT NULL AND IsDeleted = 0;

    CREATE UNIQUE INDEX UQ_Subject_Tenant_Branch_RecordNumber
        ON dbo.Subject (TenantId, OriginBranchId, RecordNumber)
        WHERE RecordNumber IS NOT NULL AND IsDeleted = 0;

    CREATE INDEX IX_Subject_Tenant_State
        ON dbo.Subject (TenantId, IdentificationState)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Subject_Tenant_Name
        ON dbo.Subject (TenantId, FirstSurname, GivenName)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.SubjectIdentityEvent (append-only) ────────────────────────────────
IF OBJECT_ID(N'dbo.SubjectIdentityEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectIdentityEvent (
        EventId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectIdentityEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        FromState               NVARCHAR(40) NULL,
        ToState                 NVARCHAR(40) NOT NULL,
        EvidenceType            NVARCHAR(64) NULL,
        EvidenceReference       NVARCHAR(256) NULL,
        Justification           NVARCHAR(1000) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectIdentityEvent_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SubjectIdentityEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectIdentityEvent_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE INDEX IX_SubjectIdentityEvent_Subject_Occurred
        ON dbo.SubjectIdentityEvent (TenantId, SubjectId, OccurredAtUtc);
END
GO

-- ── dbo.UnidentifiedLabelConfig (tenant y opcionalmente sucursal) ─────────
IF OBJECT_ID(N'dbo.UnidentifiedLabelConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UnidentifiedLabelConfig (
        ConfigId                UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_UnidentifiedLabelConfig PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        BranchId                UNIQUEIDENTIFIER NULL,     -- NULL = ámbito tenant
        SchemeCode              NVARCHAR(64) NOT NULL,
        SchemeParamsJson        NVARCHAR(MAX) NOT NULL,   -- alfabeto, patrones; sin colores
        IsActive                BIT NOT NULL CONSTRAINT DF_UnidentifiedLabelConfig_IsActive DEFAULT (1),
        CreatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_UnidentifiedLabelConfig_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_UnidentifiedLabelConfig_Updated DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId         UNIQUEIDENTIFIER NULL,
        CONSTRAINT FK_UnidentifiedLabelConfig_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_UnidentifiedLabelConfig_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId)
    );

    -- Una config activa por tenant (BranchId NULL) y una por sucursal.
    CREATE UNIQUE INDEX UQ_UnidentifiedLabelConfig_Tenant
        ON dbo.UnidentifiedLabelConfig (TenantId)
        WHERE BranchId IS NULL AND IsActive = 1;

    CREATE UNIQUE INDEX UQ_UnidentifiedLabelConfig_Tenant_Branch
        ON dbo.UnidentifiedLabelConfig (TenantId, BranchId)
        WHERE BranchId IS NOT NULL AND IsActive = 1;
END
GO

-- ── dbo.SubjectTemporaryLabel ─────────────────────────────────────────────
IF OBJECT_ID(N'dbo.SubjectTemporaryLabel', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectTemporaryLabel (
        LabelId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectTemporaryLabel PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        BranchId                UNIQUEIDENTIFIER NOT NULL,
        InternalCode            NVARCHAR(128) NOT NULL,
        OperationalLabel        NVARCHAR(64) NOT NULL,
        ConfigSnapshotJson      NVARCHAR(MAX) NULL,       -- esquema/cascada al emitir
        IssuedAtUtc             DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectTemporaryLabel_Issued DEFAULT (SYSUTCDATETIME()),
        DeviceId                UNIQUEIDENTIFIER NULL,
        IsActive                BIT NOT NULL CONSTRAINT DF_SubjectTemporaryLabel_IsActive DEFAULT (1),
        CONSTRAINT FK_SubjectTemporaryLabel_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectTemporaryLabel_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_SubjectTemporaryLabel_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId)
    );

    CREATE UNIQUE INDEX UQ_SubjectTemporaryLabel_Tenant_Branch_Code
        ON dbo.SubjectTemporaryLabel (TenantId, BranchId, InternalCode)
        WHERE IsActive = 1;

    CREATE INDEX IX_SubjectTemporaryLabel_Subject
        ON dbo.SubjectTemporaryLabel (TenantId, SubjectId)
        WHERE IsActive = 1;
END
GO

-- ── dbo.SubjectDescriptor ─────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.SubjectDescriptor', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectDescriptor (
        DescriptorId            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectDescriptor PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        ApparentSex             NVARCHAR(32) NULL,
        ApparentAgeRange        NVARCHAR(64) NULL,
        ArrivalAtUtc            DATETIME2(3) NULL,
        DescriptorText          NVARCHAR(500) NULL,
        CreatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectDescriptor_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectDescriptor_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SubjectDescriptor_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectDescriptor_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE UNIQUE INDEX UQ_SubjectDescriptor_Subject
        ON dbo.SubjectDescriptor (TenantId, SubjectId);
END
GO

-- ── dbo.SubjectDistinctiveMark ────────────────────────────────────────────
IF OBJECT_ID(N'dbo.SubjectDistinctiveMark', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectDistinctiveMark (
        MarkId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectDistinctiveMark PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        RawText                 NVARCHAR(500) NULL,
        MarkType                NVARCHAR(64) NULL,
        AnatomicalRegion        NVARCHAR(64) NULL,
        Laterality              NVARCHAR(32) NULL,        -- izquierda | derecha | bilateral | linea_media | no_aplica
        Description             NVARCHAR(500) NULL,
        StructuredAtUtc         DATETIME2(3) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectDistinctiveMark_Recorded DEFAULT (SYSUTCDATETIME()),
        IsDeleted               BIT NOT NULL CONSTRAINT DF_SubjectDistinctiveMark_IsDeleted DEFAULT (0),
        CONSTRAINT FK_SubjectDistinctiveMark_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectDistinctiveMark_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE INDEX IX_SubjectDistinctiveMark_Subject
        ON dbo.SubjectDistinctiveMark (TenantId, SubjectId)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_SubjectDistinctiveMark_Search
        ON dbo.SubjectDistinctiveMark (TenantId, MarkType, AnatomicalRegion, Laterality)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.SubjectBelonging ──────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.SubjectBelonging', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectBelonging (
        BelongingId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectBelonging PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        Description             NVARCHAR(500) NOT NULL,
        Category                NVARCHAR(64) NULL,        -- vestimenta | objeto | otro
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectBelonging_Recorded DEFAULT (SYSUTCDATETIME()),
        IsDeleted               BIT NOT NULL CONSTRAINT DF_SubjectBelonging_IsDeleted DEFAULT (0),
        CONSTRAINT FK_SubjectBelonging_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectBelonging_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE INDEX IX_SubjectBelonging_Subject
        ON dbo.SubjectBelonging (TenantId, SubjectId)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.SubjectLink (append-only; sin fusión automática) ──────────────────
IF OBJECT_ID(N'dbo.SubjectLink', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectLink (
        LinkId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectLink PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        AbsorbedSubjectId       UNIQUEIDENTIFIER NOT NULL,
        SurvivingSubjectId      UNIQUEIDENTIFIER NOT NULL,
        LinkType                NVARCHAR(40) NOT NULL,    -- vinculacion | vinculacion_revertida
        Justification           NVARCHAR(1000) NOT NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectLink_Recorded DEFAULT (SYSUTCDATETIME()),
        RevertsLinkId           UNIQUEIDENTIFIER NULL,
        CONSTRAINT FK_SubjectLink_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectLink_Absorbed FOREIGN KEY (AbsorbedSubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_SubjectLink_Surviving FOREIGN KEY (SurvivingSubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE INDEX IX_SubjectLink_Absorbed
        ON dbo.SubjectLink (TenantId, AbsorbedSubjectId, RecordedAtUtc);

    CREATE INDEX IX_SubjectLink_Surviving
        ON dbo.SubjectLink (TenantId, SurvivingSubjectId, RecordedAtUtc);
END
GO

-- ── dbo.SubjectMergeQueue (sugerencia; jamás ejecución automática) ─────────
IF OBJECT_ID(N'dbo.SubjectMergeQueue', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectMergeQueue (
        CaseId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectMergeQueue PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectIdA              UNIQUEIDENTIFIER NOT NULL,
        SubjectIdB              UNIQUEIDENTIFIER NOT NULL,
        Score                   DECIMAL(5,4) NOT NULL,
        Status                  NVARCHAR(32) NOT NULL CONSTRAINT DF_SubjectMergeQueue_Status DEFAULT (N'pendiente'),
        EnqueuedByUserId        UNIQUEIDENTIFIER NOT NULL,
        EnqueuedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectMergeQueue_Enqueued DEFAULT (SYSUTCDATETIME()),
        ResolvedByUserId        UNIQUEIDENTIFIER NULL,
        ResolvedAtUtc           DATETIME2(3) NULL,
        ResolutionNote          NVARCHAR(1000) NULL,
        CONSTRAINT FK_SubjectMergeQueue_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId)
    );

    CREATE INDEX IX_SubjectMergeQueue_Tenant_Status
        ON dbo.SubjectMergeQueue (TenantId, Status, EnqueuedAtUtc);
END
GO

-- ── dbo.SubjectConsentLapse (cese base licitud art. 9 fr. VI LFPDPPP) ─────
IF OBJECT_ID(N'dbo.SubjectConsentLapse', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubjectConsentLapse (
        LapseId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SubjectConsentLapse PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        LapseReason             NVARCHAR(128) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_SubjectConsentLapse_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_SubjectConsentLapse_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_SubjectConsentLapse_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId)
    );

    CREATE INDEX IX_SubjectConsentLapse_Subject
        ON dbo.SubjectConsentLapse (TenantId, SubjectId, OccurredAtUtc);
END
GO

PRINT '0006_sujeto_identidad OK — Subject sin defaults clínicos; centinelas SINBA fuera del modelo.';
GO
