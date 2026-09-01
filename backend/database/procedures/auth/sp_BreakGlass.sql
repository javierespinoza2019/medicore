-- Break-glass (doc 06 §23): acceso de emergencia con justificación y alerta auditable.

CREATE OR ALTER PROCEDURE dbo.sp_BreakGlass_Start
    @GrantId                UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @UserId                 UNIQUEIDENTIFIER,
    @Justification          NVARCHAR(500),
    @GrantedPermissionsJson NVARCHAR(MAX),
    @DurationMinutes        INT = 60
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NowUtc DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @ExpiresAtUtc DATETIME2(3) = DATEADD(MINUTE, @DurationMinutes, @NowUtc);

    INSERT INTO dbo.BreakGlassGrant (
        GrantId, TenantId, UserId, Justification, GrantedPermissionsJson,
        StartedAtUtc, ExpiresAtUtc
    )
    VALUES (
        @GrantId, @TenantId, @UserId, @Justification, @GrantedPermissionsJson,
        @NowUtc, @ExpiresAtUtc
    );

    SELECT
        GrantId,
        TenantId,
        UserId,
        Justification,
        GrantedPermissionsJson,
        StartedAtUtc,
        ExpiresAtUtc,
        RevokedAtUtc
    FROM dbo.BreakGlassGrant
    WHERE GrantId = @GrantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_BreakGlass_ListActiveForUser
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        GrantId,
        TenantId,
        UserId,
        Justification,
        GrantedPermissionsJson,
        StartedAtUtc,
        ExpiresAtUtc,
        RevokedAtUtc
    FROM dbo.BreakGlassGrant
    WHERE TenantId = @TenantId
      AND UserId = @UserId
      AND RevokedAtUtc IS NULL
      AND ExpiresAtUtc > SYSUTCDATETIME()
    ORDER BY StartedAtUtc DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_ChangePassword
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @PasswordHash NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.[User]
    SET PasswordHash = @PasswordHash
    WHERE TenantId = @TenantId
      AND UserId = @UserId
      AND IsActive = 1
      AND IsDeleted = 0;

    SELECT Updated = @@ROWCOUNT;
END
GO
