-- 009_provision_tenant_admin.sql — Aprovisionamiento manual de catálogo de roles
-- + primer usuario admin para un tenant ya creado con seeds/003_provision_tenant.sql.
-- Script de OPERACIÓN (no es endpoint), como 003. Idempotente: IF NOT EXISTS, sin DELETE.
-- No se ejecuta en el seed automático de apply-database.ps1 (igual que 003).
--
-- Requiere que el tenant y la sucursal ya existan (correr 003 primero).
--
-- Roles sembrados: catálogo cerrado de plantillas (doc 06 §19) — admin, medico, recepcion,
-- enfermeria, caja, farmacia, laboratorio, directivo, trabajo_social. SuperAdmin NO se crea
-- aquí: es rol de plataforma, no de tenant (doc 06 §19).
--
-- El usuario inicial recibe el rol 'admin' (no IsSuperAdmin) y queda ligado a la sucursal
-- indicada. Con ese usuario ya se pueden dar de alta los demás vía API (POST /api/users).
--
-- Variables sqlcmd (todas obligatorias):
--   DbName, TenantId, BranchId,
--   AdminUserId, AdminUserName, AdminDisplayName, AdminPasswordHash
--
-- El hash de contraseña se genera fuera de SQL (bcrypt no existe nativo en T-SQL):
--   dotnet run --project tools/hashpwd/HashPwd -- "<contraseña-elegida>"
--
-- Ejemplo (PowerShell):
--   sqlcmd -S $Server -d $Db -U $User -P $Pass -b -I -f 65001 `
--     -i backend/database/seeds/009_provision_tenant_admin.sql `
--     -v DbName=$Db `
--        TenantId="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" `
--        BranchId="ffffffff-1111-2222-3333-444444444444" `
--        AdminUserId="99999999-8888-7777-6666-555555555555" `
--        AdminUserName="admin@piloto.medicore.mx" `
--        AdminDisplayName="Administrador Piloto" `
--        AdminPasswordHash="$2a$11$....."

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @TenantId          UNIQUEIDENTIFIER = CAST('$(TenantId)' AS UNIQUEIDENTIFIER);
DECLARE @BranchId          UNIQUEIDENTIFIER = CAST('$(BranchId)' AS UNIQUEIDENTIFIER);
DECLARE @AdminUserId       UNIQUEIDENTIFIER = CAST('$(AdminUserId)' AS UNIQUEIDENTIFIER);
DECLARE @AdminUserName     NVARCHAR(128) = N'$(AdminUserName)';
DECLARE @AdminDisplayName  NVARCHAR(200) = N'$(AdminDisplayName)';
DECLARE @AdminPasswordHash NVARCHAR(200) = N'$(AdminPasswordHash)';

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId AND IsDeleted = 0)
    THROW 50401, N'El tenant no existe. Ejecute primero seeds/003_provision_tenant.sql.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.Branch WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0)
    THROW 50402, N'La sucursal no existe en el tenant indicado.', 1;

IF @AdminUserName IS NULL OR LTRIM(RTRIM(@AdminUserName)) = N''
    THROW 50403, N'AdminUserName es obligatorio.', 1;
IF @AdminPasswordHash IS NULL OR LTRIM(RTRIM(@AdminPasswordHash)) = N''
    THROW 50404, N'AdminPasswordHash es obligatorio (generar con tools/hashpwd).', 1;

-- ───────────────────────────────── Roles ──────────────────────────────────
-- Catálogo cerrado de plantillas, igual que seeds/002 pero para este tenant.
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

-- ──────────────────────────── Usuario administrador ───────────────────────
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
SELECT @AdminUserId, @BranchId, @TenantId
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.UserBranch ub WHERE ub.UserId = @AdminUserId AND ub.BranchId = @BranchId
);

-- Flags opcionales apagados por omisión (DGIS/SINBA NO va aquí: es capacidad fija, no flag)
IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'CFDI' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'CFDI', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'FHIR' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'FHIR', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'RENAPO' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'RENAPO', 0);

PRINT N'009_provision_tenant_admin OK — tenant=' + CAST(@TenantId AS NVARCHAR(36))
    + N' admin=' + @AdminUserName;
GO
