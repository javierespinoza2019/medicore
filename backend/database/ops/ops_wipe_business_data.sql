-- ops_wipe_business_data.sql
-- OPERACIÓN EXCEPCIONAL: vacía filas de negocio conservando el esquema (tablas/SPs).
-- Prohibido en el flujo normal de MediCore (AGENTS.md / medicore-database.mdc).
-- Sólo se ejecuta vía tools/reset-and-bootstrap-clinicas-del-valle.ps1 con
-- -IAuthorizeDestructiveReset y confirmación interactiva BORRAR.
--
-- No usa DROP / TRUNCATE. DELETE explícito en orden de dependencias.
-- No tocamos objetos de sistema. No borra archivos en disco (fotos de pacientes).
--
-- Variables sqlcmd:
--   DbName
--   ConfirmWipe  — debe ser exactamente BORRAR

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF N'$(ConfirmWipe)' <> N'BORRAR'
BEGIN
    THROW 51999, N'ops_wipe_business_data: ConfirmWipe debe ser BORRAR. Abortado sin cambios.', 1;
END

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- Hijos clínicos / agenda / auth de sesión primero
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

PRINT N'ops_wipe_business_data OK — filas de negocio vacías; esquema intacto.';
GO

-- Reseed de cualquier IDENTITY presente (MediCore actual no define identity; preventivo).
DECLARE @schema SYSNAME, @table SYSNAME, @fqn NVARCHAR(512), @sql NVARCHAR(MAX), @count INT = 0;
DECLARE id_cur CURSOR LOCAL FAST_FORWARD FOR
SELECT s.name, t.name
FROM sys.tables AS t
INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
  AND EXISTS (SELECT 1 FROM sys.identity_columns AS ic WHERE ic.object_id = t.object_id)
ORDER BY s.name, t.name;
OPEN id_cur;
FETCH NEXT FROM id_cur INTO @schema, @table;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @fqn = QUOTENAME(@schema) + N'.' + QUOTENAME(@table);
    SET @sql = N'DBCC CHECKIDENT (N''' + REPLACE(@fqn, N'''', N'''''') + N''', RESEED, 0) WITH NO_INFOMSGS;';
    BEGIN TRY
        EXEC sys.sp_executesql @sql;
        SET @count += 1;
    END TRY
    BEGIN CATCH
        PRINT N'AVISO identity: ' + @fqn + N' — ' + ERROR_MESSAGE();
    END CATCH
    FETCH NEXT FROM id_cur INTO @schema, @table;
END
CLOSE id_cur;
DEALLOCATE id_cur;
PRINT N'ops_wipe identity reseed: ' + CAST(@count AS NVARCHAR(10)) + N' tabla(s).';
GO
