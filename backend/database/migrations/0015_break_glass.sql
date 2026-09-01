-- 0015 — Break-glass (doc 06 §23): concesiones temporales auditable

DECLARE @DbName SYSNAME = N'$(DbName)';
IF DB_ID(@DbName) IS NULL
BEGIN
    RAISERROR(N'La base %s no existe.', 16, 1, @DbName);
    RETURN;
END

DECLARE @sql NVARCHAR(MAX) = N'USE ' + QUOTENAME(@DbName) + N';';
EXEC sp_executesql @sql;

IF OBJECT_ID(N'dbo.BreakGlassGrant', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BreakGlassGrant (
        GrantId                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BreakGlassGrant PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        UserId                  UNIQUEIDENTIFIER NOT NULL,
        Justification           NVARCHAR(500) NOT NULL,
        GrantedPermissionsJson  NVARCHAR(MAX) NOT NULL,
        StartedAtUtc            DATETIME2(3) NOT NULL,
        ExpiresAtUtc            DATETIME2(3) NOT NULL,
        RevokedAtUtc            DATETIME2(3) NULL,
        CONSTRAINT FK_BreakGlassGrant_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_BreakGlassGrant_User FOREIGN KEY (UserId) REFERENCES dbo.[User](UserId)
    );

    CREATE INDEX IX_BreakGlassGrant_User_Active
        ON dbo.BreakGlassGrant (TenantId, UserId, ExpiresAtUtc)
        WHERE RevokedAtUtc IS NULL;
END
GO
