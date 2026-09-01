-- sp_Specialty.sql — catálogo de especialidades por tenant (M1).
-- Sin DELETE físico. CREATE OR ALTER.

USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Specialty_List
    @TenantId   UNIQUEIDENTIFIER,
    @OnlyActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SpecialtyId,
        s.TenantId,
        s.Code,
        s.Name,
        s.IsActive,
        s.CreatedAtUtc,
        s.UpdatedAtUtc
    FROM dbo.Specialty s
    WHERE s.TenantId = @TenantId
      AND s.IsDeleted = 0
      AND (@OnlyActive = 0 OR s.IsActive = 1)
    ORDER BY s.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Specialty_GetById
    @TenantId    UNIQUEIDENTIFIER,
    @SpecialtyId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        s.SpecialtyId,
        s.TenantId,
        s.Code,
        s.Name,
        s.IsActive,
        s.CreatedAtUtc,
        s.UpdatedAtUtc
    FROM dbo.Specialty s
    WHERE s.TenantId = @TenantId
      AND s.SpecialtyId = @SpecialtyId
      AND s.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Specialty_Upsert
    @TenantId    UNIQUEIDENTIFIER,
    @SpecialtyId UNIQUEIDENTIFIER,
    @Code        NVARCHAR(64),
    @Name        NVARCHAR(200),
    @IsActive    BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @Code IS NULL OR LTRIM(RTRIM(@Code)) = N''
        THROW 50040, N'El código de especialidad es obligatorio.', 1;
    IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = N''
        THROW 50041, N'El nombre de especialidad es obligatorio.', 1;

    DECLARE @CodeN NVARCHAR(64) = UPPER(LTRIM(RTRIM(@Code)));
    DECLARE @NameN NVARCHAR(200) = LTRIM(RTRIM(@Name));

    IF EXISTS (
        SELECT 1 FROM dbo.Specialty
        WHERE TenantId = @TenantId
          AND Code = @CodeN
          AND SpecialtyId <> @SpecialtyId
          AND IsDeleted = 0
    )
        THROW 50042, N'Ya existe una especialidad con ese código en el tenant.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.Specialty
        WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0
    )
    BEGIN
        UPDATE dbo.Specialty
        SET Code = @CodeN,
            Name = @NameN,
            IsActive = @IsActive,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0;
    END
    ELSE IF EXISTS (
        SELECT 1 FROM dbo.Specialty
        WHERE SpecialtyId = @SpecialtyId
    )
        THROW 50043, N'Especialidad no encontrada en el tenant.', 1;
    ELSE
    BEGIN
        INSERT INTO dbo.Specialty (SpecialtyId, TenantId, Code, Name, IsActive, IsDeleted, CreatedAtUtc)
        VALUES (@SpecialtyId, @TenantId, @CodeN, @NameN, @IsActive, 0, SYSUTCDATETIME());
    END

    EXEC dbo.sp_Specialty_GetById @TenantId = @TenantId, @SpecialtyId = @SpecialtyId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Specialty_SoftDelete
    @TenantId    UNIQUEIDENTIFIER,
    @SpecialtyId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- No se desasigna SpecialtyId de profesionales: la FK permanece; el listado
    -- de profesionales puede mostrar SpecialtyName NULL si la especialidad está baja.
    UPDATE dbo.Specialty
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE SpecialtyId = @SpecialtyId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
