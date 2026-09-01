-- 0001_foundation.sql — MediCore Fase 0 (idempotente)
-- Una sola BD multi-tenant por ambiente. Timestamps UTC.
-- Requiere la variable sqlcmd DbName (ej. MediCore_Dev / MediCore_QA / MediCore).
-- Ejecutar con tools/apply-database.ps1, que la define; sqlcmd directo: -v DbName=MediCore_Dev

-- Requerido por los índices filtrados (sqlcmd los apaga por omisión; usar además -I).
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID(N'$(DbName)') IS NULL
BEGIN
    CREATE DATABASE [$(DbName)];
    -- BD recién creada: no hay sesiones que interrumpir.
    ALTER DATABASE [$(DbName)] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
END
GO

-- En una BD ya existente no se desconecta a nadie: RCSI queda como paso de ventana de mantenimiento.
-- En hosting compartido el login puede no ver sys.databases ni tener permiso de ALTER DATABASE.
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'$(DbName)' AND is_read_committed_snapshot_on = 1)
BEGIN
    RAISERROR(N'AVISO: READ_COMMITTED_SNAPSHOT apagado en $(DbName). Actívelo en ventana de mantenimiento (ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE); desconecta sesiones activas.', 10, 1) WITH NOWAIT;
END
GO

USE [$(DbName)];
GO

IF OBJECT_ID(N'dbo.Tenant', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tenant (
        TenantId        UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Tenant PRIMARY KEY,
        Code            NVARCHAR(64) NOT NULL,
        Name            NVARCHAR(200) NOT NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_Tenant_IsActive DEFAULT (1),
        IsDeleted       BIT NOT NULL CONSTRAINT DF_Tenant_IsDeleted DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_Tenant_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_Tenant_Code UNIQUE (Code)
    );
END
GO

IF OBJECT_ID(N'dbo.Branch', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Branch (
        BranchId        UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Branch PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        Code            NVARCHAR(64) NOT NULL,
        Name            NVARCHAR(200) NOT NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_Branch_IsActive DEFAULT (1),
        IsDeleted       BIT NOT NULL CONSTRAINT DF_Branch_IsDeleted DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_Branch_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Branch_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT UQ_Branch_Tenant_Code UNIQUE (TenantId, Code)
    );
    CREATE INDEX IX_Branch_TenantId ON dbo.Branch(TenantId);
END
GO

IF OBJECT_ID(N'dbo.[User]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[User] (
        UserId              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_User PRIMARY KEY,
        TenantId            UNIQUEIDENTIFIER NOT NULL,
        UserName            NVARCHAR(128) NOT NULL,
        DisplayName         NVARCHAR(200) NOT NULL,
        PasswordHash        NVARCHAR(200) NOT NULL,
        IsActive            BIT NOT NULL CONSTRAINT DF_User_IsActive DEFAULT (1),
        IsSuperAdmin        BIT NOT NULL CONSTRAINT DF_User_IsSuperAdmin DEFAULT (0),
        IsDeleted           BIT NOT NULL CONSTRAINT DF_User_IsDeleted DEFAULT (0),
        FailedLoginCount    INT NOT NULL CONSTRAINT DF_User_FailedLoginCount DEFAULT (0),
        LockoutUntilUtc     DATETIME2(3) NULL,
        CreatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_User_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_User_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT UQ_User_Tenant_UserName UNIQUE (TenantId, UserName)
    );
    CREATE INDEX IX_User_TenantId ON dbo.[User](TenantId);
END
GO

IF OBJECT_ID(N'dbo.Role', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Role (
        RoleId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Role PRIMARY KEY,
        TenantId    UNIQUEIDENTIFIER NOT NULL,
        Code        NVARCHAR(64) NOT NULL,
        Name        NVARCHAR(128) NOT NULL,
        CONSTRAINT FK_Role_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT UQ_Role_Tenant_Code UNIQUE (TenantId, Code)
    );
END
GO

IF OBJECT_ID(N'dbo.UserRole', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserRole (
        UserId      UNIQUEIDENTIFIER NOT NULL,
        RoleId      UNIQUEIDENTIFIER NOT NULL,
        TenantId    UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT PK_UserRole PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRole_User FOREIGN KEY (UserId) REFERENCES dbo.[User](UserId),
        CONSTRAINT FK_UserRole_Role FOREIGN KEY (RoleId) REFERENCES dbo.Role(RoleId)
    );
END
GO

IF OBJECT_ID(N'dbo.UserBranch', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserBranch (
        UserId      UNIQUEIDENTIFIER NOT NULL,
        BranchId    UNIQUEIDENTIFIER NOT NULL,
        TenantId    UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT PK_UserBranch PRIMARY KEY (UserId, BranchId),
        CONSTRAINT FK_UserBranch_User FOREIGN KEY (UserId) REFERENCES dbo.[User](UserId),
        CONSTRAINT FK_UserBranch_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId)
    );
END
GO

IF OBJECT_ID(N'dbo.RefreshToken', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshToken (
        RefreshTokenId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RefreshToken PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        UserId          UNIQUEIDENTIFIER NOT NULL,
        TokenHash       NVARCHAR(128) NOT NULL,
        ExpiresAtUtc    DATETIME2(3) NOT NULL,
        RevokedAtUtc    DATETIME2(3) NULL,
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_RefreshToken_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_RefreshToken_TokenHash UNIQUE (TokenHash)
    );
    CREATE INDEX IX_RefreshToken_User ON dbo.RefreshToken(TenantId, UserId);
END
GO

IF OBJECT_ID(N'dbo.Device', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Device (
        DeviceId            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Device PRIMARY KEY,
        TenantId            UNIQUEIDENTIFIER NOT NULL,
        BranchId            UNIQUEIDENTIFIER NULL,
        DevicePublicId      NVARCHAR(128) NOT NULL,
        DisplayName         NVARCHAR(200) NOT NULL,
        Platform            NVARCHAR(64) NULL,
        IsApproved          BIT NOT NULL CONSTRAINT DF_Device_IsApproved DEFAULT (0),
        AllowsOfflineQueue  BIT NOT NULL CONSTRAINT DF_Device_AllowsOfflineQueue DEFAULT (0),
        RequestedByUserId   UNIQUEIDENTIFIER NULL,
        CreatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_Device_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Device_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT UQ_Device_Tenant_PublicId UNIQUE (TenantId, DevicePublicId)
    );
END
GO

IF OBJECT_ID(N'dbo.IdempotencyRecord', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.IdempotencyRecord (
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        IdempotencyKey  NVARCHAR(128) NOT NULL,
        CommandType     NVARCHAR(128) NOT NULL,
        ResponseJson    NVARCHAR(MAX) NULL,
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_Idempotency_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_IdempotencyRecord PRIMARY KEY (TenantId, IdempotencyKey)
    );
END
GO

IF OBJECT_ID(N'dbo.OutboxMessage', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OutboxMessage (
        OutboxId        UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OutboxMessage PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        Channel         NVARCHAR(64) NOT NULL, -- dgis | cfdi | fhir | renapo | notify
        PayloadJson     NVARCHAR(MAX) NOT NULL,
        Status          NVARCHAR(32) NOT NULL CONSTRAINT DF_Outbox_Status DEFAULT (N'pending'),
        AttemptCount    INT NOT NULL CONSTRAINT DF_Outbox_AttemptCount DEFAULT (0),
        LastError       NVARCHAR(1000) NULL,
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_Outbox_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        ProcessedAtUtc  DATETIME2(3) NULL,
        LockedUntilUtc  DATETIME2(3) NULL
    );
    CREATE INDEX IX_Outbox_Pending ON dbo.OutboxMessage(Status, CreatedAtUtc) WHERE Status IN (N'pending', N'failed');
END
GO

IF OBJECT_ID(N'dbo.FeatureFlag', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FeatureFlag (
        FeatureFlagId   UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_FeatureFlag PRIMARY KEY,
        Scope           NVARCHAR(16) NOT NULL, -- Global | Tenant | Branch
        TenantId        UNIQUEIDENTIFIER NULL,
        BranchId        UNIQUEIDENTIFIER NULL,
        FlagKey         NVARCHAR(64) NOT NULL, -- CFDI | FHIR | RENAPO (DGIS no es flag)
        IsEnabled       BIT NOT NULL,
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_FeatureFlag_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
    );
END
GO

PRINT '0001_foundation OK';
GO
