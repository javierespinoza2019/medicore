-- 003_dev_profesional_sanitario.sql
-- Profesionales sanitarios SINTÉTICOS equivalentes a los del prototipo
-- (docs/frontend/src/mocks/doctors.ts y users.ts), para poder probar de verdad el
-- filtro «un médico ve sólo a sus pacientes».
--
-- Datos FICTICIOS del prototipo. Las cédulas CED-09876543 y CED-08765432 y las
-- especialidades Medicina General y Pediatría se copian tal cual del prototipo; no se
-- inventa ninguna cédula ni especialidad nueva. Ninguna de estas cédulas corresponde a
-- una persona real ni se ha validado contra ningún registro oficial.
--
-- Prohibido en Production (apply-database.ps1 no lo ejecuta ahí).
-- Idempotente: inserta lo que falta y actualiza lo existente. No borra nada.
--
-- Sólo se ligan los DOS usuarios con rol médico del seed 002. Los demás usuarios
-- sintéticos quedan **sin** profesional a propósito: son el caso de prueba
-- «usuario sin profesional», donde el filtro clínico debe fallar cerrado.

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
BEGIN
    RAISERROR(N'Falta el tenant demo. Ejecute primero seeds/001_demo_tenant.sql.', 16, 1);
    RETURN;
END

-- ───────────────────── Especialidades (catálogo por tenant) ─────────────────────
-- Sólo las dos que el prototipo ya usa para estos dos médicos. El catálogo no se
-- rellena con el resto de especialidades: eso lo captura el cliente.
DECLARE @Specialties TABLE (SpecialtyId UNIQUEIDENTIFIER, Code NVARCHAR(64), Name NVARCHAR(200));
INSERT INTO @Specialties (SpecialtyId, Code, Name) VALUES
    ('55555555-5555-5555-5555-555555550001', N'MEDICINA_GENERAL', N'Medicina General'),
    ('55555555-5555-5555-5555-555555550002', N'PEDIATRIA',        N'Pediatría');

UPDATE s
SET s.Code = f.Code, s.Name = f.Name, s.IsActive = 1, s.IsDeleted = 0, s.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.Specialty s
INNER JOIN @Specialties f ON f.SpecialtyId = s.SpecialtyId;

INSERT INTO dbo.Specialty (SpecialtyId, TenantId, Code, Name)
SELECT f.SpecialtyId, @TenantId, f.Code, f.Name
FROM @Specialties f
WHERE NOT EXISTS (SELECT 1 FROM dbo.Specialty s WHERE s.SpecialtyId = f.SpecialtyId);

-- ─────────────────────────── Profesionales sanitarios ───────────────────────────
-- UserId corresponde a los dos usuarios con rol `medico` del seed 002.
-- ProtoDoctorId es el `doctorId` del prototipo (d1, d2); se anota como comentario de
-- trazabilidad, no se guarda: el identificador de MediCore es HealthcareProfessionalId.
DECLARE @Professionals TABLE (
    HealthcareProfessionalId UNIQUEIDENTIFIER,
    UserId                   UNIQUEIDENTIFIER,
    FullName                 NVARCHAR(200),
    ProfessionalLicense      NVARCHAR(64),
    SpecialtyId              UNIQUEIDENTIFIER
);
INSERT INTO @Professionals (HealthcareProfessionalId, UserId, FullName, ProfessionalLicense, SpecialtyId) VALUES
    -- prototipo doctorId = d1
    ('66666666-6666-6666-6666-666666660001', '33333333-3333-3333-3333-333333330001',
     N'Dr. Alejandro García Mendoza', N'CED-09876543', '55555555-5555-5555-5555-555555550001'),
    -- prototipo doctorId = d2
    ('66666666-6666-6666-6666-666666660002', '33333333-3333-3333-3333-333333330002',
     N'Dra. Patricia Mendoza Ríos', N'CED-08765432', '55555555-5555-5555-5555-555555550002');

UPDATE hp
SET hp.UserId = f.UserId,
    hp.FullName = f.FullName,
    hp.ProfessionalLicense = f.ProfessionalLicense,
    hp.SpecialtyId = f.SpecialtyId,
    hp.IsActive = 1,
    hp.IsDeleted = 0,
    hp.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.HealthcareProfessional hp
INNER JOIN @Professionals f ON f.HealthcareProfessionalId = hp.HealthcareProfessionalId;

INSERT INTO dbo.HealthcareProfessional
    (HealthcareProfessionalId, TenantId, UserId, FullName, ProfessionalLicense, SpecialtyId)
SELECT f.HealthcareProfessionalId, @TenantId, f.UserId, f.FullName, f.ProfessionalLicense, f.SpecialtyId
FROM @Professionals f
WHERE EXISTS (SELECT 1 FROM dbo.[User] u WHERE u.UserId = f.UserId AND u.TenantId = @TenantId)
  AND NOT EXISTS (
    SELECT 1 FROM dbo.HealthcareProfessional hp
    WHERE hp.HealthcareProfessionalId = f.HealthcareProfessionalId
  );

PRINT 'seed-dev-profesional-sanitario OK — 2 especialidades y 2 profesionales sintéticos ligados a los usuarios con rol medico';
GO
