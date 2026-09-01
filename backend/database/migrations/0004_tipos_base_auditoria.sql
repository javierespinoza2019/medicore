-- 0004_tipos_base_auditoria.sql — MediCore M2 / WS-B (idempotente)
-- Tabla append-only dbo.AuditEvent. Requiere sqlcmd DbName.
-- Sin DELETE, DROP, TRUNCATE ni UPDATE de hechos: sólo INSERT vía SP.
--
-- Fundamento de lectura de expediente (no se afirma cumplimiento de producto):
-- NOM-004-SSA3-2012 numerales 5.5.1 y 5.7 — docs/analisis/01-marco-normativo-verificado.md
-- (§2 y ampliación; verificado en ese documento con fecha 2026-08-22).
-- Toda lectura de expediente debe registrar evento record.read (cuando exista M7).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

IF OBJECT_ID(N'dbo.AuditEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditEvent (
        AuditEventId            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AuditEvent PRIMARY KEY,
        TenantId                UNIQUEIDENTIFIER NOT NULL,
        ActorUserId             UNIQUEIDENTIFIER NOT NULL,
        ActorProfessionalId     UNIQUEIDENTIFIER NULL,
        BranchId                UNIQUEIDENTIFIER NULL,
        EventType               NVARCHAR(64) NOT NULL,
        EntityName              NVARCHAR(128) NOT NULL,
        EntityId                UNIQUEIDENTIFIER NOT NULL,
        SubjectId               UNIQUEIDENTIFIER NULL,
        DetailJson              NVARCHAR(MAX) NULL,
        OccurredAtUtc           DATETIME2(3) NOT NULL,
        RecordedAtUtc           DATETIME2(3) NOT NULL CONSTRAINT DF_AuditEvent_RecordedAtUtc DEFAULT (SYSUTCDATETIME()),
        DeviceId                UNIQUEIDENTIFIER NULL,
        IpAddress               NVARCHAR(64) NULL,
        CONSTRAINT FK_AuditEvent_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId)
    );

    CREATE INDEX IX_AuditEvent_Tenant_Subject_Recorded
        ON dbo.AuditEvent (TenantId, SubjectId, RecordedAtUtc)
        WHERE SubjectId IS NOT NULL;

    CREATE INDEX IX_AuditEvent_Tenant_Actor_Recorded
        ON dbo.AuditEvent (TenantId, ActorUserId, RecordedAtUtc);
END
GO

PRINT '0004_tipos_base_auditoria OK';
GO
