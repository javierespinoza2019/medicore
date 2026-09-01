-- SPs de sucursal / establecimiento (M11 / WS-C). CREATE OR ALTER; sin DELETE/DROP/TRUNCATE.
-- Todo SP de negocio recibe @TenantId y filtra por él.
USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_List
    @TenantId   UNIQUEIDENTIFIER,
    @OnlyActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BranchId,
        TenantId,
        Code,
        Name,
        FacilityType,
        LegalName,
        AddressStreet,
        AddressNumber,
        AddressNeighborhood,
        AddressMunicipality,
        AddressState,
        AddressPostalCode,
        PhoneNumber,
        HealthLicense,
        ResponsiblePhysicianProfessionalId,
        TimeZoneId,
        HasEmergencyService,
        IsActive
    FROM dbo.Branch
    WHERE TenantId = @TenantId
      AND IsDeleted = 0
      AND (@OnlyActive = 0 OR IsActive = 1)
    ORDER BY Code;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_GetById
    @TenantId UNIQUEIDENTIFIER,
    @BranchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        BranchId,
        TenantId,
        Code,
        Name,
        FacilityType,
        LegalName,
        AddressStreet,
        AddressNumber,
        AddressNeighborhood,
        AddressMunicipality,
        AddressState,
        AddressPostalCode,
        PhoneNumber,
        HealthLicense,
        ResponsiblePhysicianProfessionalId,
        TimeZoneId,
        HasEmergencyService,
        IsActive
    FROM dbo.Branch
    WHERE TenantId = @TenantId
      AND BranchId = @BranchId
      AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Branch_Upsert
    @TenantId                               UNIQUEIDENTIFIER,
    @BranchId                               UNIQUEIDENTIFIER,
    @Code                                   NVARCHAR(64),
    @Name                                   NVARCHAR(200),
    @FacilityType                           NVARCHAR(64) = NULL,
    @LegalName                              NVARCHAR(200) = NULL,
    @AddressStreet                          NVARCHAR(200) = NULL,
    @AddressNumber                          NVARCHAR(32) = NULL,
    @AddressNeighborhood                    NVARCHAR(120) = NULL,
    @AddressMunicipality                    NVARCHAR(120) = NULL,
    @AddressState                           NVARCHAR(64) = NULL,
    @AddressPostalCode                      NVARCHAR(16) = NULL,
    @PhoneNumber                            NVARCHAR(32) = NULL,
    @HealthLicense                          NVARCHAR(64) = NULL,
    @ResponsiblePhysicianProfessionalId     UNIQUEIDENTIFIER = NULL,
    @TimeZoneId                             NVARCHAR(64) = NULL,
    @HasEmergencyService                    BIT = NULL,
    @IsActive                               BIT = 1,
    @ActorUserId                            UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Sucursal de otro tenant: 0 filas (API → 404; no se confirma existencia).
    IF EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId <> @TenantId AND IsDeleted = 0
    )
        RETURN;

    -- Unicidad (TenantId, Code) entre sucursales activas lógicamente.
    IF EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE TenantId = @TenantId
          AND Code = @Code
          AND BranchId <> @BranchId
          AND IsDeleted = 0
    )
    BEGIN
        THROW 50011, N'Ya existe una sucursal con ese código en el tenant.', 1;
    END

    IF EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
    )
    BEGIN
        UPDATE dbo.Branch
        SET
            Code = @Code,
            Name = @Name,
            -- FacilityType / HasEmergencyService: se aceptan NULL a propósito (pregunta L).
            FacilityType = @FacilityType,
            LegalName = @LegalName,
            AddressStreet = @AddressStreet,
            AddressNumber = @AddressNumber,
            AddressNeighborhood = @AddressNeighborhood,
            AddressMunicipality = @AddressMunicipality,
            AddressState = @AddressState,
            AddressPostalCode = @AddressPostalCode,
            PhoneNumber = @PhoneNumber,
            HealthLicense = @HealthLicense,
            ResponsiblePhysicianProfessionalId = @ResponsiblePhysicianProfessionalId,
            TimeZoneId = @TimeZoneId,
            HasEmergencyService = @HasEmergencyService,
            IsActive = @IsActive
        WHERE BranchId = @BranchId
          AND TenantId = @TenantId
          AND IsDeleted = 0;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Branch (
            BranchId, TenantId, Code, Name,
            FacilityType, LegalName,
            AddressStreet, AddressNumber, AddressNeighborhood,
            AddressMunicipality, AddressState, AddressPostalCode,
            PhoneNumber, HealthLicense, ResponsiblePhysicianProfessionalId,
            TimeZoneId, HasEmergencyService, IsActive, IsDeleted
        )
        VALUES (
            @BranchId, @TenantId, @Code, @Name,
            @FacilityType, @LegalName,
            @AddressStreet, @AddressNumber, @AddressNeighborhood,
            @AddressMunicipality, @AddressState, @AddressPostalCode,
            @PhoneNumber, @HealthLicense, @ResponsiblePhysicianProfessionalId,
            @TimeZoneId, @HasEmergencyService, @IsActive, 0
        );
    END

    -- @ActorUserId queda en la firma para auditoría (M2).
    SELECT
        BranchId,
        TenantId,
        Code,
        Name,
        FacilityType,
        LegalName,
        AddressStreet,
        AddressNumber,
        AddressNeighborhood,
        AddressMunicipality,
        AddressState,
        AddressPostalCode,
        PhoneNumber,
        HealthLicense,
        ResponsiblePhysicianProfessionalId,
        TimeZoneId,
        HasEmergencyService,
        IsActive
    FROM dbo.Branch
    WHERE BranchId = @BranchId
      AND TenantId = @TenantId
      AND IsDeleted = 0;
END
GO
