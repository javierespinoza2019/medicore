-- Seed sintético demo (sin PHI real)
USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @BranchId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';
DECLARE @UserId   UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';
DECLARE @RoleId   UNIQUEIDENTIFIER = '44444444-4444-4444-4444-444444444444';
-- Password: Demo123!
DECLARE @PasswordHash NVARCHAR(200) = N'$2a$11$SXuEG72vHIZndEe7h3kuX.LavN1Lzvhzm0SKzVNBwXqWgTGoTY1vK';

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
    INSERT INTO dbo.Tenant (TenantId, Code, Name)
    VALUES (@TenantId, N'demo', N'Clínica Demo MediCore');
ELSE
    UPDATE dbo.Tenant SET Code = N'demo', Name = N'Clínica Demo MediCore', IsActive = 1, IsDeleted = 0
    WHERE TenantId = @TenantId;

IF NOT EXISTS (SELECT 1 FROM dbo.Branch WHERE BranchId = @BranchId)
    INSERT INTO dbo.Branch (BranchId, TenantId, Code, Name)
    VALUES (@BranchId, @TenantId, N'CENTRAL', N'Clínica Central - CDMX');
ELSE
    UPDATE dbo.Branch SET Code = N'CENTRAL', Name = N'Clínica Central - CDMX', IsActive = 1, IsDeleted = 0
    WHERE BranchId = @BranchId;

IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE RoleId = @RoleId)
    INSERT INTO dbo.Role (RoleId, TenantId, Code, Name)
    VALUES (@RoleId, @TenantId, N'SuperAdmin', N'Super Administrador');
ELSE
    UPDATE dbo.Role SET Code = N'SuperAdmin', Name = N'Super Administrador' WHERE RoleId = @RoleId;

IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserId = @UserId)
BEGIN
    INSERT INTO dbo.[User] (UserId, TenantId, UserName, DisplayName, PasswordHash, IsActive, IsSuperAdmin)
    VALUES (@UserId, @TenantId, N'admin', N'Administrador Demo', @PasswordHash, 1, 1);
END
ELSE
BEGIN
    UPDATE dbo.[User]
    SET PasswordHash = @PasswordHash,
        IsActive = 1,
        IsSuperAdmin = 1,
        IsDeleted = 0
    WHERE UserId = @UserId AND TenantId = @TenantId;
END

IF NOT EXISTS (SELECT 1 FROM dbo.UserRole WHERE UserId = @UserId AND RoleId = @RoleId)
    INSERT INTO dbo.UserRole (UserId, RoleId, TenantId) VALUES (@UserId, @RoleId, @TenantId);

IF NOT EXISTS (SELECT 1 FROM dbo.UserBranch WHERE UserId = @UserId AND BranchId = @BranchId)
    INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId) VALUES (@UserId, @BranchId, @TenantId);

-- Feature flags (DGIS/SINBA NO va aquí — es capacidad fija)
IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'CFDI' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'CFDI', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'FHIR' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'FHIR', 0);

IF NOT EXISTS (SELECT 1 FROM dbo.FeatureFlag WHERE FlagKey = N'RENAPO' AND Scope = N'Tenant' AND TenantId = @TenantId)
    INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
    VALUES (NEWID(), N'Tenant', @TenantId, NULL, N'RENAPO', 0);

PRINT 'seed-demo OK — tenant=demo user=admin password=Demo123!';
GO
