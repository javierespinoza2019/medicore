USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Sync_GetIdempotency
    @TenantId UNIQUEIDENTIFIER,
    @IdempotencyKey NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TenantId, IdempotencyKey, CommandType, ResponseJson, PayloadHash, CreatedAtUtc
    FROM dbo.IdempotencyRecord
    WHERE TenantId = @TenantId AND IdempotencyKey = @IdempotencyKey;
END
GO

-- Registra la clave de idempotencia de forma atómica y devuelve el desenlace:
--   created   → primera vez, el llamador continúa con el hecho de negocio
--   duplicate → reintento legítimo; se devuelve la respuesta original
--   conflict  → la clave ya existe con otro CommandType u otra huella de payload
--
-- Concurrencia: el INSERT ... WHERE NOT EXISTS con (UPDLOCK, HOLDLOCK) toma un
-- candado de rango sobre la llave (TenantId, IdempotencyKey) del PK, así dos
-- peticiones simultáneas con la misma clave se serializan: una inserta y la otra
-- ve la fila ya existente y responde duplicate, sin violación de llave duplicada.
-- El CATCH queda como red de seguridad (p. ej. si el candado de rango no aplica
-- por un plan distinto) y solo traduce 2601/2627 a duplicate; no usa XACT_ABORT
-- para no condenar la transacción del llamador (el outbox va en la misma).
CREATE OR ALTER PROCEDURE dbo.sp_Sync_SaveIdempotency
    @TenantId UNIQUEIDENTIFIER,
    @IdempotencyKey NVARCHAR(128),
    @CommandType NVARCHAR(128),
    @ResponseJson NVARCHAR(MAX),
    @PayloadHash CHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Outcome NVARCHAR(16);

    BEGIN TRY
        INSERT INTO dbo.IdempotencyRecord (TenantId, IdempotencyKey, CommandType, ResponseJson, PayloadHash)
        SELECT @TenantId, @IdempotencyKey, @CommandType, @ResponseJson, @PayloadHash
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.IdempotencyRecord WITH (UPDLOCK, HOLDLOCK)
            WHERE TenantId = @TenantId AND IdempotencyKey = @IdempotencyKey);

        SET @Outcome = CASE WHEN @@ROWCOUNT = 1 THEN N'created' ELSE N'duplicate' END;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() IN (2601, 2627) AND XACT_STATE() <> -1
            SET @Outcome = N'duplicate';
        ELSE
            THROW;
    END CATCH

    IF @Outcome = N'duplicate'
    BEGIN
        SELECT @Outcome = CASE
                WHEN r.CommandType <> @CommandType THEN N'conflict'
                WHEN @PayloadHash IS NOT NULL AND r.PayloadHash IS NOT NULL AND r.PayloadHash <> @PayloadHash THEN N'conflict'
                ELSE N'duplicate'
            END
        FROM dbo.IdempotencyRecord AS r
        WHERE r.TenantId = @TenantId AND r.IdempotencyKey = @IdempotencyKey;
    END

    SELECT Outcome = @Outcome,
           r.TenantId,
           r.IdempotencyKey,
           r.CommandType,
           r.ResponseJson,
           r.PayloadHash,
           r.CreatedAtUtc
    FROM dbo.IdempotencyRecord AS r
    WHERE r.TenantId = @TenantId AND r.IdempotencyKey = @IdempotencyKey;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outbox_Enqueue
    @OutboxId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER,
    @Channel NVARCHAR(64),
    @PayloadJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.OutboxMessage (OutboxId, TenantId, Channel, PayloadJson, Status)
    VALUES (@OutboxId, @TenantId, @Channel, @PayloadJson, N'pending');
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outbox_ClaimPending
    @BatchSize INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    ;WITH cte AS (
        SELECT TOP (@BatchSize) *
        FROM dbo.OutboxMessage WITH (ROWLOCK, READPAST)
        WHERE Status IN (N'pending', N'failed')
          AND (LockedUntilUtc IS NULL OR LockedUntilUtc < SYSUTCDATETIME())
        ORDER BY CreatedAtUtc
    )
    UPDATE cte
    SET Status = N'processing',
        LockedUntilUtc = DATEADD(MINUTE, 5, SYSUTCDATETIME()),
        AttemptCount = AttemptCount + 1
    OUTPUT inserted.OutboxId, inserted.TenantId, inserted.Channel, inserted.PayloadJson, inserted.AttemptCount;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outbox_MarkSent
    @OutboxId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OutboxMessage
    SET Status = N'sent',
        ProcessedAtUtc = SYSUTCDATETIME(),
        LockedUntilUtc = NULL,
        LastError = NULL
    WHERE OutboxId = @OutboxId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Outbox_MarkFailed
    @OutboxId UNIQUEIDENTIFIER,
    @LastError NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OutboxMessage
    SET Status = N'failed',
        LastError = @LastError,
        LockedUntilUtc = DATEADD(SECOND, POWER(2, CASE WHEN AttemptCount > 8 THEN 8 ELSE AttemptCount END), SYSUTCDATETIME())
    WHERE OutboxId = @OutboxId;
END
GO
