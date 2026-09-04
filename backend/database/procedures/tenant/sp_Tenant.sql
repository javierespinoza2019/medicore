-- SPs de perfil de tenant (M11 / WS-C). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
USE [$(DbName)];
GO

-- Resolución por código (aprovisionamiento / login) o por TenantId (perfil del JWT).
CREATE OR ALTER PROCEDURE dbo.sp_Tenant_GetByCode
    @Code     NVARCHAR(64) = NULL,
    @TenantId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @TenantId IS NULL AND (@Code IS NULL OR LTRIM(RTRIM(@Code)) = N'')
    BEGIN
        THROW 50010, N'Debe indicarse @Code o @TenantId.', 1;
    END

    SELECT
        TenantId,
        Code,
        Name,
        LegalName,
        Rfc,
        PrimaryColorToken,
        LogoRelativePath,
        IsActive
    FROM dbo.Tenant
    WHERE IsDeleted = 0
      AND (
            (@TenantId IS NOT NULL AND TenantId = @TenantId)
         OR (@TenantId IS NULL AND Code = @Code)
          );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tenant_UpdateProfile
    @TenantId           UNIQUEIDENTIFIER,
    @LegalName          NVARCHAR(200) = NULL,
    @Rfc                NVARCHAR(13) = NULL,
    @PrimaryColorToken  NVARCHAR(64) = NULL,
    @Name               NVARCHAR(200) = NULL,
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Tenant
        WHERE TenantId = @TenantId AND IsDeleted = 0
    )
        RETURN;

    UPDATE dbo.Tenant
    SET
        LegalName = @LegalName,
        Rfc = @Rfc,
        PrimaryColorToken = @PrimaryColorToken,
        Name = COALESCE(@Name, Name)
    WHERE TenantId = @TenantId
      AND IsDeleted = 0;

    -- @ActorUserId queda en la firma para auditoría (M2); no se inventa rastro aquí.
    SELECT
        TenantId,
        Code,
        Name,
        LegalName,
        Rfc,
        PrimaryColorToken,
        LogoRelativePath,
        IsActive
    FROM dbo.Tenant
    WHERE TenantId = @TenantId
      AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tenant_SetLogoPath
    @TenantId           UNIQUEIDENTIFIER,
    @LogoRelativePath   NVARCHAR(512) = NULL,
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Tenant
        WHERE TenantId = @TenantId AND IsDeleted = 0
    )
        RETURN;

    UPDATE dbo.Tenant
    SET LogoRelativePath = @LogoRelativePath
    WHERE TenantId = @TenantId
      AND IsDeleted = 0;

    SELECT
        TenantId,
        Code,
        Name,
        LegalName,
        Rfc,
        PrimaryColorToken,
        LogoRelativePath,
        IsActive
    FROM dbo.Tenant
    WHERE TenantId = @TenantId
      AND IsDeleted = 0;
END
GO
