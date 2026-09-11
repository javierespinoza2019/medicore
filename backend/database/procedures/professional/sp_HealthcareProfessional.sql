-- sp_HealthcareProfessional.sql — profesional sanitario (M1).
-- Lectura + administración (Create/Update/SoftDelete/List). Todo filtra por @TenantId.
-- Sin DELETE físico. CREATE OR ALTER (nunca DROP PROCEDURE).
-- Enriquecimiento UI admin (Readdy): correo de cuenta ligada + sucursal/consultorio vía CRP.

USE [$(DbName)];
GO

-- Columnas compartidas de lectura (list/get/create/update).
-- LinkedUserName = UserName de la cuenta (correo/acceso); NULL si no hay liga.
-- Primary* = primer consultorio activo asignado (orden CreatedAtUtc).
-- BranchNames / RoomLabels = agregados de todas las asignaciones vigentes.

-- Profesional vigente ligado a un usuario. Cero filas = «no hay profesional» (válido).
CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_GetByUser
    @TenantId UNIQUEIDENTIFIER,
    @UserId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    WHERE hp.TenantId = @TenantId
      AND hp.UserId = @UserId
      AND hp.IsDeleted = 0
      AND hp.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_GetById
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc,
        LinkedUserName = u.UserName,
        LinkedUserDisplayName = u.DisplayName,
        PrimaryRoomId = primaryRoom.RoomId,
        PrimaryBranchId = primaryRoom.BranchId,
        PrimaryBranchName = primaryRoom.BranchName,
        PrimaryRoomLabel = primaryRoom.RoomLabel,
        BranchNames = branchAgg.BranchNames,
        RoomLabels = roomAgg.RoomLabels
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    LEFT JOIN dbo.[User] u
        ON u.UserId = hp.UserId AND u.TenantId = hp.TenantId AND u.IsDeleted = 0
    OUTER APPLY (
        SELECT TOP (1)
            crp.RoomId,
            r.BranchId,
            b.Name AS BranchName,
            RoomLabel = COALESCE(NULLIF(LTRIM(RTRIM(r.Name)), N''), r.Code)
        FROM dbo.ConsultingRoomProfessional crp
        INNER JOIN dbo.ConsultingRoom r
            ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
        INNER JOIN dbo.Branch b
            ON b.BranchId = r.BranchId AND b.TenantId = crp.TenantId AND b.IsDeleted = 0
        WHERE crp.TenantId = hp.TenantId
          AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
          AND crp.IsDeleted = 0
          AND crp.IsActive = 1
        ORDER BY crp.CreatedAtUtc
    ) primaryRoom
    -- STRING_AGG con ORDER BY distintos no puede ir en el mismo SELECT (SQL Msg 8711).
    OUTER APPLY (
        SELECT
            BranchNames = STRING_AGG(CAST(t.BranchName AS NVARCHAR(MAX)), N', ')
                WITHIN GROUP (ORDER BY t.BranchName)
        FROM (
            SELECT DISTINCT b.Name AS BranchName
            FROM dbo.ConsultingRoomProfessional crp
            INNER JOIN dbo.ConsultingRoom r
                ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
            INNER JOIN dbo.Branch b
                ON b.BranchId = r.BranchId AND b.TenantId = crp.TenantId AND b.IsDeleted = 0
            WHERE crp.TenantId = hp.TenantId
              AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
              AND crp.IsDeleted = 0
              AND crp.IsActive = 1
        ) t
    ) branchAgg
    OUTER APPLY (
        SELECT
            RoomLabels = STRING_AGG(CAST(t.RoomLabel AS NVARCHAR(MAX)), N', ')
                WITHIN GROUP (ORDER BY t.RoomLabel)
        FROM (
            SELECT DISTINCT
                RoomLabel = COALESCE(NULLIF(LTRIM(RTRIM(r.Name)), N''), r.Code)
            FROM dbo.ConsultingRoomProfessional crp
            INNER JOIN dbo.ConsultingRoom r
                ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
            WHERE crp.TenantId = hp.TenantId
              AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
              AND crp.IsDeleted = 0
              AND crp.IsActive = 1
        ) t
    ) roomAgg
    WHERE hp.TenantId = @TenantId
      AND hp.HealthcareProfessionalId = @HealthcareProfessionalId
      AND hp.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_List
    @TenantId   UNIQUEIDENTIFIER,
    @OnlyActive BIT = 1,
    @Search     NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Q NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Search)), N'');

    SELECT
        hp.HealthcareProfessionalId,
        hp.TenantId,
        hp.UserId,
        hp.FullName,
        hp.ProfessionalLicense,
        hp.SpecialtyId,
        SpecialtyName = s.Name,
        hp.IsActive,
        hp.CreatedAtUtc,
        hp.UpdatedAtUtc,
        LinkedUserName = u.UserName,
        LinkedUserDisplayName = u.DisplayName,
        PrimaryRoomId = primaryRoom.RoomId,
        PrimaryBranchId = primaryRoom.BranchId,
        PrimaryBranchName = primaryRoom.BranchName,
        PrimaryRoomLabel = primaryRoom.RoomLabel,
        BranchNames = branchAgg.BranchNames,
        RoomLabels = roomAgg.RoomLabels
    FROM dbo.HealthcareProfessional hp
    LEFT JOIN dbo.Specialty s
        ON s.SpecialtyId = hp.SpecialtyId AND s.TenantId = hp.TenantId AND s.IsDeleted = 0
    LEFT JOIN dbo.[User] u
        ON u.UserId = hp.UserId AND u.TenantId = hp.TenantId AND u.IsDeleted = 0
    OUTER APPLY (
        SELECT TOP (1)
            crp.RoomId,
            r.BranchId,
            b.Name AS BranchName,
            RoomLabel = COALESCE(NULLIF(LTRIM(RTRIM(r.Name)), N''), r.Code)
        FROM dbo.ConsultingRoomProfessional crp
        INNER JOIN dbo.ConsultingRoom r
            ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
        INNER JOIN dbo.Branch b
            ON b.BranchId = r.BranchId AND b.TenantId = crp.TenantId AND b.IsDeleted = 0
        WHERE crp.TenantId = hp.TenantId
          AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
          AND crp.IsDeleted = 0
          AND crp.IsActive = 1
        ORDER BY crp.CreatedAtUtc
    ) primaryRoom
    OUTER APPLY (
        SELECT
            BranchNames = STRING_AGG(CAST(t.BranchName AS NVARCHAR(MAX)), N', ')
                WITHIN GROUP (ORDER BY t.BranchName)
        FROM (
            SELECT DISTINCT b.Name AS BranchName
            FROM dbo.ConsultingRoomProfessional crp
            INNER JOIN dbo.ConsultingRoom r
                ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
            INNER JOIN dbo.Branch b
                ON b.BranchId = r.BranchId AND b.TenantId = crp.TenantId AND b.IsDeleted = 0
            WHERE crp.TenantId = hp.TenantId
              AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
              AND crp.IsDeleted = 0
              AND crp.IsActive = 1
        ) t
    ) branchAgg
    OUTER APPLY (
        SELECT
            RoomLabels = STRING_AGG(CAST(t.RoomLabel AS NVARCHAR(MAX)), N', ')
                WITHIN GROUP (ORDER BY t.RoomLabel)
        FROM (
            SELECT DISTINCT
                RoomLabel = COALESCE(NULLIF(LTRIM(RTRIM(r.Name)), N''), r.Code)
            FROM dbo.ConsultingRoomProfessional crp
            INNER JOIN dbo.ConsultingRoom r
                ON r.RoomId = crp.RoomId AND r.TenantId = crp.TenantId AND r.IsDeleted = 0
            WHERE crp.TenantId = hp.TenantId
              AND crp.HealthcareProfessionalId = hp.HealthcareProfessionalId
              AND crp.IsDeleted = 0
              AND crp.IsActive = 1
        ) t
    ) roomAgg
    WHERE hp.TenantId = @TenantId
      AND hp.IsDeleted = 0
      AND (@OnlyActive = 0 OR hp.IsActive = 1)
      AND (
            @Q IS NULL
            OR hp.FullName LIKE N'%' + @Q + N'%'
            OR hp.ProfessionalLicense LIKE N'%' + @Q + N'%'
            OR s.Name LIKE N'%' + @Q + N'%'
            OR u.UserName LIKE N'%' + @Q + N'%'
            OR branchAgg.BranchNames LIKE N'%' + @Q + N'%'
            OR roomAgg.RoomLabels LIKE N'%' + @Q + N'%'
          )
    ORDER BY hp.FullName;
END
GO

-- Sincroniza ConsultingRoomProfessional al modelo del prototipo (1 consultorio principal).
-- @ClearRoomAssignments=1 → baja lógica de todas las ligas del profesional.
-- @RoomId con valor → deja solo ese consultorio (reactiva o inserta; baja el resto).
-- Ambos NULL/0 → no toca asignaciones.
CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_SyncPrimaryRoom
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @RoomId                   UNIQUEIDENTIFIER = NULL,
    @ClearRoomAssignments     BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @ClearRoomAssignments = 1
    BEGIN
        UPDATE dbo.ConsultingRoomProfessional
        SET IsDeleted = 1,
            IsActive = 0,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId
          AND HealthcareProfessionalId = @HealthcareProfessionalId
          AND IsDeleted = 0;
        RETURN;
    END

    IF @RoomId IS NULL
        RETURN;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.ConsultingRoom
        WHERE RoomId = @RoomId AND TenantId = @TenantId AND IsDeleted = 0
    )
        THROW 50035, N'El consultorio no existe en el tenant o está dado de baja.', 1;

    UPDATE dbo.ConsultingRoomProfessional
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND HealthcareProfessionalId = @HealthcareProfessionalId
      AND IsDeleted = 0
      AND RoomId <> @RoomId;

    IF EXISTS (
        SELECT 1 FROM dbo.ConsultingRoomProfessional
        WHERE TenantId = @TenantId
          AND HealthcareProfessionalId = @HealthcareProfessionalId
          AND RoomId = @RoomId
    )
    BEGIN
        UPDATE dbo.ConsultingRoomProfessional
        SET IsDeleted = 0,
            IsActive = 1,
            UpdatedAtUtc = SYSUTCDATETIME()
        WHERE TenantId = @TenantId
          AND HealthcareProfessionalId = @HealthcareProfessionalId
          AND RoomId = @RoomId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.ConsultingRoomProfessional (
            TenantId, RoomId, HealthcareProfessionalId, IsActive, IsDeleted
        )
        VALUES (@TenantId, @RoomId, @HealthcareProfessionalId, 1, 0);
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_Create
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @UserId                   UNIQUEIDENTIFIER = NULL,
    @FullName                 NVARCHAR(200),
    @ProfessionalLicense      NVARCHAR(64) = NULL,
    @SpecialtyId              UNIQUEIDENTIFIER = NULL,
    @IsActive                 BIT = 1,
    @RoomId                   UNIQUEIDENTIFIER = NULL,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @FullName IS NULL OR LTRIM(RTRIM(@FullName)) = N''
        THROW 50030, N'El nombre completo del profesional es obligatorio.', 1;

    IF @SpecialtyId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.Specialty
            WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50031, N'La especialidad no existe en el tenant.', 1;

    IF @UserId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserId = @UserId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50032, N'El usuario a ligar no existe en el tenant.', 1;

    IF @UserId IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0
       )
        THROW 50033, N'Ese usuario ya está ligado a otro profesional vigente.', 1;

    IF @ProfessionalLicense IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND ProfessionalLicense = @ProfessionalLicense
              AND IsDeleted = 0
       )
        THROW 50034, N'Ya existe un profesional con esa cédula en el tenant.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.HealthcareProfessional (
        HealthcareProfessionalId, TenantId, UserId, FullName,
        ProfessionalLicense, SpecialtyId, IsActive, IsDeleted,
        CreatedAtUtc, CreatedByUserId
    )
    VALUES (
        @HealthcareProfessionalId, @TenantId, @UserId, LTRIM(RTRIM(@FullName)),
        NULLIF(LTRIM(RTRIM(@ProfessionalLicense)), N''), @SpecialtyId, @IsActive, 0,
        SYSUTCDATETIME(), @ActorUserId
    );

    EXEC dbo.sp_HealthcareProfessional_SyncPrimaryRoom
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId,
        @RoomId = @RoomId,
        @ClearRoomAssignments = 0;

    COMMIT TRAN;

    EXEC dbo.sp_HealthcareProfessional_GetById
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_Update
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @UserId                   UNIQUEIDENTIFIER = NULL,
    @ClearUserId              BIT = 0,
    @FullName                 NVARCHAR(200),
    @ProfessionalLicense      NVARCHAR(64) = NULL,
    @ClearProfessionalLicense BIT = 0,
    @SpecialtyId              UNIQUEIDENTIFIER = NULL,
    @ClearSpecialtyId         BIT = 0,
    @IsActive                 BIT = 1,
    @RoomId                   UNIQUEIDENTIFIER = NULL,
    @ClearRoomAssignments     BIT = 0,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.HealthcareProfessional
        WHERE HealthcareProfessionalId = @HealthcareProfessionalId
          AND TenantId = @TenantId
          AND IsDeleted = 0
    )
        RETURN; -- 0 filas → el llamador responde 404

    IF @FullName IS NULL OR LTRIM(RTRIM(@FullName)) = N''
        THROW 50030, N'El nombre completo del profesional es obligatorio.', 1;

    IF @ClearSpecialtyId = 0 AND @SpecialtyId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.Specialty
            WHERE SpecialtyId = @SpecialtyId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50031, N'La especialidad no existe en el tenant.', 1;

    IF @ClearUserId = 0 AND @UserId IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.[User]
            WHERE UserId = @UserId AND TenantId = @TenantId AND IsDeleted = 0
       )
        THROW 50032, N'El usuario a ligar no existe en el tenant.', 1;

    IF @ClearUserId = 0 AND @UserId IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND UserId = @UserId
              AND IsDeleted = 0
              AND HealthcareProfessionalId <> @HealthcareProfessionalId
       )
        THROW 50033, N'Ese usuario ya está ligado a otro profesional vigente.', 1;

    DECLARE @License NVARCHAR(64) =
        CASE
            WHEN @ClearProfessionalLicense = 1 THEN NULL
            WHEN @ProfessionalLicense IS NULL THEN NULL
            ELSE NULLIF(LTRIM(RTRIM(@ProfessionalLicense)), N'')
        END;

    IF @ClearProfessionalLicense = 0 AND @ProfessionalLicense IS NOT NULL AND @License IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM dbo.HealthcareProfessional
            WHERE TenantId = @TenantId
              AND ProfessionalLicense = @License
              AND IsDeleted = 0
              AND HealthcareProfessionalId <> @HealthcareProfessionalId
       )
        THROW 50034, N'Ya existe un profesional con esa cédula en el tenant.', 1;

    BEGIN TRAN;

    UPDATE dbo.HealthcareProfessional
    SET
        UserId = CASE
            WHEN @ClearUserId = 1 THEN NULL
            WHEN @UserId IS NULL THEN UserId
            ELSE @UserId
        END,
        FullName = LTRIM(RTRIM(@FullName)),
        ProfessionalLicense = CASE
            WHEN @ClearProfessionalLicense = 1 THEN NULL
            WHEN @ProfessionalLicense IS NULL THEN ProfessionalLicense
            ELSE @License
        END,
        SpecialtyId = CASE
            WHEN @ClearSpecialtyId = 1 THEN NULL
            WHEN @SpecialtyId IS NULL THEN SpecialtyId
            ELSE @SpecialtyId
        END,
        IsActive = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME(),
        UpdatedByUserId = @ActorUserId
    WHERE HealthcareProfessionalId = @HealthcareProfessionalId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    EXEC dbo.sp_HealthcareProfessional_SyncPrimaryRoom
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId,
        @RoomId = @RoomId,
        @ClearRoomAssignments = @ClearRoomAssignments;

    COMMIT TRAN;

    EXEC dbo.sp_HealthcareProfessional_GetById
        @TenantId = @TenantId,
        @HealthcareProfessionalId = @HealthcareProfessionalId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_HealthcareProfessional_SoftDelete
    @TenantId                 UNIQUEIDENTIFIER,
    @HealthcareProfessionalId UNIQUEIDENTIFIER,
    @ActorUserId              UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    UPDATE dbo.ConsultingRoomProfessional
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND HealthcareProfessionalId = @HealthcareProfessionalId
      AND IsDeleted = 0;

    UPDATE dbo.HealthcareProfessional
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME(),
        UpdatedByUserId = @ActorUserId
    WHERE HealthcareProfessionalId = @HealthcareProfessionalId
      AND TenantId = @TenantId
      AND IsDeleted = 0;

    DECLARE @Rows INT = @@ROWCOUNT;
    COMMIT TRAN;

    SELECT @Rows AS RowsAffected;
END
GO
