-- sp_Medication.sql — MediCore M8 / WS-I
-- Catálogo de medicamentos. Búsqueda excluye controlados por defecto en UI de prescritir.
-- Offline previsto (no cableado Sync): medication.search (lectura).

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Medication_Search
    @TenantId           UNIQUEIDENTIFIER,
    @Query              NVARCHAR(200) = NULL,
    @ExcludeControlled  BIT = 1,
    @MaxRows            INT = 40
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @MaxRows IS NULL OR @MaxRows < 1 SET @MaxRows = 40;
    IF @MaxRows > 100 SET @MaxRows = 100;

    DECLARE @Q NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Query)), N'');

    SELECT TOP (@MaxRows)
        m.MedicationId,
        m.TenantId,
        m.GenericName,
        m.BrandName,
        m.Presentation,
        m.Concentration,
        m.DefaultRoute,
        m.SaleClassification,
        m.IsControlledSubstance,
        m.IsActive
    FROM dbo.Medication m
    WHERE m.TenantId = @TenantId
      AND m.IsDeleted = 0
      AND m.IsActive = 1
      AND (@ExcludeControlled = 0 OR m.IsControlledSubstance = 0)
      AND (
            @Q IS NULL
            OR m.GenericName LIKE N'%' + @Q + N'%'
            OR ISNULL(m.BrandName, N'') LIKE N'%' + @Q + N'%'
          )
    ORDER BY m.GenericName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Medication_Upsert
    @TenantId               UNIQUEIDENTIFIER,
    @MedicationId           UNIQUEIDENTIFIER,
    @GenericName            NVARCHAR(200),
    @BrandName              NVARCHAR(200) = NULL,
    @Presentation           NVARCHAR(200) = NULL,
    @Concentration          NVARCHAR(100) = NULL,
    @DefaultRoute           NVARCHAR(64) = NULL,
    @SaleClassification     NVARCHAR(8),
    @IsControlledSubstance  BIT,
    @IsActive               BIT = 1,
    @ActorUserId            UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@GenericName)), N'') = N''
        THROW 50510, N'GenericName es obligatorio (denominación genérica, LGS art. 225).', 1;

    IF @SaleClassification NOT IN (N'I', N'II', N'III', N'IV', N'V', N'VI')
        THROW 50511, N'SaleClassification inválida (I–VI, LGS art. 226).', 1;

    -- Fracción I implica controlado; no permitir I sin IsControlledSubstance.
    IF @SaleClassification = N'I' AND @IsControlledSubstance = 0
        THROW 50512, N'Fracción I exige IsControlledSubstance = 1.', 1;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @AuditId UNIQUEIDENTIFIER = NEWID();

    BEGIN TRAN;

    IF EXISTS (
        SELECT 1 FROM dbo.Medication
        WHERE MedicationId = @MedicationId AND TenantId = @TenantId AND IsDeleted = 0
    )
    BEGIN
        UPDATE dbo.Medication
        SET GenericName = LTRIM(RTRIM(@GenericName)),
            BrandName = NULLIF(LTRIM(RTRIM(@BrandName)), N''),
            Presentation = NULLIF(LTRIM(RTRIM(@Presentation)), N''),
            Concentration = NULLIF(LTRIM(RTRIM(@Concentration)), N''),
            DefaultRoute = NULLIF(LTRIM(RTRIM(@DefaultRoute)), N''),
            SaleClassification = @SaleClassification,
            IsControlledSubstance = @IsControlledSubstance,
            IsActive = @IsActive,
            UpdatedAtUtc = @Now
        WHERE MedicationId = @MedicationId AND TenantId = @TenantId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Medication (
            MedicationId, TenantId, GenericName, BrandName, Presentation, Concentration,
            DefaultRoute, SaleClassification, IsControlledSubstance, IsActive
        )
        VALUES (
            @MedicationId, @TenantId, LTRIM(RTRIM(@GenericName)),
            NULLIF(LTRIM(RTRIM(@BrandName)), N''),
            NULLIF(LTRIM(RTRIM(@Presentation)), N''),
            NULLIF(LTRIM(RTRIM(@Concentration)), N''),
            NULLIF(LTRIM(RTRIM(@DefaultRoute)), N''),
            @SaleClassification, @IsControlledSubstance, @IsActive
        );
    END

    EXEC dbo.sp_Audit_Append
        @AuditEventId = @AuditId,
        @TenantId = @TenantId,
        @ActorUserId = @ActorUserId,
        @ActorProfessionalId = NULL,
        @BranchId = NULL,
        @EventType = N'medication.upsert',
        @EntityName = N'Medication',
        @EntityId = @MedicationId,
        @SubjectId = NULL,
        @DetailJson = NULL,
        @OccurredAtUtc = @Now,
        @DeviceId = NULL;

    COMMIT;

    SELECT
        m.MedicationId, m.TenantId, m.GenericName, m.BrandName, m.Presentation,
        m.Concentration, m.DefaultRoute, m.SaleClassification, m.IsControlledSubstance, m.IsActive
    FROM dbo.Medication m
    WHERE m.MedicationId = @MedicationId AND m.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Medication_GetById
    @TenantId       UNIQUEIDENTIFIER,
    @MedicationId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        m.MedicationId, m.TenantId, m.GenericName, m.BrandName, m.Presentation,
        m.Concentration, m.DefaultRoute, m.SaleClassification, m.IsControlledSubstance, m.IsActive
    FROM dbo.Medication m
    WHERE m.MedicationId = @MedicationId
      AND m.TenantId = @TenantId
      AND m.IsDeleted = 0;
END
GO

PRINT 'sp_Medication OK';
GO
