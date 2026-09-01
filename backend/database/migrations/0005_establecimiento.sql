-- 0005_establecimiento.sql — MediCore M11 / WS-C (idempotente)
-- Amplía dbo.Tenant y dbo.Branch con datos del establecimiento (NOM-004 5.2–5.2.4).
-- Requiere sqlcmd DbName. Sin DELETE, DROP ni TRUNCATE: sólo ALTER aditivo con IF.
--
-- ─────────────────────────── Por qué esta forma ───────────────────────────
--
-- 1. Todo expediente imprime tipo, nombre y domicilio del establecimiento (NOM-004
--    numerales 5.2 a 5.2.4, verificados en docs/analisis/01). Esos datos viven en
--    la configuración de tenant/sucursal; no se inventan al emitir el documento.
--
-- 2. Ninguna columna nueva se rellena por omisión. Un domicilio inventado se
--    imprimiría en notas y reportes clínicos. NULL = «no capturado».
--
-- 3. FacilityType y HasEmergencyService quedan NULL a propósito hasta que el
--    responsable sanitario responda la pregunta abierta L (plan Fase 1 §5.3 L;
--    doc 06 pregunta 10). No se inventa «consultorio general» ni se marca urgencias.
--
-- 4. ResponsiblePhysicianProfessionalId es NULL-able y la FK a
--    dbo.HealthcareProfessional sólo se crea si esa tabla ya existe (M1 / 0003).
--    M11 no depende de inventar un profesional responsable.
--
-- 5. Rfc y PrimaryColorToken en Tenant son NULL: Rfc se usará en Fase 2 (CFDI);
--    PrimaryColorToken es white-label opcional.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- ── dbo.Tenant (aditivo) ──────────────────────────────────────────────────
IF COL_LENGTH(N'dbo.Tenant', N'LegalName') IS NULL
    ALTER TABLE dbo.Tenant ADD LegalName NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.Tenant', N'Rfc') IS NULL
    ALTER TABLE dbo.Tenant ADD Rfc NVARCHAR(13) NULL;
GO

IF COL_LENGTH(N'dbo.Tenant', N'PrimaryColorToken') IS NULL
    ALTER TABLE dbo.Tenant ADD PrimaryColorToken NVARCHAR(64) NULL;
GO

-- ── dbo.Branch (aditivo) ──────────────────────────────────────────────────
IF COL_LENGTH(N'dbo.Branch', N'FacilityType') IS NULL
    ALTER TABLE dbo.Branch ADD FacilityType NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'LegalName') IS NULL
    ALTER TABLE dbo.Branch ADD LegalName NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressStreet') IS NULL
    ALTER TABLE dbo.Branch ADD AddressStreet NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressNumber') IS NULL
    ALTER TABLE dbo.Branch ADD AddressNumber NVARCHAR(32) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressNeighborhood') IS NULL
    ALTER TABLE dbo.Branch ADD AddressNeighborhood NVARCHAR(120) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressMunicipality') IS NULL
    ALTER TABLE dbo.Branch ADD AddressMunicipality NVARCHAR(120) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressState') IS NULL
    ALTER TABLE dbo.Branch ADD AddressState NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'AddressPostalCode') IS NULL
    ALTER TABLE dbo.Branch ADD AddressPostalCode NVARCHAR(16) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'PhoneNumber') IS NULL
    ALTER TABLE dbo.Branch ADD PhoneNumber NVARCHAR(32) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'HealthLicense') IS NULL
    ALTER TABLE dbo.Branch ADD HealthLicense NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'ResponsiblePhysicianProfessionalId') IS NULL
    ALTER TABLE dbo.Branch ADD ResponsiblePhysicianProfessionalId UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'TimeZoneId') IS NULL
    ALTER TABLE dbo.Branch ADD TimeZoneId NVARCHAR(64) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'HasEmergencyService') IS NULL
    ALTER TABLE dbo.Branch ADD HasEmergencyService BIT NULL;
GO

-- FK opcional: sólo si M1 ya creó HealthcareProfessional y la FK no existe.
IF OBJECT_ID(N'dbo.HealthcareProfessional', N'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = N'FK_Branch_ResponsiblePhysician'
          AND parent_object_id = OBJECT_ID(N'dbo.Branch')
   )
BEGIN
    ALTER TABLE dbo.Branch
        ADD CONSTRAINT FK_Branch_ResponsiblePhysician
        FOREIGN KEY (ResponsiblePhysicianProfessionalId)
        REFERENCES dbo.HealthcareProfessional (HealthcareProfessionalId);
END
GO

PRINT '0005_establecimiento OK — FacilityType/HasEmergencyService quedan NULL (pregunta abierta L).';
GO
