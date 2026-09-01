-- sp_HealthcareProfessional.sql — profesional sanitario (M1).
-- Lectura + administración (Create/Update/SoftDelete/List). Todo filtra por @TenantId.
-- Sin DELETE físico. CREATE OR ALTER (nunca DROP PROCEDURE).

USE [$(DbName)];
GO

-- Profesional vigente ligado a un usuario. Cero filas = «no hay profesional» (válido).
CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_GetByUser
    @TenantId UNIQUEIDENTIFIER,
    @UserId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    WHERE hp.TenantId = @TenantId
      AND hp.UserId = @UserId
      AND hp.IsDeleted = 0
      AND hp.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_GetById
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    WHERE hp.TenantId = @TenantId
      AND hp.HealthcareProfessionalId = @HealthcareProfessionalId
      AND hp.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_List
    @TenantId   UNIQUEIDENTIFIER,
    @OnlyActive BIT = 1,
    @Search     NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Q NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Search)), N'');

    SELECT
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    WHERE hp.TenantId = @TenantId
      AND hp.IsDeleted = 0
      AND (@OnlyActive = 0 OR hp.IsActive = 1)
      AND (
            @Q IS NULL
            OR hp.FullName LIKE N'%' + @Q + N'%'
            OR hp.ProfessionalLicense LIKE N'%' + @Q + N'%'
            OR s.Name LIKE N'%' + @Q + N'%'
          )
    ORDER BY hp.FullName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_Create
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @UserId                   UNIQUEIDENTIFIER = NULL,
    @FullName                 NVARCHAR(200),
    @ProfessionalLicense      NVARCHAR(64) = NULL,
    @SpecialtyId              UNIQUEIDENTIFIER = NULL,
    @IsActive                 BIT = 1,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @FullName IS NULL OR LTRIM(RTRIM(@FullName)) = N''
        THROW 50030, N'El nombre completo del profesional es obligatorio.', 1;

    IF @SpecialtyId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.Specialty
            WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50031, N'La especialidad no existe en el tenant.', 1;

    IF @UserId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserId = @UserId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50032, N'El usuario a ligar no existe en el tenant.', 1;

    IF @UserId IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0
       )
        THROW 50033, N'Ese usuario ya está ligado a otro profesional vigente.', 1;

    IF @ProfessionalLicense IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND ProfessionalLicense = @ProfessionalLicense
              AND IsDeleted = 0
       )
        THROW 50034, N'Ya existe un profesional con esa cédula en el tenant.', 1;

    INSERT INTO dbo.HealthcareProfessional (
        HealthcareProfessionalId, TenantId, UserId, FullName,
        ProfessionalLicense, SpecialtyId, IsActive, IsDeleted,
        CreatedAtUtc, CreatedByUserId
    )
    VALUES (
        @HealthcareProfessionalId, @TenantId, @UserId, LTRIM(RTRIM(@FullName)),
        NULLIF(LTRIM(RTRIM(@ProfessionalLicense)), N''), @SpecialtyId, @IsActive, 0,
        SYSUTCDATETIME(), @ActorUserId
    );

    EXEC dbo.sp_HealthcareProfessional_GetById
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_Update
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @UserId                   UNIQUEIDENTIFIER = NULL,
    @ClearUserId              BIT = 0,
    @FullName                 NVARCHAR(200),
    @ProfessionalLicense      NVARCHAR(64) = NULL,
    @ClearProfessionalLicense BIT = 0,
    @SpecialtyId              UNIQUEIDENTIFIER = NULL,
    @ClearSpecialtyId         BIT = 0,
    @IsActive                 BIT = 1,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @HealthcareProfessionalId
          AND TenantId = @TenantId
          AND IsDeleted = 0
    )
        RETURN; -- 0 filas → el llamador responde 404

    IF @FullName IS NULL OR LTRIM(RTRIM(@FullName)) = N''
        THROW 50030, N'El nombre completo del profesional es obligatorio.', 1;

    IF @ClearSpecialtyId = 0 AND @SpecialtyId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.Specialty
            WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50031, N'La especialidad no existe en el tenant.', 1;

    IF @ClearUserId = 0 AND @UserId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserId = @UserId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50032, N'El usuario a ligar no existe en el tenant.', 1;

    IF @ClearUserId = 0 AND @UserId IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND UserId = @UserId
              AND IsDeleted = 0
              AND HealthcareProfessionalId <> @HealthcareProfessionalId
       )
        THROW 50033, N'Ese usuario ya está ligado a otro profesional vigente.', 1;

    -- Licencia: Clear=1 → NULL; si llega valor (posible vacío) se normaliza; si el parámetro
    -- llega NULL sin Clear, se conserva la vigente (parcial update).
    DECLARE @License NVARCHAR(64) =
        CASE
            WHEN @ClearProfessionalLicense = 1 THEN NULL
            WHEN @ProfessionalLicense IS NULL THEN NULL -- señal de «conservar»; se aplica abajo
            ELSE NULLIF(LTRIM(RTRIM(@ProfessionalLicense)), N'')
        END;

    IF @ClearProfessionalLicense = 0 AND @ProfessionalLicense IS NOT NULL AND @License IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND ProfessionalLicense = @License
              AND IsDeleted = 0
              AND HealthcareProfessionalId <> @HealthcareProfessionalId
       )
        THROW 50034, N'Ya existe un profesional con esa cédula en el tenant.', 1;

    UPDATE dbo.HealthcareProfessional
    SET
        UserId = CASE
            WHEN @ClearUserId = 1 THEN NULL
            WHEN @UserId IS NULL THEN UserId
            ELSE @UserId
        END,
        FullName = LTRIM(RTRIM(@FullName)),
        ProfessionalLicense = CASE
            WHEN @ClearProfessionalLicense = 1 THEN NULL
            WHEN @ProfessionalLicense IS NULL THEN ProfessionalLicense
            ELSE @License
        END,
        SpecialtyId = CASE
            WHEN @ClearSpecialtyId = 1 THEN NULL
            WHEN @SpecialtyId IS NULL THEN SpecialtyId
            ELSE @SpecialtyId
        END,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME(),
        UpdatedByUserId = @ActorUserId
    WHERE HealthcareProfessionalId = @HealthcareProfessionalId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    EXEC dbo.sp_HealthcareProfessional_GetById
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_SoftDelete
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.HealthcareProfessional
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME(),
        UpdatedByUserId = @ActorUserId
    WHERE HealthcareProfessionalId = @HealthcareProfessionalId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
