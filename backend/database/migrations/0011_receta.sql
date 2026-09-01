-- 0011_receta.sql — MediCore M8 / WS-I (idempotente)
-- Catálogo de medicamentos + receta con ítems estructurados.
-- Requiere sqlcmd DbName. Depende de M1 (profesional), M6 (firma), M7 (estado alérgico), M11 (sucursal).
--
-- ─────────────────────────── Por qué esta forma ───────────────────────────
--
-- 1. Medication: GenericName NOT NULL (LGS art. 225/226); BrandName opcional.
--    SaleClassification = fracciones I–VI del art. 226 LGS. IsControlledSubstance
--    marca estupefacientes/psicotrópicos: se IMPIDEN en Fase 1 (no negociable).
--
-- 2. Prescription congela AllergyStatusAtIssue al emitir. AllergyStatusCaptureEventId
--    referencia el acto de captura explícita cuando se forzó el paso previo.
--    Decisión 2026-08-27: se exige captura explícita del estado (puede ser
--    no_interrogado / paciente_no_puede_responder); no se bloquea «hasta conocer».
--
-- 3. PrescriptionItem: dosis (Medicion JSON), vía y frecuencia estructurada
--    (every_n_hours | n_times_per_day). Sin DELETE físico: cancelación = reverso.
--
-- 4. Firma/emisión fail closed con cédula (LGS art. 83). SealState como notas.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.Medication ────────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.Medication', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Medication (
        MedicationId            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Medication PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        GenericName             NVARCHAR(200) NOT NULL,
        BrandName               NVARCHAR(200) NULL,
        Presentation            NVARCHAR(200) NULL,
        Concentration           NVARCHAR(100) NULL,
        DefaultRoute            NVARCHAR(64) NULL,
        -- Fracciones LGS art. 226: I | II | III | IV | V | VI
        SaleClassification      NVARCHAR(8) NOT NULL,
        IsControlledSubstance   BIT NOT NULL CONSTRAINT DF_Medication_Controlled DEFAULT (0),
        IsActive                BIT NOT NULL CONSTRAINT DF_Medication_IsActive DEFAULT (1),
        IsDeleted               BIT NOT NULL CONSTRAINT DF_Medication_IsDeleted DEFAULT (0),
        CreatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_Medication_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_Medication_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Medication_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT CK_Medication_SaleClass CHECK (SaleClassification IN (
            N'I', N'II', N'III', N'IV', N'V', N'VI'
        ))
    );

    CREATE INDEX IX_Medication_Tenant_Generic
        ON dbo.Medication (TenantId, GenericName)
        WHERE IsDeleted = 0 AND IsActive = 1;

    CREATE INDEX IX_Medication_Tenant_Controlled
        ON dbo.Medication (TenantId, IsControlledSubstance)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.Prescription ──────────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.Prescription', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Prescription (
        PrescriptionId                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Prescription PRIMARY KEY,
        TenantId                        UNIQUEIDENTIFIER NOT NULL,
        BranchId                        UNIQUEIDENTIFIER NOT NULL,
        EncounterId                     UNIQUEIDENTIFIER NOT NULL,
        SubjectId                       UNIQUEIDENTIFIER NOT NULL,
        ProfessionalId                  UNIQUEIDENTIFIER NULL,
        AuthorUserId                    UNIQUEIDENTIFIER NOT NULL,
        AuthorDisplayName               NVARCHAR(200) NOT NULL,
        AuthorLicenseSnapshot           NVARCHAR(MAX) NULL,
        FacilitySnapshotJson            NVARCHAR(MAX) NULL,
        IssuedAtUtc                     DATETIME2(3) NULL,
        ValidUntilUtc                   DATETIME2(3) NULL,
        AllergyStatusAtIssue            NVARCHAR(40) NOT NULL,
        AllergyStatusCaptureEventId     UNIQUEIDENTIFIER NULL,
        AllergyOverrideJustification    NVARCHAR(1000) NULL,
        ContentHash                     NVARCHAR(128) NULL,
        SignedAtUtc                     DATETIME2(3) NULL,
        SealedAtUtc                     DATETIME2(3) NULL,
        SealState                       NVARCHAR(32) NOT NULL CONSTRAINT DF_Prescription_Seal
                                            DEFAULT (N'pendiente'),
        CancelledAtUtc                  DATETIME2(3) NULL,
        CancelReason                    NVARCHAR(1000) NULL,
        CancelledByUserId               UNIQUEIDENTIFIER NULL,
        GeneralInstructions             NVARCHAR(2000) NULL,
        OccurredAtUtc                   DATETIME2(3) NOT NULL,
        RecordedAtUtc                   DATETIME2(3) NOT NULL CONSTRAINT DF_Prescription_Recorded
                                            DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc                    DATETIME2(3) NOT NULL CONSTRAINT DF_Prescription_Updated
                                            DEFAULT (SYSUTCDATETIME()),
        IsDeleted                       BIT NOT NULL CONSTRAINT DF_Prescription_IsDeleted DEFAULT (0),
        CONSTRAINT FK_Prescription_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_Prescription_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId),
        CONSTRAINT FK_Prescription_Encounter FOREIGN KEY (EncounterId) REFERENCES dbo.Encounter(EncounterId),
        CONSTRAINT FK_Prescription_Subject FOREIGN KEY (SubjectId) REFERENCES dbo.Subject(SubjectId),
        CONSTRAINT FK_Prescription_Professional FOREIGN KEY (ProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT CK_Prescription_AllergyStatus CHECK (AllergyStatusAtIssue IN (
            N'no_interrogado', N'niega', N'refiere', N'se_desconoce', N'paciente_no_puede_responder'
        )),
        CONSTRAINT CK_Prescription_Seal CHECK (SealState IN (N'pendiente', N'sellado'))
    );

    CREATE INDEX IX_Prescription_Tenant_Subject
        ON dbo.Prescription (TenantId, SubjectId, OccurredAtUtc DESC)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Prescription_Tenant_Encounter
        ON dbo.Prescription (TenantId, EncounterId)
        WHERE IsDeleted = 0;
END
GO

-- ── dbo.PrescriptionItem ──────────────────────────────────────────────────
IF OBJECT_ID(N'dbo.PrescriptionItem', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PrescriptionItem (
        PrescriptionItemId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PrescriptionItem PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        PrescriptionId          UNIQUEIDENTIFIER NOT NULL,
        LineNumber              INT NOT NULL,
        MedicationId            UNIQUEIDENTIFIER NOT NULL,
        GenericNameSnapshot     NVARCHAR(200) NOT NULL,
        BrandNameSnapshot       NVARCHAR(200) NULL,
        -- Medicion tipada: { "valor", "unidad", "estado", "origen", "razonNoMedido"? }
        DoseJson                NVARCHAR(500) NOT NULL,
        Route                   NVARCHAR(64) NOT NULL,
        -- Frecuencia estructurada: { "kind":"every_n_hours"|"n_times_per_day", "n": int }
        FrequencyJson           NVARCHAR(200) NOT NULL,
        DurationDays            INT NULL,
        Quantity                DECIMAL(18,4) NULL,
        RefillsAllowed          INT NOT NULL CONSTRAINT DF_PrescriptionItem_Refills DEFAULT (0),
        Instructions            NVARCHAR(1000) NULL,
        CONSTRAINT FK_PrescriptionItem_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_PrescriptionItem_Prescription FOREIGN KEY (PrescriptionId)
            REFERENCES dbo.Prescription(PrescriptionId),
        CONSTRAINT FK_PrescriptionItem_Medication FOREIGN KEY (MedicationId)
            REFERENCES dbo.Medication(MedicationId),
        CONSTRAINT CK_PrescriptionItem_Line CHECK (LineNumber > 0),
        CONSTRAINT CK_PrescriptionItem_Refills CHECK (RefillsAllowed >= 0 AND RefillsAllowed <= 3)
    );

    CREATE UNIQUE INDEX UQ_PrescriptionItem_Line
        ON dbo.PrescriptionItem (PrescriptionId, LineNumber);

    CREATE INDEX IX_PrescriptionItem_Prescription
        ON dbo.PrescriptionItem (TenantId, PrescriptionId);
END
GO

PRINT '0011_receta OK';
GO
