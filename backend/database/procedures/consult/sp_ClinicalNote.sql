-- sp_ClinicalNote.sql — MediCore M6 / WS-H
-- Notas clínicas: create, sign (fail-closed sin cédula), seal, addendum, co-author, list, pending evolution.
-- Sin DELETE / DROP / TRUNCATE. Sin SP de UPDATE del cuerpo de una nota firmada (SC-06).
-- Pregunta G: no afirma validez jurídica de la firma. Pregunta H: TouchMedicalAct opcional sin lista ratificada.

USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_Create
    @NoteId                 UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @EncounterId            UNIQUEIDENTIFIER,
    @NoteType               NVARCHAR(40),
    @BodyJson               NVARCHAR(MAX),
    @Prognosis              NVARCHAR(200) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@NoteType)), N'') = N''
        OR @NoteType NOT IN (
            N'urgencias_inicial', N'evolucion', N'interconsulta',
            N'referencia_traslado', N'egreso', N'enfermeria', N'certificado'
        )
        THROW 50410, N'NoteType inválido.', 1;

    IF ISNULL(LTRIM(RTRIM(@BodyJson)), N'') = N''
        THROW 50411, N'BodyJson es obligatorio.', 1;

    IF ISNULL(LTRIM(RTRIM(@ActorDisplayName)), N'') = N''
        THROW 50412, N'ActorDisplayName es obligatorio.', 1;

    DECLARE @SubjectId UNIQUEIDENTIFIER;

    SELECT @SubjectId = e.SubjectId
    FROM dbo.Encounter e
    WHERE e.EncounterId = @EncounterId
      AND e.TenantId = @TenantId
      AND e.IsDeleted = 0;

    IF @SubjectId IS NULL
        THROW 50401, N'Episodio no encontrado.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.ClinicalNote (
        NoteId, TenantId, EncounterId, SubjectId, NoteType, BodyJson, Prognosis,
        AuthorProfessionalId, AuthorUserId, AuthorDisplayName,
        AuthorLicenseSnapshot, FacilitySnapshotJson, ContentHash,
        SignedAtUtc, SealedAtUtc, SealState, IsDeleted, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @NoteId, @TenantId, @EncounterId, @SubjectId, @NoteType, @BodyJson, @Prognosis,
        @ActorProfessionalId, @ActorUserId, LTRIM(RTRIM(@ActorDisplayName)),
        NULL, NULL, NULL,
        NULL, NULL, N'pendiente', 0, @OccurredAtUtc, SYSUTCDATETIME()
    );

    COMMIT;

    EXEC dbo.sp_ClinicalNote_GetById @TenantId = @TenantId, @NoteId = @NoteId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_Sign
    @TenantId               UNIQUEIDENTIFIER,
    @NoteId                 UNIQUEIDENTIFIER,
    @ContentHash            NVARCHAR(64),
    @AuthorProfessionalId   UNIQUEIDENTIFIER,
    @AuthorLicenseSnapshot  NVARCHAR(MAX),
    @FacilitySnapshotJson   NVARCHAR(MAX) = NULL,
    @SignedAtUtc            DATETIME2(3),
    @ActorUserId            UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ContentHash)), N'') = N''
        THROW 50420, N'ContentHash es obligatorio.', 1;

    IF @AuthorProfessionalId IS NULL OR @AuthorProfessionalId = '00000000-0000-0000-0000-000000000000'
        THROW 50421, N'AuthorProfessionalId es obligatorio para firmar (fail closed).', 1;

    IF ISNULL(LTRIM(RTRIM(@AuthorLicenseSnapshot)), N'') = N''
        THROW 50422, N'AuthorLicenseSnapshot es obligatorio al firmar.', 1;

    DECLARE @License NVARCHAR(64);
    DECLARE @IsActive BIT;
    DECLARE @IsDeleted BIT;

    SELECT
        @License = hp.ProfessionalLicense,
        @IsActive = hp.IsActive,
        @IsDeleted = hp.IsDeleted
    FROM dbo.HealthcareProfessional hp
    WHERE hp.HealthcareProfessionalId = @AuthorProfessionalId
      AND hp.TenantId = @TenantId;

    IF @License IS NULL AND NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @AuthorProfessionalId AND TenantId = @TenantId
    )
        THROW 50423, N'Profesional no encontrado en el tenant.', 1;

    IF @IsDeleted = 1 OR @IsActive = 0
        THROW 50423, N'Profesional no encontrado o inactivo.', 1;

    -- Fail closed: sin cédula capturada no se firma (LGS art. 83 / SC-12).
    IF ISNULL(LTRIM(RTRIM(@License)), N'') = N''
        THROW 50424, N'Sin cédula profesional capturada; no se puede firmar.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50402, N'Nota no encontrada.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND SignedAtUtc IS NOT NULL
    )
        THROW 50425, N'La nota ya está firmada (inmutable).', 1;

    BEGIN TRAN;

    UPDATE dbo.ClinicalNote
    SET ContentHash = LTRIM(RTRIM(@ContentHash)),
        AuthorProfessionalId = @AuthorProfessionalId,
        AuthorUserId = @ActorUserId,
        AuthorLicenseSnapshot = @AuthorLicenseSnapshot,
        FacilitySnapshotJson = @FacilitySnapshotJson,
        SignedAtUtc = @SignedAtUtc,
        SealState = N'pendiente',
        SealedAtUtc = NULL
    WHERE NoteId = @NoteId AND TenantId = @TenantId AND SignedAtUtc IS NULL;

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK;
        THROW 50425, N'La nota ya está firmada (inmutable).', 1;
    END

    COMMIT;

    EXEC dbo.sp_ClinicalNote_GetById @TenantId = @TenantId, @NoteId = @NoteId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_Seal
    @TenantId       UNIQUEIDENTIFIER,
    @NoteId         UNIQUEIDENTIFIER,
    @SealedAtUtc    DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50402, N'Nota no encontrada.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND SignedAtUtc IS NOT NULL
    )
        THROW 50430, N'Sólo se sella una nota firmada.', 1;

    BEGIN TRAN;

    UPDATE dbo.ClinicalNote
    SET SealedAtUtc = @SealedAtUtc,
        SealState = N'sellado'
    WHERE NoteId = @NoteId
      AND TenantId = @TenantId
      AND SignedAtUtc IS NOT NULL
      AND SealState = N'pendiente';

    COMMIT;

    EXEC dbo.sp_ClinicalNote_GetById @TenantId = @TenantId, @NoteId = @NoteId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_AddAddendum
    @AddendumId             UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @NoteId                 UNIQUEIDENTIFIER,
    @ReasonText             NVARCHAR(2000),
    @BodyJson               NVARCHAR(MAX) = NULL,
    @ActorUserId            UNIQUEIDENTIFIER,
    @ActorProfessionalId    UNIQUEIDENTIFIER = NULL,
    @ActorDisplayName       NVARCHAR(200),
    @OccurredAtUtc          DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISNULL(LTRIM(RTRIM(@ReasonText)), N'') = N''
        THROW 50440, N'ReasonText del addendum es obligatorio.', 1;

    IF ISNULL(LTRIM(RTRIM(@ActorDisplayName)), N'') = N''
        THROW 50412, N'ActorDisplayName es obligatorio.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50402, N'Nota no encontrada.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND SignedAtUtc IS NOT NULL
    )
        THROW 50441, N'Sólo se agrega addendum a una nota firmada.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.ClinicalNoteAddendum (
        AddendumId, TenantId, NoteId, ReasonText, BodyJson,
        ActorUserId, ActorProfessionalId, ActorDisplayName, OccurredAtUtc, RecordedAtUtc
    )
    VALUES (
        @AddendumId, @TenantId, @NoteId, LTRIM(RTRIM(@ReasonText)), @BodyJson,
        @ActorUserId, @ActorProfessionalId, LTRIM(RTRIM(@ActorDisplayName)),
        @OccurredAtUtc, SYSUTCDATETIME()
    );

    COMMIT;

    SELECT
        a.AddendumId, a.TenantId, a.NoteId, a.ReasonText, a.BodyJson,
        a.ActorUserId, a.ActorProfessionalId, a.ActorDisplayName,
        a.OccurredAtUtc, a.RecordedAtUtc
    FROM dbo.ClinicalNoteAddendum a
    WHERE a.AddendumId = @AddendumId AND a.TenantId = @TenantId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_AddCoAuthor
    @CoAuthorId             UNIQUEIDENTIFIER,
    @TenantId               UNIQUEIDENTIFIER,
    @NoteId                 UNIQUEIDENTIFIER,
    @ProfessionalId         UNIQUEIDENTIFIER,
    @AddedByUserId          UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ClinicalNote
        WHERE NoteId = @NoteId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50402, N'Nota no encontrada.', 1;

    DECLARE @FullName NVARCHAR(200);
    DECLARE @License NVARCHAR(64);

    SELECT @FullName = hp.FullName, @License = hp.ProfessionalLicense
    FROM dbo.HealthcareProfessional hp
    WHERE hp.HealthcareProfessionalId = @ProfessionalId
      AND hp.TenantId = @TenantId
      AND hp.IsDeleted = 0
      AND hp.IsActive = 1;

    IF @FullName IS NULL
        THROW 50450, N'Profesional co-autor no encontrado o inactivo.', 1;

    IF ISNULL(LTRIM(RTRIM(@License)), N'') = N''
        THROW 50451, N'Co-autor sin cédula capturada (fail closed).', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.ClinicalNoteCoAuthor
        WHERE TenantId = @TenantId AND NoteId = @NoteId AND ProfessionalId = @ProfessionalId
    )
        THROW 50452, N'El profesional ya es co-autor de esta nota.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.ClinicalNoteCoAuthor (
        CoAuthorId, TenantId, NoteId, ProfessionalId,
        ProfessionalLicenseSnapshot, FullNameSnapshot, AddedByUserId, AddedAtUtc
    )
    VALUES (
        @CoAuthorId, @TenantId, @NoteId, @ProfessionalId,
        @License, @FullName, @AddedByUserId, SYSUTCDATETIME()
    );

    COMMIT;

    EXEC dbo.sp_ClinicalNote_GetById @TenantId = @TenantId, @NoteId = @NoteId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_GetById
    @TenantId   UNIQUEIDENTIFIER,
    @NoteId     UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        n.NoteId, n.TenantId, n.EncounterId, n.SubjectId, n.NoteType,
        n.BodyJson, n.Prognosis,
        n.AuthorProfessionalId, n.AuthorUserId, n.AuthorDisplayName,
        n.AuthorLicenseSnapshot, n.FacilitySnapshotJson,
        n.ContentHash, n.SignedAtUtc, n.SealedAtUtc, n.SealState,
        n.OccurredAtUtc, n.RecordedAtUtc
    FROM dbo.ClinicalNote n
    WHERE n.NoteId = @NoteId AND n.TenantId = @TenantId AND n.IsDeleted = 0;

    SELECT
        a.AddendumId, a.TenantId, a.NoteId, a.ReasonText, a.BodyJson,
        a.ActorUserId, a.ActorProfessionalId, a.ActorDisplayName,
        a.OccurredAtUtc, a.RecordedAtUtc
    FROM dbo.ClinicalNoteAddendum a
    WHERE a.NoteId = @NoteId AND a.TenantId = @TenantId
    ORDER BY a.OccurredAtUtc, a.RecordedAtUtc;

    SELECT
        c.CoAuthorId, c.TenantId, c.NoteId, c.ProfessionalId,
        c.ProfessionalLicenseSnapshot, c.FullNameSnapshot,
        c.AddedByUserId, c.AddedAtUtc
    FROM dbo.ClinicalNoteCoAuthor c
    WHERE c.NoteId = @NoteId AND c.TenantId = @TenantId
    ORDER BY c.AddedAtUtc;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_ListByEncounter
    @TenantId       UNIQUEIDENTIFIER,
    @EncounterId    UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Encounter
        WHERE EncounterId = @EncounterId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50401, N'Episodio no encontrado.', 1;

    SELECT
        n.NoteId, n.TenantId, n.EncounterId, n.SubjectId, n.NoteType,
        n.BodyJson, n.Prognosis,
        n.AuthorProfessionalId, n.AuthorUserId, n.AuthorDisplayName,
        n.AuthorLicenseSnapshot, n.FacilitySnapshotJson,
        n.ContentHash, n.SignedAtUtc, n.SealedAtUtc, n.SealState,
        n.OccurredAtUtc, n.RecordedAtUtc
    FROM dbo.ClinicalNote n
    WHERE n.TenantId = @TenantId
      AND n.EncounterId = @EncounterId
      AND n.IsDeleted = 0
    ORDER BY n.OccurredAtUtc DESC, n.RecordedAtUtc DESC;
END
GO

-- Nota de evolución vencida en observación (NOM-027 6.2.2 — umbral en horas, default 8).
-- También debe poder calcularse en cliente sin enlace; este SP es la verdad online.
CREATE OR ALTER PROCEDURE dbo.sp_ClinicalNote_ListPendingEvolution
    @TenantId           UNIQUEIDENTIFIER,
    @BranchId           UNIQUEIDENTIFIER,
    @HoursThreshold     INT = 8
AS
BEGIN
    SET NOCOUNT ON;

    IF @HoursThreshold IS NULL OR @HoursThreshold < 1
        SET @HoursThreshold = 8;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Branch
        WHERE BranchId = @BranchId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50403, N'Sucursal no encontrada.', 1;

    ;WITH LastEvol AS (
        SELECT
            n.EncounterId,
            MAX(ISNULL(n.SignedAtUtc, n.OccurredAtUtc)) AS LastEvolUtc
        FROM dbo.ClinicalNote n
        INNER JOIN dbo.Encounter e
            ON e.EncounterId = n.EncounterId AND e.TenantId = n.TenantId AND e.IsDeleted = 0
        WHERE n.TenantId = @TenantId
          AND e.BranchId = @BranchId
          AND e.State = N'en_observacion'
          AND n.NoteType = N'evolucion'
          AND n.IsDeleted = 0
          AND n.SignedAtUtc IS NOT NULL
        GROUP BY n.EncounterId
    )
    SELECT
        e.EncounterId,
        e.SubjectId,
        e.BranchId,
        e.TurnNumber,
        e.State AS EncounterState,
        le.LastEvolUtc,
        DATEADD(HOUR, @HoursThreshold, le.LastEvolUtc) AS DueAtUtc,
        @HoursThreshold AS HoursThreshold
    FROM dbo.Encounter e
    INNER JOIN LastEvol le ON le.EncounterId = e.EncounterId
    WHERE e.TenantId = @TenantId
      AND e.BranchId = @BranchId
      AND e.State = N'en_observacion'
      AND e.IsDeleted = 0
      AND DATEADD(HOUR, @HoursThreshold, le.LastEvolUtc) < SYSUTCDATETIME()
    ORDER BY le.LastEvolUtc;
END
GO

PRINT 'sp_ClinicalNote OK';
GO
