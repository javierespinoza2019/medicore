-- 002_dev_catalogo_equivalente.sql
-- Catálogo de identidad equivalente al del prototipo (docs/frontend/src/mocks/users.ts y branches.ts),
-- para que el login real sustituya al login mock sin romper permisos ni navegación.
--
-- Datos SINTÉTICOS. Prohibido en Production (el script de despliegue no lo ejecuta ahí).
-- Idempotente: inserta lo que falta y actualiza lo existente. No borra nada.
-- El mapeo con los ids del prototipo se hace por Branch.Code y Role.Code, no por GUID.

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
-- Password de todos estos usuarios sintéticos: Admin123!  (igual que en el prototipo)
DECLARE @PasswordHash NVARCHAR(200) = N'$2a$11$VqqgEzBHtJABjTeUcd1x2u57NAfX3uUkLU2CYH93.iPjFByVoIvgS';

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
BEGIN
    RAISERROR(N'Falta el tenant demo. Ejecute primero seeds/001_demo_tenant.sql.', 16, 1);
    RETURN;
END

-- ─────────────────────────────── Sucursales ───────────────────────────────
-- CENTRAL corresponde a la sucursal ya sembrada en 001.
DECLARE @Branches TABLE (BranchId UNIQUEIDENTIFIER, Code NVARCHAR(64), Name NVARCHAR(200));
INSERT INTO @Branches (BranchId, Code, Name) VALUES
    ('22222222-2222-2222-2222-222222222222', N'CENTRAL', N'Clínica Central - CDMX'),
    ('22222222-2222-2222-2222-222222222002', N'NORTE',   N'Sucursal Norte - CDMX'),
    ('22222222-2222-2222-2222-222222222003', N'SUR',     N'Sucursal Sur - CDMX');

UPDATE b
SET b.Code = s.Code,
    b.Name = s.Name,
    b.IsActive = 1,
    b.IsDeleted = 0
FROM dbo.Branch b
INNER JOIN @Branches s ON s.BranchId = b.BranchId;

INSERT INTO dbo.Branch (BranchId, TenantId, Code, Name)
SELECT s.BranchId, @TenantId, s.Code, s.Name
FROM @Branches s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Branch b WHERE b.BranchId = s.BranchId);

-- Tipología por sucursal (decisión L ratificada 2026-08-30; ver doc 06 §10).
-- Solo FacilityType / HasEmergencyService. No inventa domicilios ni PHI.
UPDATE dbo.Branch
SET FacilityType = N'ambulatorio_con_urgencias',
    HasEmergencyService = 1
WHERE TenantId = @TenantId AND Code = N'CENTRAL' AND IsDeleted = 0;

UPDATE dbo.Branch
SET FacilityType = N'ambulatorio',
    HasEmergencyService = 0
WHERE TenantId = @TenantId AND Code IN (N'NORTE', N'SUR') AND IsDeleted = 0;

-- ───────────────────────────────── Roles ──────────────────────────────────
-- Code coincide con UserRole del prototipo; el front no traduce nombres inventados.
DECLARE @Roles TABLE (RoleId UNIQUEIDENTIFIER, Code NVARCHAR(64), Name NVARCHAR(128));
INSERT INTO @Roles (RoleId, Code, Name) VALUES
    ('44444444-4444-4444-4444-444444440001', N'admin',            N'Administrador'),
    ('44444444-4444-4444-4444-444444440002', N'medico',           N'Médico'),
    ('44444444-4444-4444-4444-444444440003', N'recepcion',        N'Recepción'),
    ('44444444-4444-4444-4444-444444440004', N'enfermeria',       N'Enfermería'),
    ('44444444-4444-4444-4444-444444440005', N'caja',             N'Caja y Cobros'),
    ('44444444-4444-4444-4444-444444440006', N'farmacia',         N'Farmacia'),
    ('44444444-4444-4444-4444-444444440007', N'laboratorio',      N'Laboratorio'),
    ('44444444-4444-4444-4444-444444440008', N'directivo',        N'Directivo'),
    ('44444444-4444-4444-4444-444444440009', N'trabajo_social',   N'Trabajo social');

UPDATE r
SET r.Code = s.Code, r.Name = s.Name
FROM dbo.Role r
INNER JOIN @Roles s ON s.RoleId = r.RoleId;

INSERT INTO dbo.Role (RoleId, TenantId, Code, Name)
SELECT s.RoleId, @TenantId, s.Code, s.Name
FROM @Roles s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Role r WHERE r.RoleId = s.RoleId);

-- ──────────────────────────────── Usuarios ────────────────────────────────
-- UserName = correo, porque la pantalla de acceso del prototipo pide correo.
DECLARE @Users TABLE (
    UserId      UNIQUEIDENTIFIER,
    UserName    NVARCHAR(128),
    DisplayName NVARCHAR(200),
    RoleCode    NVARCHAR(64),
    BranchCodes NVARCHAR(200)
);
INSERT INTO @Users (UserId, UserName, DisplayName, RoleCode, BranchCodes) VALUES
    ('33333333-3333-3333-3333-333333330001', N'alejandro.garcia@medicore.mx', N'Alejandro García Mendoza',      N'medico',      N'CENTRAL,NORTE'),
    ('33333333-3333-3333-3333-333333330002', N'patricia.mendoza@medicore.mx', N'Patricia Mendoza Ríos',         N'medico',      N'CENTRAL,NORTE'),
    ('33333333-3333-3333-3333-333333330003', N'laura.torres@medicore.mx',     N'Laura Elena Torres Pérez',      N'admin',       N'CENTRAL,NORTE,SUR'),
    ('33333333-3333-3333-3333-333333330004', N'jose.ramirez@medicore.mx',     N'José Luis Ramírez Díaz',        N'recepcion',   N'CENTRAL'),
    ('33333333-3333-3333-3333-333333330005', N'carmen.vargas@medicore.mx',    N'Carmen Alicia Vargas Luna',     N'enfermeria',  N'CENTRAL'),
    ('33333333-3333-3333-3333-333333330006', N'monica.soto@medicore.mx',      N'Mónica Fernanda Soto Rivera',   N'caja',        N'CENTRAL,NORTE'),
    ('33333333-3333-3333-3333-333333330007', N'luis.hernandez@medicore.mx',   N'Luis Alberto Hernández Cruz',   N'farmacia',    N'CENTRAL'),
    ('33333333-3333-3333-3333-333333330008', N'diana.lopez@medicore.mx',      N'Diana Michelle López Castañeda',N'laboratorio', N'CENTRAL,NORTE'),
    ('33333333-3333-3333-3333-333333330009', N'omar.flores@medicore.mx',      N'Omar Alberto Flores Medina',    N'directivo',   N'CENTRAL,NORTE,SUR'),
    ('33333333-3333-3333-3333-333333330010', N'veronica.salinas@medicore.mx', N'Verónica Salinas Castro',       N'recepcion',   N'NORTE'),
    ('33333333-3333-3333-3333-333333330011', N'rocio.bautista@medicore.mx',   N'Rocío Bautista León',           N'enfermeria',  N'NORTE'),
    ('33333333-3333-3333-3333-333333330012', N'enrique.padilla@medicore.mx',  N'Enrique Padilla Mora',          N'recepcion',   N'SUR'),
    ('33333333-3333-3333-3333-333333330013', N'susana.reyes@medicore.mx',     N'Susana Reyes Campos',           N'enfermeria',  N'SUR'),
    ('33333333-3333-3333-3333-333333330014', N'alejandra.vega@medicore.mx',   N'Alejandra Vega Núñez',          N'caja',             N'SUR'),
    ('33333333-3333-3333-3333-333333330015', N'gabriela.moreno@medicore.mx',  N'Gabriela Moreno Sánchez',       N'trabajo_social',   N'CENTRAL');

UPDATE u
SET u.UserName = s.UserName,
    u.DisplayName = s.DisplayName,
    u.PasswordHash = @PasswordHash,
    u.IsActive = 1,
    u.IsDeleted = 0,
    u.FailedLoginCount = 0,
    u.LockoutUntilUtc = NULL
FROM dbo.[User] u
INNER JOIN @Users s ON s.UserId = u.UserId;

INSERT INTO dbo.[User] (UserId, TenantId, UserName, DisplayName, PasswordHash, IsActive, IsSuperAdmin)
SELECT s.UserId, @TenantId, s.UserName, s.DisplayName, @PasswordHash, 1, 0
FROM @Users s
WHERE NOT EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.UserId = s.UserId);

-- Rol por usuario
INSERT INTO dbo.UserRole (UserId, RoleId, TenantId)
SELECT s.UserId, r.RoleId, @TenantId
FROM @Users s
INNER JOIN @Roles r ON r.Code = s.RoleCode
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserRole ur WHERE ur.UserId = s.UserId AND ur.RoleId = r.RoleId
);

-- Sucursales por usuario
INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId)
SELECT s.UserId, b.BranchId, @TenantId
FROM @Users s
CROSS APPLY STRING_SPLIT(s.BranchCodes, ',') sp
INNER JOIN @Branches b ON b.Code = LTRIM(RTRIM(sp.value))
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserBranch ub WHERE ub.UserId = s.UserId AND ub.BranchId = b.BranchId
);

-- El administrador de 001 opera en las tres sucursales.
INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId)
SELECT '33333333-3333-3333-3333-333333333333', b.BranchId, @TenantId
FROM @Branches b
WHERE EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.UserId = '33333333-3333-3333-3333-333333333333')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.UserBranch ub
    WHERE ub.UserId = '33333333-3333-3333-3333-333333333333' AND ub.BranchId = b.BranchId
  );

PRINT 'seed-dev-catalogo OK — 3 sucursales, 8 roles, 14 usuarios sintéticos (password Admin123!)';
GO
