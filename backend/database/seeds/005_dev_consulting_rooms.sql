-- 005_dev_consulting_rooms.sql
-- Consultorios SINTÉTICOS de Dev para agenda (M9). Sucursal CENTRAL del seed 001.
-- Idempotente. Prohibido en Production.

USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @BranchId UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';

IF NOT EXISTS (SELECT 1 FROM dbo.Branch WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0)
BEGIN
    RAISERROR(N'Falta sucursal CENTRAL. Ejecute seeds/001_demo_tenant.sql.', 16, 1);
    RETURN;
END

IF OBJECT_ID(N'dbo.ConsultingRoom', N'U') IS NULL
BEGIN
    RAISERROR(N'Falta dbo.ConsultingRoom. Aplique migración 0012_agenda.sql.', 16, 1);
    RETURN;
END

DECLARE @Rooms TABLE (RoomId UNIQUEIDENTIFIER, Code NVARCHAR(64), Name NVARCHAR(200));
INSERT INTO @Rooms (RoomId, Code, Name) VALUES
    ('77777777-7777-7777-7777-777777770001', N'C-101', N'Consultorio 101'),
    ('77777777-7777-7777-7777-777777770002', N'C-102', N'Consultorio 102');

UPDATE r
SET r.Code = f.Code, r.Name = f.Name, r.IsActive = 1, r.IsDeleted = 0, r.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.ConsultingRoom r
INNER JOIN @Rooms f ON f.RoomId = r.RoomId;

INSERT INTO dbo.ConsultingRoom (RoomId, TenantId, BranchId, Code, Name, IsActive)
SELECT f.RoomId, @TenantId, @BranchId, f.Code, f.Name, 1
FROM @Rooms f
WHERE NOT EXISTS (SELECT 1 FROM dbo.ConsultingRoom r WHERE r.RoomId = f.RoomId);

PRINT 'seed-consulting-rooms OK — C-101 y C-102 en CENTRAL.';
GO
