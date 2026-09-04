-- Logo white-label: ruta relativa bajo files/ (tenant y branch). Aditivo; sin DELETE/DROP/TRUNCATE.
USE [$(DbName)];
GO

IF COL_LENGTH(N'dbo.Tenant', N'LogoRelativePath') IS NULL
    ALTER TABLE dbo.Tenant ADD LogoRelativePath NVARCHAR(512) NULL;
GO

IF COL_LENGTH(N'dbo.Branch', N'LogoRelativePath') IS NULL
    ALTER TABLE dbo.Branch ADD LogoRelativePath NVARCHAR(512) NULL;
GO

PRINT '0016_file_logo OK — LogoRelativePath en Tenant y Branch.';
GO
