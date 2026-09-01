-- 0010_consulta_notas.sql — MediCore M6 / WS-H (idempotente)
-- Notas clínicas, addenda append-only, co-autoría; firma local + sello.
-- Requiere sqlcmd DbName. Sin DELETE, DROP ni TRUNCATE.
--
-- Fundamento (no se afirma cumplimiento de producto):
-- NOM-004-SSA3-2012 numerales 5.2–5.2.4, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 7.1, 8.9 —
--   doc 01 (verificado 2026-08-22).
-- LGS art. 83 (cédula/especialidad en documentos) — verificado 2026-08-22.
--
-- Pregunta G / dictamen 69 / #9: valor jurídico de firma local + sello vs NOM-004 5.10
--   y e.firma SAT — PENDIENTE. Se implementa mecánica de integridad (hash + sello) SIN
--   afirmar validez jurídica plena ni e.firma.
-- Pregunta H / decisión 61: qué actos cuentan para LastMedicalActAtUtc — PENDIENTE.
--   Al firmar se puede tocar el reloj vía sp_ClinicalRecord_TouchMedicalAct sin afirmar
--   que el ActType cuenta para retención (Fase 3).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.ClinicalNote ──────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.ClinicalNote', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalNote (
        NoteId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ClinicalNote PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        EncounterId             UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NOT NULL,
        -- urgencias_inicial | evolucion | interconsulta | referencia_traslado | egreso | enfermeria | certificado
        NoteType                NVARCHAR(40) NOT NULL,
        -- Campos tipados por tipo de nota (JSON). No blob de texto libre sin estructura.
        BodyJson                NVARCHAR(MAX) NOT NULL,
        -- Exigido por numerales 6.1.5 / 6.2.5 en tipos que lo requieren; sin escala prescrita.
        Prognosis               NVARCHAR(200) NULL,
        AuthorProfessionalId    UNIQUEIDENTIFIER NULL,
        AuthorUserId            UNIQUEIDENTIFIER NOT NULL,
        AuthorDisplayName       NVARCHAR(200) NOT NULL,
        -- Snapshot de cédula/especialidad al firmar (reimpresión años después). NULL hasta firma.
        AuthorLicenseSnapshot   NVARCHAR(MAX) NULL,
        -- Snapshot establecimiento (NOM-004 5.2–5.2.4). Campos ausentes = NULL; no inventar domicilio.
        FacilitySnapshotJson    NVARCHAR(MAX) NULL,
        ContentHash             NVARCHAR(64) NULL,
        SignedAtUtc             DATETIME2(3) NULL,
        SealedAtUtc             DATETIME2(3) NULL,
        -- pendiente | sellado
        SealState               NVARCHAR(20) NOT NULL CONSTRAINT DF_ClinicalNote_SealState DEFAULT (N'pendiente'),
        IsDeleted               BIT NOT NULL CONSTRAINT DF_ClinicalNote_IsDeleted DEFAULT (0),
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_ClinicalNote_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ClinicalNote_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ClinicalNote_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_ClinicalNote_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT CK_ClinicalNote_NoteType CHECK (NoteType IN (
            N'urgencias_inicial', N'evolucion', N'interconsulta',
            N'referencia_traslado', N'egreso', N'enfermeria', N'certificado'
        )),
        CONSTRAINT CK_ClinicalNote_SealState CHECK (SealState IN (N'pendiente', N'sellado'))
    );

    CREATE INDEX IX_ClinicalNote_Encounter_Occurred
        ON dbo.ClinicalNote (TenantId, EncounterId, OccurredAtUtc DESC)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_ClinicalNote_Subject_Occurred
        ON dbo.ClinicalNote (TenantId, SubjectId, OccurredAtUtc DESC)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_ClinicalNote_Type_Signed
        ON dbo.ClinicalNote (TenantId, NoteType, SignedAtUtc)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.ClinicalNoteAddendum (append-only; numeral 5.11) ───────────────────
IF OBJECT_ID(N'dbo.ClinicalNoteAddendum', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalNoteAddendum (
        AddendumId              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ClinicalNoteAddendum PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        NoteId                  UNIQUEIDENTIFIER NOT NULL,
        ReasonText              NVARCHAR(2000) NOT NULL,
        BodyJson                NVARCHAR(MAX) NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        ActorDisplayName        NVARCHAR(200) NOT NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_ClinicalNoteAddendum_Recorded DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ClinicalNoteAddendum_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ClinicalNoteAddendum_Note FOREIGN KEY (NoteId) REFERENCES dbo.ClinicalNote(NoteId)
    );

    CREATE INDEX IX_ClinicalNoteAddendum_Note_Occurred
        ON dbo.ClinicalNoteAddendum (TenantId, NoteId, OccurredAtUtc);
END
GO

-- ── dbo.ClinicalNoteCoAuthor (art. 81 Reglamento / certificado dos médicos) ─
IF OBJECT_ID(N'dbo.ClinicalNoteCoAuthor', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClinicalNoteCoAuthor (
        CoAuthorId              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ClinicalNoteCoAuthor PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        NoteId                  UNIQUEIDENTIFIER NOT NULL,
        ProfessionalId          UNIQUEIDENTIFIER NOT NULL,
        ProfessionalLicenseSnapshot NVARCHAR(64) NULL,
        FullNameSnapshot        NVARCHAR(200) NOT NULL,
        AddedByUserId           UNIQUEIDENTIFIER NOT NULL,
        AddedAtUtc              DATETIME2(3) NOT NULL CONSTRAINT DF_ClinicalNoteCoAuthor_Added DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ClinicalNoteCoAuthor_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ClinicalNoteCoAuthor_Note FOREIGN KEY (NoteId) REFERENCES dbo.ClinicalNote(NoteId),
        CONSTRAINT FK_ClinicalNoteCoAuthor_Professional FOREIGN KEY (ProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId)
    );

    CREATE UNIQUE INDEX UQ_ClinicalNoteCoAuthor_Note_Professional
        ON dbo.ClinicalNoteCoAuthor (TenantId, NoteId, ProfessionalId);
END
GO

PRINT '0010_consulta_notas OK — firma local+sello sin afirmar validez jurídica (pregunta G).';
GO
