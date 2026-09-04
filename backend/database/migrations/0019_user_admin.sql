-- Admin de usuarios de tenant: baja lógica en UserRole / UserBranch (sin DELETE físico).
USE [$(DbName)];
GO

IF COL_LENGTH(N'dbo.UserRole', N'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.UserRole ADD IsDeleted BIT NOT NULL
        CONSTRAINT DF_UserRole_IsDeleted DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.UserRole', N'UpdatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.UserRole ADD UpdatedAtUtc DATETIME2(3) NOT NULL
        CONSTRAINT DF_UserRole_Updated DEFAULT (SYSUTCDATETIME());
END
GO

IF COL_LENGTH(N'dbo.UserBranch', N'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.UserBranch ADD IsDeleted BIT NOT NULL
        CONSTRAINT DF_UserBranch_IsDeleted DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.UserBranch', N'UpdatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.UserBranch ADD UpdatedAtUtc DATETIME2(3) NOT NULL
        CONSTRAINT DF_UserBranch_Updated DEFAULT (SYSUTCDATETIME());
END
GO

IF COL_LENGTH(N'dbo.[User]', N'UpdatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.[User] ADD UpdatedAtUtc DATETIME2(3) NOT NULL
        CONSTRAINT DF_User_Updated DEFAULT (SYSUTCDATETIME());
END
GO

PRINT '0019_user_admin OK — IsDeleted en UserRole/UserBranch + UpdatedAtUtc.';
GO
