/*
================================================================================
MediCore — REINICIO MANUAL desde cero + tenant Clínicas del Valle
================================================================================
USO (SSMS o Azure Data Studio):
  1. Cambia el nombre de la base en el USE de abajo.
  2. Ejecuta TODO el script de una vez.
  3. Login: tenantCode = clinicas_del_valle | usuario = admin | password = Demo123!

IMPORTANTE
  - EXCEPCIONAL: usa DELETE de filas de negocio (doc 06, 2026-09-08).
  - No hace DROP/TRUNCATE de tablas ni de la base.
  - Conserva esquema y Stored Procedures.
  - Hoy MediCore NO define columnas IDENTITY (PKs = UNIQUEIDENTIFIER).
    Aun así, al final se resea CUALQUIER identity que exista en dbo
    (por tablas futuras o artefactos del hosting).
  - No borrar contra Production con PHI.
  - Fotos en disco (FileStorage) no se tocan: limpialas aparte si aplica.
================================================================================
*/

USE [db_a0b4b3_medicore];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* -------------------------------------------------------------------------- */
/* 1) Wipe de filas de negocio (orden por dependencias)                        */
/* -------------------------------------------------------------------------- */
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.BreakGlassGrant', N'U') IS NOT NULL DELETE FROM dbo.BreakGlassGrant;
IF OBJECT_ID(N'dbo.ScheduleBlock', N'U') IS NOT NULL DELETE FROM dbo.ScheduleBlock;
IF OBJECT_ID(N'dbo.AppointmentEvent', N'U') IS NOT NULL DELETE FROM dbo.AppointmentEvent;
IF OBJECT_ID(N'dbo.Appointment', N'U') IS NOT NULL DELETE FROM dbo.Appointment;
IF OBJECT_ID(N'dbo.ConsultingRoomProfessional', N'U') IS NOT NULL DELETE FROM dbo.ConsultingRoomProfessional;
IF OBJECT_ID(N'dbo.ConsultingRoom', N'U') IS NOT NULL DELETE FROM dbo.ConsultingRoom;

IF OBJECT_ID(N'dbo.PrescriptionItem', N'U') IS NOT NULL DELETE FROM dbo.PrescriptionItem;
IF OBJECT_ID(N'dbo.Prescription', N'U') IS NOT NULL DELETE FROM dbo.Prescription;
IF OBJECT_ID(N'dbo.Medication', N'U') IS NOT NULL DELETE FROM dbo.Medication;

IF OBJECT_ID(N'dbo.ClinicalNoteCoAuthor', N'U') IS NOT NULL DELETE FROM dbo.ClinicalNoteCoAuthor;
IF OBJECT_ID(N'dbo.ClinicalNoteAddendum', N'U') IS NOT NULL DELETE FROM dbo.ClinicalNoteAddendum;
IF OBJECT_ID(N'dbo.ClinicalNote', N'U') IS NOT NULL DELETE FROM dbo.ClinicalNote;

IF OBJECT_ID(N'dbo.HistoryAmendment', N'U') IS NOT NULL DELETE FROM dbo.HistoryAmendment;
IF OBJECT_ID(N'dbo.Allergy', N'U') IS NOT NULL DELETE FROM dbo.Allergy;
IF OBJECT_ID(N'dbo.AllergyStatusEvent', N'U') IS NOT NULL DELETE FROM dbo.AllergyStatusEvent;
IF OBJECT_ID(N'dbo.MedicalHistory', N'U') IS NOT NULL DELETE FROM dbo.MedicalHistory;
IF OBJECT_ID(N'dbo.SubjectFlag', N'U') IS NOT NULL DELETE FROM dbo.SubjectFlag;
IF OBJECT_ID(N'dbo.ClinicalRecord', N'U') IS NOT NULL DELETE FROM dbo.ClinicalRecord;

IF OBJECT_ID(N'dbo.VitalSignMeasurement', N'U') IS NOT NULL DELETE FROM dbo.VitalSignMeasurement;
IF OBJECT_ID(N'dbo.VitalSignSet', N'U') IS NOT NULL DELETE FROM dbo.VitalSignSet;
IF OBJECT_ID(N'dbo.TriageEvent', N'U') IS NOT NULL DELETE FROM dbo.TriageEvent;
IF OBJECT_ID(N'dbo.TriageAssessment', N'U') IS NOT NULL DELETE FROM dbo.TriageAssessment;
IF OBJECT_ID(N'dbo.TriageScaleConfig', N'U') IS NOT NULL DELETE FROM dbo.TriageScaleConfig;

IF OBJECT_ID(N'dbo.MinisterioPublicoNotice', N'U') IS NOT NULL DELETE FROM dbo.MinisterioPublicoNotice;
IF OBJECT_ID(N'dbo.EncounterCareWithoutConsent', N'U') IS NOT NULL DELETE FROM dbo.EncounterCareWithoutConsent;
IF OBJECT_ID(N'dbo.EncounterStateEvent', N'U') IS NOT NULL DELETE FROM dbo.EncounterStateEvent;
IF OBJECT_ID(N'dbo.Encounter', N'U') IS NOT NULL DELETE FROM dbo.Encounter;

IF OBJECT_ID(N'dbo.SubjectConsentLapse', N'U') IS NOT NULL DELETE FROM dbo.SubjectConsentLapse;
IF OBJECT_ID(N'dbo.SubjectMergeQueue', N'U') IS NOT NULL DELETE FROM dbo.SubjectMergeQueue;
IF OBJECT_ID(N'dbo.SubjectLink', N'U') IS NOT NULL DELETE FROM dbo.SubjectLink;
IF OBJECT_ID(N'dbo.SubjectBelonging', N'U') IS NOT NULL DELETE FROM dbo.SubjectBelonging;
IF OBJECT_ID(N'dbo.SubjectDistinctiveMark', N'U') IS NOT NULL DELETE FROM dbo.SubjectDistinctiveMark;
IF OBJECT_ID(N'dbo.SubjectDescriptor', N'U') IS NOT NULL DELETE FROM dbo.SubjectDescriptor;
IF OBJECT_ID(N'dbo.SubjectTemporaryLabel', N'U') IS NOT NULL DELETE FROM dbo.SubjectTemporaryLabel;
IF OBJECT_ID(N'dbo.UnidentifiedLabelConfig', N'U') IS NOT NULL DELETE FROM dbo.UnidentifiedLabelConfig;
IF OBJECT_ID(N'dbo.SubjectIdentityEvent', N'U') IS NOT NULL DELETE FROM dbo.SubjectIdentityEvent;
IF OBJECT_ID(N'dbo.Subject', N'U') IS NOT NULL DELETE FROM dbo.Subject;

IF OBJECT_ID(N'dbo.TenantRolePermissionConfig', N'U') IS NOT NULL DELETE FROM dbo.TenantRolePermissionConfig;
IF OBJECT_ID(N'dbo.RefreshToken', N'U') IS NOT NULL DELETE FROM dbo.RefreshToken;
IF OBJECT_ID(N'dbo.Device', N'U') IS NOT NULL DELETE FROM dbo.Device;
IF OBJECT_ID(N'dbo.IdempotencyRecord', N'U') IS NOT NULL DELETE FROM dbo.IdempotencyRecord;
IF OBJECT_ID(N'dbo.OutboxMessage', N'U') IS NOT NULL DELETE FROM dbo.OutboxMessage;
IF OBJECT_ID(N'dbo.AuditEvent', N'U') IS NOT NULL DELETE FROM dbo.AuditEvent;

-- Profesionales referencian User (FK_HcProfessional_User): borrar ANTES de User.
IF COL_LENGTH(N'dbo.Branch', N'ResponsiblePhysicianProfessionalId') IS NOT NULL
    UPDATE dbo.Branch SET ResponsiblePhysicianProfessionalId = NULL WHERE ResponsiblePhysicianProfessionalId IS NOT NULL;
IF OBJECT_ID(N'dbo.HealthcareProfessional', N'U') IS NOT NULL DELETE FROM dbo.HealthcareProfessional;
IF OBJECT_ID(N'dbo.Specialty', N'U') IS NOT NULL DELETE FROM dbo.Specialty;

IF OBJECT_ID(N'dbo.UserRole', N'U') IS NOT NULL DELETE FROM dbo.UserRole;
IF OBJECT_ID(N'dbo.UserBranch', N'U') IS NOT NULL DELETE FROM dbo.UserBranch;
IF OBJECT_ID(N'dbo.[User]', N'U') IS NOT NULL DELETE FROM dbo.[User];
IF OBJECT_ID(N'dbo.Role', N'U') IS NOT NULL DELETE FROM dbo.Role;

IF OBJECT_ID(N'dbo.FeatureFlag', N'U') IS NOT NULL DELETE FROM dbo.FeatureFlag;
IF OBJECT_ID(N'dbo.Branch', N'U') IS NOT NULL DELETE FROM dbo.Branch;
IF OBJECT_ID(N'dbo.Tenant', N'U') IS NOT NULL DELETE FROM dbo.Tenant;

COMMIT TRANSACTION;
PRINT N'[1/3] Wipe OK — filas de negocio vacías.';
GO

/* -------------------------------------------------------------------------- */
/* 2) Reset de IDENTITY (todas las tablas de usuario que tengan identity)      */
/*    RESEED 0 → el próximo INSERT recibe 1 si la tabla quedó vacía.           */
/* -------------------------------------------------------------------------- */
DECLARE @schema SYSNAME;
DECLARE @table  SYSNAME;
DECLARE @fqn    NVARCHAR(512);
DECLARE @sql    NVARCHAR(MAX);
DECLARE @count  INT = 0;

DECLARE id_cur CURSOR LOCAL FAST_FORWARD FOR
SELECT s.name, t.name
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
  AND EXISTS (
      SELECT 1
      FROM sys.identity_columns AS ic
      WHERE ic.object_id = t.object_id
  )
ORDER BY s.name, t.name;

OPEN id_cur;
FETCH NEXT FROM id_cur INTO @schema, @table;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @fqn = QUOTENAME(@schema) + N'.' + QUOTENAME(@table);
    -- RESEED 0 con tabla vacía: siguiente valor = 1 (SQL Server).
    SET @sql = N'DBCC CHECKIDENT (N''' + REPLACE(@fqn, N'''', N'''''') + N''', RESEED, 0) WITH NO_INFOMSGS;';
    BEGIN TRY
        EXEC sys.sp_executesql @sql;
        SET @count += 1;
        PRINT N'  IDENTITY reseed: ' + @fqn;
    END TRY
    BEGIN CATCH
        PRINT N'  AVISO: no se pudo reseed ' + @fqn + N' — ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM id_cur INTO @schema, @table;
END

CLOSE id_cur;
DEALLOCATE id_cur;

IF @count = 0
    PRINT N'[2/3] Identity: ninguna columna IDENTITY en tablas de usuario (esperado en MediCore actual).';
ELSE
    PRINT N'[2/3] Identity: reseadeadas ' + CAST(@count AS NVARCHAR(10)) + N' tabla(s).';
GO

/* -------------------------------------------------------------------------- */
/* 3) Seed — Clínicas del Valle                                                */
/* -------------------------------------------------------------------------- */
DECLARE @TenantId         UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000001';
DECLARE @BranchChalco     UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000101';
DECLARE @BranchSatelite   UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000102';
DECLARE @AdminUserId      UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000201';
DECLARE @TriageConfigId   UNIQUEIDENTIFIER = 'a1b2c3d4-0001-4000-8000-000000000301';

DECLARE @TenantCode       NVARCHAR(64)  = N'clinicas_del_valle';
DECLARE @TenantName       NVARCHAR(200) = N'Clínicas del Valle';
DECLARE @AdminUserName    NVARCHAR(128) = N'admin';
DECLARE @AdminDisplayName NVARCHAR(200) = N'Administrador Clínicas del Valle';
-- Password: Demo123!
DECLARE @AdminPasswordHash NVARCHAR(200) = N'$2a$11$SXuEG72vHIZndEe7h3kuX.LavN1Lzvhzm0SKzVNBwXqWgTGoTY1vK';

IF OBJECT_ID(N'dbo.Tenant', N'U') IS NULL
    THROW 52001, N'Falta dbo.Tenant. Aplique migraciones (apply-database.ps1) antes de este script.', 1;

INSERT INTO dbo.Tenant (TenantId, Code, Name, IsActive, IsDeleted)
VALUES (@TenantId, @TenantCode, @TenantName, 1, 0);

DECLARE @Branches TABLE (BranchId UNIQUEIDENTIFIER, Code NVARCHAR(64), Name NVARCHAR(200));
INSERT INTO @Branches VALUES
    (@BranchChalco,   N'CHALCO',   N'Servicios de Salud - Chalco'),
    (@BranchSatelite, N'SATELITE', N'Servicios de Salud - Satelite');

INSERT INTO dbo.Branch (BranchId, TenantId, Code, Name, FacilityType, HasEmergencyService, IsActive, IsDeleted)
SELECT BranchId, @TenantId, Code, Name, NULL, NULL, 1, 0
FROM @Branches;

DECLARE @Roles TABLE (Code NVARCHAR(64), Name NVARCHAR(128));
INSERT INTO @Roles VALUES
    (N'admin', N'Administrador'),
    (N'medico', N'Médico'),
    (N'recepcion', N'Recepción'),
    (N'enfermeria', N'Enfermería'),
    (N'caja', N'Caja y Cobros'),
    (N'farmacia', N'Farmacia'),
    (N'laboratorio', N'Laboratorio'),
    (N'directivo', N'Directivo'),
    (N'trabajo_social', N'Trabajo social');

INSERT INTO dbo.Role (RoleId, TenantId, Code, Name)
SELECT NEWID(), @TenantId, Code, Name FROM @Roles;

INSERT INTO dbo.[User] (UserId, TenantId, UserName, DisplayName, PasswordHash, IsActive, IsSuperAdmin)
VALUES (@AdminUserId, @TenantId, @AdminUserName, @AdminDisplayName, @AdminPasswordHash, 1, 0);

INSERT INTO dbo.UserRole (UserId, RoleId, TenantId)
SELECT @AdminUserId, r.RoleId, @TenantId
FROM dbo.Role r
WHERE r.TenantId = @TenantId AND r.Code = N'admin';

INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId)
SELECT @AdminUserId, BranchId, @TenantId FROM @Branches;

INSERT INTO dbo.FeatureFlag (FeatureFlagId, Scope, TenantId, BranchId, FlagKey, IsEnabled)
VALUES
    (NEWID(), N'Tenant', @TenantId, NULL, N'CFDI', 0),
    (NEWID(), N'Tenant', @TenantId, NULL, N'FHIR', 0),
    (NEWID(), N'Tenant', @TenantId, NULL, N'RENAPO', 0);

IF OBJECT_ID(N'dbo.TriageScaleConfig', N'U') IS NOT NULL
BEGIN
    DECLARE @LevelsJson NVARCHAR(MAX) = N'{
  "levels": [
    { "code": "prioridad_1", "label": "Atención inmediata", "priority": 1, "icon": "ri-flashlight-line", "sortHint": "1" },
    { "code": "prioridad_2", "label": "Muy urgente", "priority": 2, "icon": "ri-alarm-warning-line", "sortHint": "2" },
    { "code": "prioridad_3", "label": "Urgente", "priority": 3, "icon": "ri-error-warning-line", "sortHint": "3" },
    { "code": "prioridad_4", "label": "Menos urgente", "priority": 4, "icon": "ri-time-line", "sortHint": "4" },
    { "code": "prioridad_5", "label": "No urgente", "priority": 5, "icon": "ri-check-line", "sortHint": "5" }
  ],
  "note": "Escala sintética de arranque; el establecimiento la ajusta vía API/admin."
}';
    INSERT INTO dbo.TriageScaleConfig (
        ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson, IsActive, UpdatedByUserId
    )
    VALUES (
        @TriageConfigId, @TenantId, NULL,
        N'escala_sintetica_demo_v1',
        N'Escala sintética (5 niveles)',
        @LevelsJson, 1, @AdminUserId
    );
END

IF OBJECT_ID(N'dbo.Medication', N'U') IS NOT NULL
BEGIN
    INSERT INTO dbo.Medication (
        MedicationId, TenantId, GenericName, BrandName, Presentation, Concentration,
        DefaultRoute, SaleClassification, IsControlledSubstance, IsActive
    )
    VALUES
    ('a1b2c3d4-aed0-4000-8000-000000000001', @TenantId, N'Paracetamol', NULL, N'Tableta', N'500mg', N'oral', N'IV', 0, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000002', @TenantId, N'Ibuprofeno', NULL, N'Tableta', N'400mg', N'oral', N'IV', 0, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000003', @TenantId, N'Amoxicilina', NULL, N'Cápsula', N'500mg', N'oral', N'IV', 0, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000004', @TenantId, N'Metformina', NULL, N'Tableta', N'850mg', N'oral', N'IV', 0, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000005', @TenantId, N'Omeprazol', NULL, N'Cápsula', N'20mg', N'oral', N'IV', 0, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000091', @TenantId, N'Morfina', NULL, N'Ampolleta', N'10mg/ml', N'intravenosa', N'I', 1, 1),
    ('a1b2c3d4-aed0-4000-8000-000000000092', @TenantId, N'Alprazolam', NULL, N'Tableta', N'0.5mg', N'oral', N'I', 1, 1);
END

PRINT N'[3/3] Seed OK — clinicas_del_valle | CHALCO + SATELITE | admin / Demo123!';
PRINT N'Frontend: VITE_TENANT_CODE=clinicas_del_valle';
GO
