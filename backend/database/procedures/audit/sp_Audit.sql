USE [$(DbName)];
GO

-- Append-only: sólo INSERT. Sin UPDATE ni DELETE (BM-SEG-01, BM-SEG-02).
-- Invocar dentro de la misma transacción del hecho auditado (como el outbox).
CREATE OR ALTER PROCEDURE dbo.sp_Audit_Append
    @AuditEventId           UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @BranchId               UNIQUEIDENTIFIER = NULL,
    @EventType              NVARCHAR(64),
    @EntityName             NVARCHAR(128),
    @EntityId               UNIQUEIDENTIFIER,
    @SubjectId              UNIQUEIDENTIFIER = NULL,
    @DetailJson             NVARCHAR(MAX) = NULL,
    @OccurredAtUtc          DATETIME2(3),
    @DeviceId               UNIQUEIDENTIFIER = NULL,
    @IpAddress              NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.AuditEvent (
        AuditEventId, TenantId, ActorUserId, ActorProfessionalId, BranchId,
        EventType, EntityName, EntityId, SubjectId, DetailJson,
        OccurredAtUtc, DeviceId, IpAddress
    )
    VALUES (
        @AuditEventId, @TenantId, @ActorUserId, @ActorProfessionalId, @BranchId,
        @EventType, @EntityName, @EntityId, @SubjectId, @DetailJson,
        @OccurredAtUtc, @DeviceId, @IpAddress
    );

    SELECT 1 AS Appended;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_ListBySubject
    @TenantId   UNIQUEIDENTIFIER,
    @SubjectId  UNIQUEIDENTIFIER,
    @FromUtc    DATETIME2(3) = NULL,
    @ToUtc      DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.AuditEventId, a.TenantId, a.ActorUserId, a.ActorProfessionalId, a.BranchId,
        a.EventType, a.EntityName, a.EntityId, a.SubjectId, a.DetailJson,
        a.OccurredAtUtc, a.RecordedAtUtc, a.DeviceId, a.IpAddress,
        ActorDisplayName = u.DisplayName,
        ActorUserName = u.UserName
    FROM dbo.AuditEvent a
    LEFT JOIN dbo.[User] u
        ON u.UserId = a.ActorUserId AND u.TenantId = a.TenantId AND u.IsDeleted = 0
    WHERE a.TenantId = @TenantId
      AND a.SubjectId = @SubjectId
      AND (@FromUtc IS NULL OR a.RecordedAtUtc >= @FromUtc)
      AND (@ToUtc IS NULL OR a.RecordedAtUtc <= @ToUtc)
    ORDER BY a.RecordedAtUtc DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Audit_ListByActor
    @TenantId       UNIQUEIDENTIFIER,
    @ActorUserId    UNIQUEIDENTIFIER,
    @FromUtc        DATETIME2(3),
    @ToUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.AuditEventId, a.TenantId, a.ActorUserId, a.ActorProfessionalId, a.BranchId,
        a.EventType, a.EntityName, a.EntityId, a.SubjectId, a.DetailJson,
        a.OccurredAtUtc, a.RecordedAtUtc, a.DeviceId, a.IpAddress,
        ActorDisplayName = u.DisplayName,
        ActorUserName = u.UserName
    FROM dbo.AuditEvent a
    LEFT JOIN dbo.[User] u
        ON u.UserId = a.ActorUserId AND u.TenantId = a.TenantId AND u.IsDeleted = 0
    WHERE a.TenantId = @TenantId
      AND a.ActorUserId = @ActorUserId
      AND a.RecordedAtUtc >= @FromUtc
      AND a.RecordedAtUtc <= @ToUtc
    ORDER BY a.RecordedAtUtc DESC;
END
GO
