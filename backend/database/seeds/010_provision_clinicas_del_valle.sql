-- 010_provision_clinicas_del_valle.sql
-- Aprovisionamiento MANUAL del tenant piloto "Clínicas del Valle" + 2 sucursales.
-- Idempotente: IF NOT EXISTS / UPDATE; sin DELETE.
-- No corre en el seed automático de apply-database.ps1 (nombre *_provision_*).
--
-- FacilityType / HasEmergencyService / domicilio: NULL a propósito (no se inventan;
-- tipología vía API/admin o decisión escrita).
--
-- Variables sqlcmd:
--   DbName (obligatoria)
--   AdminPasswordHash (opcional: si vacío usa hash Demo123! sintético de seeds/001)
--
-- IDs estables (reproducibles entre ambientes demo):
--   Tenant  a1b2c3d4-0001-4000-8000-000000000001
--   Chalco  a1b2c3d4-0001-4000-8000-000000000101
--   Satélite a1b2c3d4-0001-4000-8000-000000000102
--   Admin   a1b2c3d4-0001-4000-8000-000000000201

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @TenantId   UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000001';
DECLARE @BranchChalco UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000101';
DECLARE @BranchSatelite UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000102';
DECLARE @AdminUserId UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000201';
DECLARE @TriageConfigId UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000301';

DECLARE @TenantCode NVARCHAR(64) = N'clinicas_del_valle';
DECLARE @TenantName NVARCHAR(200) = N'Clínicas del Valle';
DECLARE @AdminUserName NVARCHAR(128) = N'admin';
DECLARE @AdminDisplayName NVARCHAR(200) = N'Administrador Clínicas del Valle';

-- Password por omisión Demo123! (mismo hash que seeds/001). Sustituible con -v AdminPasswordHash=...
DECLARE @AdminPasswordHash NVARCHAR(200) = NULLIF(N'$(AdminPasswordHash)', N'');
IF @AdminPasswordHash IS NULL
    SET @AdminPasswordHash = N'$2a$11$SXuEG72vHIZndEe7h3kuX.LavN1Lzvhzm0SKzVNBwXqWgTGoTY1vK';

-- ─────────────────────────────── Tenant ───────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.Tenant WHERE Code = @TenantCode AND IsDeleted = 0)
        THROW 51001, N'Ya existe un tenant con Code=clinicas_del_valle y otro TenantId.', 1;

    INSERT INTO dbo.Tenant (TenantId, Code, Name, IsActive, IsDeleted)
    VALUES (@TenantId, @TenantCode, @TenantName, 1, 0);
END
ELSE
BEGIN
    UPDATE dbo.Tenant
    SET Code = @TenantCode,
        Name = @TenantName,
        IsActive = 1,
        IsDeleted = 0
    WHERE TenantId = @TenantId;
END

-- ────────────────────────────── Sucursales ────────────────────────────────
DECLARE @Branches TABLE (
    BranchId UNIQUEIDENTIFIER,
    Code NVARCHAR(64),
    Name NVARCHAR(200)
);
INSERT INTO @Branches (BranchId, Code, Name) VALUES
    (@BranchChalco,   N'CHALCO',   N'Servicios de Salud - Chalco'),
    (@BranchSatelite, N'SATELITE', N'Servicios de Salud - Satelite');

UPDATE b
SET b.Code = s.Code,
    b.Name = s.Name,
    b.IsActive = 1,
    b.IsDeleted = 0
FROM dbo.Branch b
INNER JOIN @Branches s ON s.BranchId = b.BranchId
WHERE b.TenantId = @TenantId;

INSERT INTO dbo.Branch (
    BranchId, TenantId, Code, Name,
    FacilityType, HasEmergencyService,
    IsActive, IsDeleted
)
SELECT s.BranchId, @TenantId, s.Code, s.Name,
       NULL, NULL,
       1, 0
FROM @Branches s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Branch b WHERE b.BranchId = s.BranchId);

-- Codes ocupados por otra fila del mismo tenant
IF EXISTS (
    SELECT 1
    FROM @Branches s
    INNER JOIN dbo.Branch b ON b.TenantId = @TenantId AND b.Code = s.Code AND b.IsDeleted = 0
    WHERE b.BranchId <> s.BranchId
)
    THROW 51002, N'Conflicto de Code de sucursal en el tenant clinicas_del_valle.', 1;

-- ───────────────────────────────── Roles ──────────────────────────────────
DECLARE @Roles TABLE (Code NVARCHAR(64), Name NVARCHAR(128));
INSERT INTO @Roles (Code, Name) VALUES
    (N'admin',          N'Administrador'),
    (N'medico',         N'Médico'),
    (N'recepcion',      N'Recepción'),
    (N'enfermeria',     N'Enfermería'),
    (N'caja',           N'Caja y Cobros'),
    (N'farmacia',       N'Farmacia'),
    (N'laboratorio',    N'Laboratorio'),
    (N'directivo',      N'Directivo'),
    (N'trabajo_social', N'Trabajo social');

INSERT INTO dbo.Role (RoleId, TenantId, Code, Name)
SELECT NEWID(), @TenantId, s.Code, s.Name
FROM @Roles s
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Role r WHERE r.TenantId = @TenantId AND r.Code = s.Code
);

-- ──────────────────────────── Usuario admin ───────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserId = @AdminUserId)
BEGIN
    INSERT INTO dbo.[User] (UserId, TenantId, UserName, DisplayName, PasswordHash, IsActive, IsSuperAdmin)
    VALUES (@AdminUserId, @TenantId, @AdminUserName, @AdminDisplayName, @AdminPasswordHash, 1, 0);
END
ELSE
BEGIN
    UPDATE dbo.[User]
    SET UserName = @AdminUserName,
        DisplayName = @AdminDisplayName,
        PasswordHash = @AdminPasswordHash,
        IsActive = 1,
        IsDeleted = 0,
        IsSuperAdmin = 0,
        FailedLoginCount = 0,
        LockoutUntilUtc = NULL
    WHERE UserId = @AdminUserId AND TenantId = @TenantId;
END

INSERT INTO dbo.UserRole (UserId, RoleId, TenantId)
SELECT @AdminUserId, r.RoleId, @TenantId
FROM dbo.Role r
WHERE r.TenantId = @TenantId AND r.Code = N'admin'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.UserRole ur WHERE ur.UserId = @AdminUserId AND ur.RoleId = r.RoleId
  );

INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId)
SELECT @AdminUserId, s.BranchId, @TenantId
FROM @Branches s
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserBranch ub
    WHERE ub.UserId = @AdminUserId AND ub.BranchId = s.BranchId
);

-- Flags opcionales apagados (DGIS/SINBA es capacidad fija, no flag)
IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'CFDI' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'CFDI', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'FHIR' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'FHIR', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'RENAPO' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'RENAPO', 0);

-- Escala de triage sintética de arranque (misma plantilla que seeds/006; no es norma).
IF OBJECT_ID(N'dbo.TriageScaleConfig', N'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM dbo.TriageScaleConfig
        WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1
   )
BEGIN
    DECLARE @LevelsJson NVARCHAR(MAX) = N'{
  "levels": [
    { "code": "prioridad_1", "label": "Atención inmediata", "priority": 1, "icon": "ri-flashlight-line", "sortHint": "1" },
    { "code": "prioridad_2", "label": "Muy urgente", "priority": 2, "icon": "ri-alarm-warning-line", "sortHint": "2" },
    { "code": "prioridad_3", "label": "Urgente", "priority": 3, "icon": "ri-error-warning-line", "sortHint": "3" },
    { "code": "prioridad_4", "label": "Menos urgente", "priority": 4, "icon": "ri-time-line", "sortHint": "4" },
    { "code": "prioridad_5", "label": "No urgente", "priority": 5, "icon": "ri-check-line", "sortHint": "5" }
  ],
  "note": "Escala sintética de arranque; el establecimiento la ajusta vía API/admin."
}';
    INSERT INTO dbo.TriageScaleConfig (
        ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson, IsActive, UpdatedByUserId
    )
    VALUES (
        @TriageConfigId, @TenantId, NULL,
        N'escala_sintetica_demo_v1',
        N'Escala sintética (5 niveles)',
        @LevelsJson, 1, @AdminUserId
    );
END

-- Catálogo sintético mínimo de medicamentos (mismo espíritu que seeds/007).
IF OBJECT_ID(N'dbo.Medication', N'U') IS NOT NULL
BEGIN
    DECLARE @Meds TABLE (
        MedicationId UNIQUEIDENTIFIER,
        GenericName NVARCHAR(200),
        Presentation NVARCHAR(200),
        Concentration NVARCHAR(100),
        DefaultRoute NVARCHAR(64),
        SaleClassification NVARCHAR(8),
        IsControlledSubstance BIT
    );
    INSERT INTO @Meds VALUES
    ('a1b2c3d4-aed0-4000-8000-000000000001', N'Paracetamol', N'Tableta', N'500mg', N'oral', N'IV', 0),
    ('a1b2c3d4-aed0-4000-8000-000000000002', N'Ibuprofeno', N'Tableta', N'400mg', N'oral', N'IV', 0),
    ('a1b2c3d4-aed0-4000-8000-000000000003', N'Amoxicilina', N'Cápsula', N'500mg', N'oral', N'IV', 0),
    ('a1b2c3d4-aed0-4000-8000-000000000004', N'Metformina', N'Tableta', N'850mg', N'oral', N'IV', 0),
    ('a1b2c3d4-aed0-4000-8000-000000000005', N'Omeprazol', N'Cápsula', N'20mg', N'oral', N'IV', 0),
    ('a1b2c3d4-aed0-4000-8000-000000000091', N'Morfina', N'Ampolleta', N'10mg/ml', N'intravenosa', N'I', 1),
    ('a1b2c3d4-aed0-4000-8000-000000000092', N'Alprazolam', N'Tableta', N'0.5mg', N'oral', N'I', 1);

    INSERT INTO dbo.Medication (
        MedicationId, TenantId, GenericName, BrandName, Presentation, Concentration,
        DefaultRoute, SaleClassification, IsControlledSubstance, IsActive, IsDeleted
    )
    SELECT m.MedicationId, @TenantId, m.GenericName, NULL, m.Presentation, m.Concentration,
           m.DefaultRoute, m.SaleClassification, m.IsControlledSubstance, 1, 0
    FROM @Meds m
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Medication x WHERE x.MedicationId = m.MedicationId);
END

PRINT N'010_provision_clinicas_del_valle OK — tenant=clinicas_del_valle'
    + N' branches=CHALCO,SATELITE user=admin (password por omisión Demo123! si no se pasó AdminPasswordHash).';
GO
