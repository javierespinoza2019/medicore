-- Seed sintético: segundo tenant `bravo` para pruebas multi-tenant (MEDICORE_TENANT_B).
-- Sin PHI real. Idempotente: IF NOT EXISTS / UPDATE; sin DELETE.
-- Misma contraseña sintética que demo: Demo123!
-- Prohibido en Production (apply-database.ps1 no ejecuta seeds ahí).

USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DECLARE @BranchId UNIQUEIDENTIFIER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001';
DECLARE @UserId   UNIQUEIDENTIFIER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002';
DECLARE @RoleId   UNIQUEIDENTIFIER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0003';
-- Password: Demo123! (mismo hash bcrypt del seed 001)
DECLARE @PasswordHash NVARCHAR(200) = N'$2a$11$SXuEG72vHIZndEe7h3kuX.LavN1Lzvhzm0SKzVNBwXqWgTGoTY1vK';

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
    INSERT INTO dbo.Tenant (TenantId, Code, Name)
    VALUES (@TenantId, N'bravo', N'Clínica Bravo (sintético)');
ELSE
    UPDATE dbo.Tenant
    SET Code = N'bravo', Name = N'Clínica Bravo (sintético)', IsActive = 1, IsDeleted = 0
    WHERE TenantId = @TenantId;

IF NOT EXISTS (SELECT 1 FROM dbo.Branch WHERE BranchId = @BranchId)
    INSERT INTO dbo.Branch (BranchId, TenantId, Code, Name)
    VALUES (@BranchId, @TenantId, N'CENTRAL', N'Bravo Central - sintético');
ELSE
    UPDATE dbo.Branch
    SET Code = N'CENTRAL', Name = N'Bravo Central - sintético', IsActive = 1, IsDeleted = 0
    WHERE BranchId = @BranchId AND TenantId = @TenantId;

IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE RoleId = @RoleId)
    INSERT INTO dbo.Role (RoleId, TenantId, Code, Name)
    VALUES (@RoleId, @TenantId, N'SuperAdmin', N'Super Administrador');
ELSE
    UPDATE dbo.Role SET Code = N'SuperAdmin', Name = N'Super Administrador' WHERE RoleId = @RoleId;

IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserId = @UserId)
BEGIN
    INSERT INTO dbo.[User] (UserId, TenantId, UserName, DisplayName, PasswordHash, IsActive, IsSuperAdmin)
    VALUES (@UserId, @TenantId, N'admin', N'Administrador Bravo', @PasswordHash, 1, 1);
END
ELSE
BEGIN
    UPDATE dbo.[User]
    SET PasswordHash = @PasswordHash,
        IsActive = 1,
        IsSuperAdmin = 1,
        IsDeleted = 0,
        UserName = N'admin',
        DisplayName = N'Administrador Bravo'
    WHERE UserId = @UserId AND TenantId = @TenantId;
END

IF NOT EXISTS (SELECT 1 FROM dbo.UserRole WHERE UserId = @UserId AND RoleId = @RoleId)
    INSERT INTO dbo.UserRole (UserId, RoleId, TenantId) VALUES (@UserId, @RoleId, @TenantId);

IF NOT EXISTS (SELECT 1 FROM dbo.UserBranch WHERE UserId = @UserId AND BranchId = @BranchId)
    INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId) VALUES (@UserId, @BranchId, @TenantId);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'CFDI' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'CFDI', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'FHIR' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'FHIR', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'RENAPO' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'RENAPO', 0);

PRINT 'seed-bravo OK — tenant=bravo user=admin password=Demo123! (MEDICORE_TENANT_B=bravo)';
GO
