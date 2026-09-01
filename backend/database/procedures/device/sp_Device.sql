USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Device_UpsertPending
    @TenantId UNIQUEIDENTIFIER,
    @RequestedByUserId UNIQUEIDENTIFIER,
    @DevicePublicId NVARCHAR(128),
    @DisplayName NVARCHAR(200),
    @Platform NVARCHAR(64) = NULL,
    @BranchId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DeviceId UNIQUEIDENTIFIER;

    SELECT @DeviceId = DeviceId
    FROM dbo.Device
    WHERE TenantId = @TenantId AND DevicePublicId = @DevicePublicId;

    IF @DeviceId IS NULL
    BEGIN
        SET @DeviceId = NEWID();
        INSERT INTO dbo.Device (
            DeviceId, TenantId, BranchId, DevicePublicId, DisplayName, Platform,
            IsApproved, AllowsOfflineQueue, RequestedByUserId
        )
        VALUES (
            @DeviceId, @TenantId, @BranchId, @DevicePublicId, @DisplayName, @Platform,
            0, 0, @RequestedByUserId
        );
    END
    ELSE
    BEGIN
        UPDATE dbo.Device
        SET DisplayName = @DisplayName,
            Platform = @Platform,
            BranchId = COALESCE(@BranchId, BranchId),
            RequestedByUserId = @RequestedByUserId
        WHERE DeviceId = @DeviceId AND TenantId = @TenantId;
    END

    SELECT DeviceId, DevicePublicId, DisplayName, IsApproved, AllowsOfflineQueue
    FROM dbo.Device
    WHERE DeviceId = @DeviceId AND TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Device_GetByPublicId
    @TenantId UNIQUEIDENTIFIER,
    @DevicePublicId NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DeviceId, DevicePublicId, DisplayName, IsApproved, AllowsOfflineQueue
    FROM dbo.Device
    WHERE TenantId = @TenantId AND DevicePublicId = @DevicePublicId;
END
GO

-- Admin approve (Fase 0 helper)
CREATE OR ALTER PROCEDURE dbo.sp_Device_Approve
    @TenantId UNIQUEIDENTIFIER,
    @DevicePublicId NVARCHAR(128),
    @AllowsOfflineQueue BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Device
    SET IsApproved = 1,
        AllowsOfflineQueue = @AllowsOfflineQueue
    WHERE TenantId = @TenantId AND DevicePublicId = @DevicePublicId;

    SELECT DeviceId, DevicePublicId, DisplayName, IsApproved, AllowsOfflineQueue
    FROM dbo.Device
    WHERE TenantId = @TenantId AND DevicePublicId = @DevicePublicId;
END
GO
