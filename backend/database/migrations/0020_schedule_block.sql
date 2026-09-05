-- 0020_schedule_block.sql — Reglas de bloqueo de agenda (M9).
-- Baja lógica; sin DELETE/DROP/TRUNCATE. THROW 5023x en SPs.
USE [$(DbName)];
GO

IF OBJECT_ID(N'dbo.ScheduleBlock', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScheduleBlock (
        BlockId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ScheduleBlock PRIMARY KEY,
        TenantId            UNIQUEIDENTIFIER NOT NULL,
        BranchId            UNIQUEIDENTIFIER NOT NULL,
        Kind                NVARCHAR(32) NOT NULL, -- rango | dia | medico | especialidad
        Name                NVARCHAR(200) NOT NULL,
        LocalDate           DATE NOT NULL,
        StartUtc            DATETIME2(3) NOT NULL,
        EndUtc              DATETIME2(3) NOT NULL,
        ProfessionalId      UNIQUEIDENTIFIER NULL,
        SpecialtyId         UNIQUEIDENTIFIER NULL,
        IsActive            BIT NOT NULL CONSTRAINT DF_ScheduleBlock_IsActive DEFAULT (1),
        IsDeleted           BIT NOT NULL CONSTRAINT DF_ScheduleBlock_IsDeleted DEFAULT (0),
        CreatedByUserId     UNIQUEIDENTIFIER NOT NULL,
        CreatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_ScheduleBlock_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc        DATETIME2(3) NOT NULL CONSTRAINT DF_ScheduleBlock_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ScheduleBlock_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_ScheduleBlock_Branch FOREIGN KEY (BranchId) REFERENCES dbo.Branch(BranchId),
        CONSTRAINT FK_ScheduleBlock_Professional FOREIGN KEY (ProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT FK_ScheduleBlock_Specialty FOREIGN KEY (SpecialtyId) REFERENCES dbo.Specialty(SpecialtyId),
        CONSTRAINT CK_ScheduleBlock_Kind CHECK (Kind IN (N'rango', N'dia', N'medico', N'especialidad')),
        CONSTRAINT CK_ScheduleBlock_Range CHECK (EndUtc > StartUtc)
    );

    CREATE INDEX IX_ScheduleBlock_Tenant_Branch_Range
        ON dbo.ScheduleBlock (TenantId, BranchId, StartUtc, EndUtc)
        WHERE IsDeleted = 0 AND IsActive = 1;

    CREATE INDEX IX_ScheduleBlock_Tenant_LocalDate
        ON dbo.ScheduleBlock (TenantId, BranchId, LocalDate)
        WHERE IsDeleted = 0;
END
GO

PRINT '0020_schedule_block OK — ScheduleBlock.';
GO
