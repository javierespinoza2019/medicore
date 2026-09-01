-- 0002_sync_idempotency_hash.sql — MediCore Fase 0 (idempotente)
-- Agrega la huella del payload al registro de idempotencia para distinguir un
-- reintento legítimo de la cola offline (misma clave, mismo contenido) de una
-- reutilización indebida de la clave con otro contenido.
--
-- Se guarda SHA-256 en hexadecimal, nunca el payload: el contenido de los
-- comandos es clínico (PHI en ambientes dedicados) y el registro de
-- idempotencia no es el expediente. Con el hash basta para comparar.
--
-- Sin DROP ni DELETE: solo ALTER ... ADD condicional.
-- Requiere la variable sqlcmd DbName.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

IF COL_LENGTH(N'dbo.IdempotencyRecord', N'PayloadHash') IS NULL
BEGIN
    ALTER TABLE dbo.IdempotencyRecord ADD PayloadHash CHAR(64) NULL;
END
GO

PRINT '0002_sync_idempotency_hash OK';
GO
