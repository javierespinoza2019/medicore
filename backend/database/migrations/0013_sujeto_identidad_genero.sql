-- 0013_sujeto_identidad_genero.sql — MediCore M3 aditivo (pregunta M / decisión 62)
-- Opción B ratificada 2026-08-28: GenderIdentity opcional; BiologicalSex sin cambio.
-- Sin DELETE, DROP ni TRUNCATE: sólo ADD COLUMN si no existe.
-- Catálogo alineable a GIIS-B015-02-09 (Consulta Externa): 0…6, 88. NULL = no capturado.
-- Clínica/dosis/rangos/reporte Urgencias SEUL: NUNCA usan este campo (doc 14).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

IF OBJECT_ID(N'dbo.Subject', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Subject', N'GenderIdentity') IS NULL
BEGIN
    ALTER TABLE dbo.Subject ADD GenderIdentity NVARCHAR(8) NULL;
    -- Códigos documentados (GIIS genero): 0|1|2|3|4|5|6|88. Sin DEFAULT (no fabricar).
END
GO

PRINT '0013_sujeto_identidad_genero OK';
GO
