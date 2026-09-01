-- 003_provision_tenant.sql — Aprovisionamiento manual de un tenant + sucursal inicial.
-- Script de OPERACIÓN (no es endpoint). Idempotente: IF NOT EXISTS, sin DELETE.
--
-- Variables sqlcmd (todas obligatorias salvo las marcadas opcionales):
--   DbName, TenantId, TenantCode, TenantName, BranchId, BranchCode, BranchName
-- Opcionales (si se omiten quedan NULL — nunca se inventa domicilio ni tipo):
--   TenantLegalName, BranchLegalName, TimeZoneId
--
-- FacilityType y HasEmergencyService NO se aceptan aquí a propósito: quedan NULL
-- en aprovisionamiento genérico (el operador los fija después vía API/admin).
-- En Dev, el seed 002 aplica la tipología demo (Central=urgencias; Norte/Sur=ambulatorio;
-- doc 06 §10 ratificada 2026-08-30) sin inventar domicilios.
--
-- Ejemplo (PowerShell):
--   sqlcmd -S $Server -d $Db -U $User -P $Pass -b -I -f 65001 `
--     -i backend/database/seeds/003_provision_tenant.sql `
--     -v DbName=$Db `
--        TenantId="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" `
--        TenantCode="cliente1" TenantName="Clínica Ejemplo" `
--        BranchId="ffffffff-1111-2222-3333-444444444444" `
--        BranchCode="CENTRAL" BranchName="Sucursal central"

USE [$(DbName)];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @TenantId   UNIQUEIDENTIFIER = CAST('$(TenantId)' AS UNIQUEIDENTIFIER);
DECLARE @BranchId   UNIQUEIDENTIFIER = CAST('$(BranchId)' AS UNIQUEIDENTIFIER);
DECLARE @TenantCode NVARCHAR(64) = N'$(TenantCode)';
DECLARE @TenantName NVARCHAR(200) = N'$(TenantName)';
DECLARE @BranchCode NVARCHAR(64) = N'$(BranchCode)';
DECLARE @BranchName NVARCHAR(200) = N'$(BranchName)';

-- Opcionales: sqlcmd sustituye $(Var) por vacío si no se pasa -v; NULLIF deja NULL.
DECLARE @TenantLegalName NVARCHAR(200) = NULLIF(N'$(TenantLegalName)', N'');
DECLARE @BranchLegalName NVARCHAR(200) = NULLIF(N'$(BranchLegalName)', N'');
DECLARE @TimeZoneId      NVARCHAR(64)  = NULLIF(N'$(TimeZoneId)', N'');

IF @TenantCode IS NULL OR LTRIM(RTRIM(@TenantCode)) = N''
    THROW 50001, N'TenantCode es obligatorio.', 1;
IF @TenantName IS NULL OR LTRIM(RTRIM(@TenantName)) = N''
    THROW 50002, N'TenantName es obligatorio.', 1;
IF @BranchCode IS NULL OR LTRIM(RTRIM(@BranchCode)) = N''
    THROW 50003, N'BranchCode es obligatorio.', 1;
IF @BranchName IS NULL OR LTRIM(RTRIM(@BranchName)) = N''
    THROW 50004, N'BranchName es obligatorio.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.Tenant WHERE Code = @TenantCode AND IsDeleted = 0)
        THROW 50005, N'Ya existe un tenant con ese Code.', 1;

    INSERT INTO dbo.Tenant (TenantId, Code, Name, LegalName, Rfc, PrimaryColorToken, IsActive, IsDeleted)
    VALUES (@TenantId, @TenantCode, @TenantName, @TenantLegalName, NULL, NULL, 1, 0);
END
ELSE
BEGIN
    -- No pisa LegalName/Rfc/color si ya hay captura; sólo reactiva y alinea código/nombre.
    UPDATE dbo.Tenant
    SET Code = @TenantCode,
        Name = @TenantName,
        IsActive = 1,
        IsDeleted = 0,
        LegalName = COALESCE(LegalName, @TenantLegalName)
    WHERE TenantId = @TenantId;
END

IF NOT EXISTS (SELECT 1 FROM dbo.Branch WHERE BranchId = @BranchId)
BEGIN
    IF EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE TenantId = @TenantId AND Code = @BranchCode AND IsDeleted = 0
    )
        THROW 50006, N'Ya existe una sucursal con ese Code en el tenant.', 1;

    -- FacilityType y HasEmergencyService = NULL a propósito (tipología solo con captura o seed 002).
    -- Domicilio, teléfono y licencia = NULL: no se inventan.
    INSERT INTO dbo.Branch (
        BranchId, TenantId, Code, Name,
        FacilityType, LegalName,
        AddressStreet, AddressNumber, AddressNeighborhood,
        AddressMunicipality, AddressState, AddressPostalCode,
        PhoneNumber, HealthLicense, ResponsiblePhysicianProfessionalId,
        TimeZoneId, HasEmergencyService,
        IsActive, IsDeleted
    )
    VALUES (
        @BranchId, @TenantId, @BranchCode, @BranchName,
        NULL, @BranchLegalName,
        NULL, NULL, NULL,
        NULL, NULL, NULL,
        NULL, NULL, NULL,
        @TimeZoneId, NULL,
        1, 0
    );
END
ELSE
BEGIN
    UPDATE dbo.Branch
    SET Code = @BranchCode,
        Name = @BranchName,
        IsActive = 1,
        IsDeleted = 0,
        LegalName = COALESCE(LegalName, @BranchLegalName),
        TimeZoneId = COALESCE(TimeZoneId, @TimeZoneId)
        -- FacilityType / HasEmergencyService / domicilio: no se rellenan aquí.
    WHERE BranchId = @BranchId
      AND TenantId = @TenantId;
END

PRINT N'003_provision_tenant OK — tenant=' + @TenantCode + N' branch=' + @BranchCode
    + N' (FacilityType/HasEmergencyService NULL aquí; tipología demo en seed 002).';
GO
