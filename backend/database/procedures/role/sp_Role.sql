-- sp_Role — plantillas y matriz de permisos por tenant (doc 06 §19)

CREATE OR ALTER PROCEDURE dbo.sp_Role_ListTemplates
    @TenantId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.RoleId,
        r.Code AS RoleCode,
        r.Name,
        UserCount = (
            SELECT COUNT(DISTINCT ur.UserId)
            FROM dbo.UserRole ur
            INNER JOIN dbo.[User] u ON u.UserId = ur.UserId AND u.TenantId = ur.TenantId
            WHERE ur.RoleId = r.RoleId
              AND ur.TenantId = @TenantId
              AND u.IsActive = 1
        )
    FROM dbo.Role r
    WHERE r.TenantId = @TenantId
      AND r.Code <> N'SuperAdmin'
    ORDER BY r.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_GetPermissionConfig
    @TenantId UNIQUEIDENTIFIER,
    @RoleCode NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TenantId,
        RoleCode,
        GrantedPermissionsJson,
        UpdatedAtUtc,
        UpdatedByUserId
    FROM dbo.TenantRolePermissionConfig
    WHERE TenantId = @TenantId
      AND RoleCode = @RoleCode;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Role_UpsertPermissionConfig
    @TenantId UNIQUEIDENTIFIER,
    @RoleCode NVARCHAR(64),
    @GrantedPermissionsJson NVARCHAR(MAX),
    @ActorUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Role
        WHERE TenantId = @TenantId AND Code = @RoleCode AND Code <> N'SuperAdmin'
    )
    BEGIN
        RAISERROR(N'Plantilla de rol no válida para el tenant.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.TenantRolePermissionConfig
        WHERE TenantId = @TenantId AND RoleCode = @RoleCode
    )
    BEGIN
        UPDATE dbo.TenantRolePermissionConfig
        SET GrantedPermissionsJson = @GrantedPermissionsJson,
            UpdatedAtUtc = SYSUTCDATETIME(),
            UpdatedByUserId = @ActorUserId
        WHERE TenantId = @TenantId AND RoleCode = @RoleCode;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.TenantRolePermissionConfig (
            TenantId, RoleCode, GrantedPermissionsJson, UpdatedAtUtc, UpdatedByUserId
        )
        VALUES (
            @TenantId, @RoleCode, @GrantedPermissionsJson, SYSUTCDATETIME(), @ActorUserId
        );
    END

    SELECT
        TenantId,
        RoleCode,
        GrantedPermissionsJson,
        UpdatedAtUtc,
        UpdatedByUserId
    FROM dbo.TenantRolePermissionConfig
    WHERE TenantId = @TenantId AND RoleCode = @RoleCode;
END
GO
