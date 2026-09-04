-- Foto de identificación del sujeto (#44). Ruta relativa bajo files/. Aditivo; sin DELETE/DROP/TRUNCATE.
USE [$(DbName)];
GO

IF COL_LENGTH(N'dbo.Subject', N'PhotoRelativePath') IS NULL
    ALTER TABLE dbo.Subject ADD PhotoRelativePath NVARCHAR(512) NULL;
GO

PRINT '0017_subject_photo OK — PhotoRelativePath en Subject.';
GO
