-- 0003_healthcare_professional.sql — MediCore (idempotente)
-- Modela al profesional sanitario y su liga opcional con el usuario del sistema.
-- Requiere la variable sqlcmd DbName. Sin DELETE, DROP ni TRUNCATE: sólo CREATE ... IF NULL.
--
-- ─────────────────────────── Por qué esta forma ───────────────────────────
--
-- 1. Profesional y usuario son entidades distintas y la liga es opcional en ambos
--    sentidos. Un profesional puede existir sin cuenta (médico externo que firma en
--    papel, o alta administrativa previa al alta de acceso) y un usuario puede no ser
--    profesional (recepción, caja, farmacia). Por eso `UserId` es NULL-able y la liga
--    vive en la tabla del profesional, no como columna de dbo.[User].
--
-- 2. La cédula profesional y la especialidad **admiten "no capturado"** (NULL) y no
--    tienen valor por omisión. Motivo: no se fabrican datos profesionales, igual que
--    no se fabrican datos clínicos. Un profesional dado de alta sin cédula a la vista
--    queda con `ProfessionalLicense = NULL`, que significa «no se sabe», y nunca con
--    una cadena inventada, un guion ni un centinela.
--
--    Consecuencia deliberada y su límite normativo: el artículo 83 de la Ley General
--    de Salud (texto vigente con reformas DOF 15-01-2026, verificado el 2026-08-22 en
--    la compilación de la Cámara de Diputados; ver docs/analisis/01 §11.1) obliga a
--    consignar el número de cédula profesional y, en su caso, el Certificado de
--    Especialidad vigente en los documentos del ejercicio profesional. Eso convierte
--    la cédula en requisito **del documento que se emite**, no del alta del registro.
--    La regla que lo hará valer —no permitir firmar/emitir sin cédula capturada— es
--    de la capa de negocio del módulo que emita documentos (Fase 1) y NO se
--    implementa aquí. Esta migración sólo garantiza que el dato se pueda representar
--    y que su ausencia sea visible en lugar de quedar disfrazada.
--
--    Lo que **no** está verificado, y por tanto no se afirma ni se implementa:
--    si la cédula debe validarse contra el registro oficial (SEP/RUPE), si es
--    obligatoria para firmar en todo caso, y cómo se representa a pasantes y
--    residentes. Registrado como pendiente en docs/analisis/06-decisiones-abiertas.md.
--    Aquí no hay validación de formato ni consulta a ningún registro externo.
--
-- 3. La especialidad es catálogo por tenant (dbo.Specialty), no texto libre, para que
--    el mismo nombre no se escriba de tres formas. El catálogo se crea **vacío**: no
--    se puebla con especialidades inventadas. Los datos sintéticos de Dev/QA viven en
--    backend/database/seeds/003_dev_profesional_sanitario.sql.
--
-- 4. Baja lógica (`IsDeleted`), estado operativo (`IsActive`) y timestamps UTC, igual
--    que dbo.[User] y dbo.Branch en 0001. Nada se borra.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [$(DbName)];
GO

-- Catálogo de especialidades por tenant. Se crea vacío a propósito.
IF OBJECT_ID(N'dbo.Specialty', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Specialty (
        SpecialtyId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Specialty PRIMARY KEY,
        TenantId        UNIQUEIDENTIFIER NOT NULL,
        Code            NVARCHAR(64) NOT NULL,
        Name            NVARCHAR(200) NOT NULL,
        IsActive        BIT NOT NULL CONSTRAINT DF_Specialty_IsActive DEFAULT (1),
        IsDeleted       BIT NOT NULL CONSTRAINT DF_Specialty_IsDeleted DEFAULT (0),
        CreatedAtUtc    DATETIME2(3) NOT NULL CONSTRAINT DF_Specialty_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        UpdatedAtUtc    DATETIME2(3) NULL,
        CONSTRAINT FK_Specialty_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT UQ_Specialty_Tenant_Code UNIQUE (TenantId, Code)
    );
    CREATE INDEX IX_Specialty_TenantId ON dbo.Specialty(TenantId);
END
GO

IF OBJECT_ID(N'dbo.HealthcareProfessional', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HealthcareProfessional (
        HealthcareProfessionalId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_HealthcareProfessional PRIMARY KEY,
        TenantId                 UNIQUEIDENTIFIER NOT NULL,
        -- Liga opcional con la cuenta de acceso. NULL = profesional sin usuario del sistema.
        UserId                   UNIQUEIDENTIFIER NULL,
        FullName                 NVARCHAR(200) NOT NULL,
        -- Cédula profesional. NULL = no capturada. Nunca se rellena por omisión.
        ProfessionalLicense      NVARCHAR(64) NULL,
        -- Especialidad. NULL = no capturada (o profesional sin especialidad declarada).
        SpecialtyId              UNIQUEIDENTIFIER NULL,
        IsActive                 BIT NOT NULL CONSTRAINT DF_HcProfessional_IsActive DEFAULT (1),
        IsDeleted                BIT NOT NULL CONSTRAINT DF_HcProfessional_IsDeleted DEFAULT (0),
        CreatedAtUtc             DATETIME2(3) NOT NULL CONSTRAINT DF_HcProfessional_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
        CreatedByUserId          UNIQUEIDENTIFIER NULL,
        UpdatedAtUtc             DATETIME2(3) NULL,
        UpdatedByUserId          UNIQUEIDENTIFIER NULL,
        CONSTRAINT FK_HcProfessional_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenant(TenantId),
        CONSTRAINT FK_HcProfessional_User FOREIGN KEY (UserId) REFERENCES dbo.[User](UserId),
        CONSTRAINT FK_HcProfessional_Specialty FOREIGN KEY (SpecialtyId) REFERENCES dbo.Specialty(SpecialtyId)
    );

    CREATE INDEX IX_HcProfessional_TenantId ON dbo.HealthcareProfessional(TenantId);

    -- Restricción real del negocio: un usuario no puede estar ligado a dos
    -- profesionales vigentes del mismo tenant. Índice único **filtrado** porque la
    -- liga es opcional y porque la baja es lógica: un profesional dado de baja libera
    -- la liga sin que haya que borrar su fila.
    CREATE UNIQUE INDEX UQ_HcProfessional_Tenant_User
        ON dbo.HealthcareProfessional(TenantId, UserId)
        WHERE UserId IS NOT NULL AND IsDeleted = 0;

    -- Misma lógica para la cédula: unicidad sólo cuando está capturada.
    CREATE UNIQUE INDEX UQ_HcProfessional_Tenant_License
        ON dbo.HealthcareProfessional(TenantId, ProfessionalLicense)
        WHERE ProfessionalLicense IS NOT NULL AND IsDeleted = 0;

    -- Consulta del filtro «mis pacientes»: profesional vigente por usuario.
    CREATE INDEX IX_HcProfessional_Tenant_User_Vigente
        ON dbo.HealthcareProfessional(TenantId, UserId)
        INCLUDE (HealthcareProfessionalId, ProfessionalLicense, SpecialtyId)
        WHERE IsDeleted = 0 AND IsActive = 1;
END
GO

PRINT '0003_healthcare_professional OK';
GO
