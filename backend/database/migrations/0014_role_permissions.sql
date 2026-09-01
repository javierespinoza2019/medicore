-- 0014 — Matriz de permisos por tenant (doc 06 §19 opción B)
-- Sin DELETE: configuración por UPSERT en SP.

DECLARE @DbName SYSNAME = N'$(DbName)';
IF DB_ID(@DbName) IS NULL
BEGIN
    RAISERROR(N'La base %s no existe. Ejecute 0001_foundation primero.', 16, 1, @DbName);
    RETURN;
END

DECLARE @sql NVARCHAR(MAX) = N'USE ' + QUOTENAME(@DbName) + N';';
EXEC sp_executesql @sql;

IF OBJECT_ID(N'dbo.TenantRolePermissionConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TenantRolePermissionConfig (
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        RoleCode                NVARCHAR(64) NOT NULL,
        GrantedPermissionsJson  NVARCHAR(MAX) NOT NULL,
        UpdatedAtUtc            DATETIME2(3) NOT NULL CONSTRAINT DF_TenantRolePermissionConfig_UpdatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedByUserId         UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_TenantRolePermissionConfig PRIMARY KEY (TenantId, RoleCode),
        CONSTRAINT FK_TenantRolePermissionConfig_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId)
    );
END
GO
