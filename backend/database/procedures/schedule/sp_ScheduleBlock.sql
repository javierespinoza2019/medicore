-- SPs de reglas de bloqueo de agenda. CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- THROW 50230 conflicto cita; 50231–50239 validación.
USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_ScheduleBlock_List
    @TenantId   UNIQUEIDENTIFIER,
    @BranchId   UNIQUEIDENTIFIER,
    @FromUtc    DATETIME2(3),
    @ToUtc      DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.BlockId, b.TenantId, b.BranchId, b.Kind, b.Name, b.LocalDate,
        b.StartUtc, b.EndUtc, b.ProfessionalId, b.SpecialtyId,
        p.FullName AS ProfessionalFullName,
        s.Name AS SpecialtyName,
        b.IsActive, b.CreatedByUserId, b.CreatedAtUtc, b.UpdatedAtUtc
    FROM dbo.ScheduleBlock b
    LEFT JOIN dbo.HealthcareProfessional p
        ON p.HealthcareProfessionalId = b.ProfessionalId
       AND p.TenantId = b.TenantId
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = b.SpecialtyId
       AND s.TenantId = b.TenantId
       AND s.IsDeleted = 0
    WHERE b.TenantId = @TenantId
      AND b.BranchId = @BranchId
      AND b.IsDeleted = 0
      AND b.StartUtc < @ToUtc
      AND b.EndUtc > @FromUtc
    ORDER BY b.LocalDate, b.StartUtc, b.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ScheduleBlock_Upsert
    @TenantId           UNIQUEIDENTIFIER,
    @BlockId            UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER,
    @Kind               NVARCHAR(32),
    @Name               NVARCHAR(200),
    @LocalDate          DATE,
    @StartUtc           DATETIME2(3),
    @EndUtc             DATETIME2(3),
    @ProfessionalId     UNIQUEIDENTIFIER = NULL,
    @SpecialtyId        UNIQUEIDENTIFIER = NULL,
    @IsActive           BIT = 1,
    @ActorUserId        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @EndUtc <= @StartUtc
        THROW 50231, N'La hora de fin del bloqueo debe ser posterior a la de inicio.', 1;

    IF @Kind NOT IN (N'rango', N'dia', N'medico', N'especialidad')
        THROW 50232, N'Tipo de bloqueo no reconocido.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE TenantId = @TenantId AND BranchId = @BranchId AND IsDeleted = 0
    )
        THROW 50210, N'La sucursal no existe en el tenant o está dada de baja.', 1;

    IF @Kind = N'medico'
    BEGIN
        IF @ProfessionalId IS NULL
            THROW 50233, N'El bloqueo por médico requiere professionalId.', 1;
        IF NOT EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId AND HealthcareProfessionalId = @ProfessionalId AND IsDeleted = 0
        )
            THROW 50222, N'El profesional no existe en el tenant o está dado de baja.', 1;
        SET @SpecialtyId = NULL;
    END
    ELSE IF @Kind = N'especialidad'
    BEGIN
        IF @SpecialtyId IS NULL
            THROW 50234, N'El bloqueo por especialidad requiere specialtyId.', 1;
        IF NOT EXISTS (
            SELECT 1 FROM dbo.Specialty
            WHERE TenantId = @TenantId AND SpecialtyId = @SpecialtyId AND IsDeleted = 0
        )
            THROW 50212, N'La especialidad no existe en el tenant o está dada de baja.', 1;
        SET @ProfessionalId = NULL;
    END
    ELSE
    BEGIN
        SET @ProfessionalId = NULL;
        SET @SpecialtyId = NULL;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.ScheduleBlock
        WHERE TenantId = @TenantId AND BlockId = @BlockId AND IsDeleted = 0
    )
    BEGIN
        UPDATE dbo.ScheduleBlock
        SET BranchId = @BranchId,
            Kind = @Kind,
            Name = @Name,
            LocalDate = @LocalDate,
            StartUtc = @StartUtc,
            EndUtc = @EndUtc,
            ProfessionalId = @ProfessionalId,
            SpecialtyId = @SpecialtyId,
            IsActive = @IsActive,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId AND BlockId = @BlockId AND IsDeleted = 0;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.ScheduleBlock (
            BlockId, TenantId, BranchId, Kind, Name, LocalDate,
            StartUtc, EndUtc, ProfessionalId, SpecialtyId,
            IsActive, IsDeleted, CreatedByUserId, CreatedAtUtc, UpdatedAtUtc
        )
        VALUES (
            @BlockId, @TenantId, @BranchId, @Kind, @Name, @LocalDate,
            @StartUtc, @EndUtc, @ProfessionalId, @SpecialtyId,
            @IsActive, 0, @ActorUserId, SYSUTCDATETIME(), SYSUTCDATETIME()
        );
    END

    SELECT
        b.BlockId, b.TenantId, b.BranchId, b.Kind, b.Name, b.LocalDate,
        b.StartUtc, b.EndUtc, b.ProfessionalId, b.SpecialtyId,
        p.FullName AS ProfessionalFullName,
        s.Name AS SpecialtyName,
        b.IsActive, b.CreatedByUserId, b.CreatedAtUtc, b.UpdatedAtUtc
    FROM dbo.ScheduleBlock b
    LEFT JOIN dbo.HealthcareProfessional p
        ON p.HealthcareProfessionalId = b.ProfessionalId
       AND p.TenantId = b.TenantId
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = b.SpecialtyId
       AND s.TenantId = b.TenantId
       AND s.IsDeleted = 0
    WHERE b.TenantId = @TenantId AND b.BlockId = @BlockId AND b.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ScheduleBlock_SoftDelete
    @TenantId    UNIQUEIDENTIFIER,
    @BlockId     UNIQUEIDENTIFIER,
    @ActorUserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ScheduleBlock
        WHERE TenantId = @TenantId AND BlockId = @BlockId AND IsDeleted = 0
    )
        THROW 50235, N'La regla de bloqueo no existe o ya está dada de baja.', 1;

    UPDATE dbo.ScheduleBlock
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND BlockId = @BlockId AND IsDeleted = 0;
END
GO
