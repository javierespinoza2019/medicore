-- Consultorio ↔ especialidad (opcional) + médicos asignados. Aditivo; sin DELETE/DROP/TRUNCATE.
USE [$(DbName)];
GO

IF COL_LENGTH(N'dbo.ConsultingRoom', N'SpecialtyId') IS NULL
BEGIN
    ALTER TABLE dbo.ConsultingRoom ADD SpecialtyId UNIQUEIDENTIFIER NULL;
END
GO

IF COL_LENGTH(N'dbo.ConsultingRoom', N'SpecialtyId') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ConsultingRoom_Specialty'
   )
BEGIN
    ALTER TABLE dbo.ConsultingRoom WITH CHECK
    ADD CONSTRAINT FK_ConsultingRoom_Specialty
        FOREIGN KEY (SpecialtyId) REFERENCES dbo.Specialty(SpecialtyId);
END
GO

IF OBJECT_ID(N'dbo.ConsultingRoomProfessional', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsultingRoomProfessional (
        TenantId                    UNIQUEIDENTIFIER NOT NULL,
        RoomId                      UNIQUEIDENTIFIER NOT NULL,
        HealthcareProfessionalId    UNIQUEIDENTIFIER NOT NULL,
        IsActive                    BIT NOT NULL CONSTRAINT DF_CRP_IsActive DEFAULT (1),
        IsDeleted                   BIT NOT NULL CONSTRAINT DF_CRP_IsDeleted DEFAULT (0),
        CreatedAtUtc                DATETIME2(3) NOT NULL CONSTRAINT DF_CRP_Created DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc                DATETIME2(3) NOT NULL CONSTRAINT DF_CRP_Updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ConsultingRoomProfessional PRIMARY KEY (TenantId, RoomId, HealthcareProfessionalId),
        CONSTRAINT FK_CRP_Room FOREIGN KEY (RoomId) REFERENCES dbo.ConsultingRoom(RoomId),
        CONSTRAINT FK_CRP_Professional FOREIGN KEY (HealthcareProfessionalId)
            REFERENCES dbo.HealthcareProfessional(HealthcareProfessionalId),
        CONSTRAINT FK_CRP_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId)
    );

    CREATE INDEX IX_CRP_Tenant_Room
        ON dbo.ConsultingRoomProfessional (TenantId, RoomId)
        WHERE IsDeleted = 0;
END
GO

PRINT '0018_consulting_room_links OK — SpecialtyId + ConsultingRoomProfessional.';
GO
