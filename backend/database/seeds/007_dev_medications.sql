-- 007_dev_medications.sql
-- Catálogo SINTÉTICO de Dev para recetas (M8). Incluye controlados marcados para rechazo.
-- Idempotente. Prohibido en Production.

USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';

IF OBJECT_ID(N'dbo.Medication', N'U') IS NULL
BEGIN
    RAISERROR(N'Falta dbo.Medication. Aplique migración 0011_receta.sql.', 16, 1);
    RETURN;
END

DECLARE @Meds TABLE (
    MedicationId            UNIQUEIDENTIFIER,
    GenericName             NVARCHAR(200),
    BrandName               NVARCHAR(200),
    Presentation            NVARCHAR(200),
    Concentration           NVARCHAR(100),
    DefaultRoute            NVARCHAR(64),
    SaleClassification      NVARCHAR(8),
    IsControlledSubstance   BIT
);

INSERT INTO @Meds VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', N'Paracetamol', NULL, N'Tableta', N'500mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', N'Ibuprofeno', NULL, N'Tableta', N'400mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003', N'Amoxicilina', NULL, N'Cápsula', N'500mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0004', N'Metformina', NULL, N'Tableta', N'850mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0005', N'Omeprazol', NULL, N'Cápsula', N'20mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0006', N'Loratadina', NULL, N'Tableta', N'10mg', N'oral', N'V', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0007', N'Enalapril', NULL, N'Tableta', N'10mg', N'oral', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0008', N'Salbutamol', NULL, N'Inhalador', N'100mcg/dosis', N'inhalatoria', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0009', N'Ceftriaxona', NULL, N'Ampolleta', N'1g', N'intravenosa', N'IV', 0),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0010', N'Diclofenaco', NULL, N'Ampolleta', N'75mg/3ml', N'intramuscular', N'IV', 0),
-- Controlados sintéticos (fracción I / psicotrópico): deben rechazarse al prescritir
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0091', N'Morfina', NULL, N'Ampolleta', N'10mg/ml', N'intravenosa', N'I', 1),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0092', N'Alprazolam', NULL, N'Tableta', N'0.5mg', N'oral', N'I', 1);

UPDATE m
SET m.GenericName = s.GenericName,
    m.BrandName = s.BrandName,
    m.Presentation = s.Presentation,
    m.Concentration = s.Concentration,
    m.DefaultRoute = s.DefaultRoute,
    m.SaleClassification = s.SaleClassification,
    m.IsControlledSubstance = s.IsControlledSubstance,
    m.IsActive = 1,
    m.IsDeleted = 0,
    m.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.Medication m
INNER JOIN @Meds s ON s.MedicationId = m.MedicationId
WHERE m.TenantId = @TenantId;

INSERT INTO dbo.Medication (
    MedicationId, TenantId, GenericName, BrandName, Presentation, Concentration,
    DefaultRoute, SaleClassification, IsControlledSubstance, IsActive
)
SELECT
    s.MedicationId, @TenantId, s.GenericName, s.BrandName, s.Presentation, s.Concentration,
    s.DefaultRoute, s.SaleClassification, s.IsControlledSubstance, 1
FROM @Meds s
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Medication m WHERE m.MedicationId = s.MedicationId
);

PRINT 'seed-medications OK — 10 no controlados + 2 controlados sintéticos (rechazo).';
GO
