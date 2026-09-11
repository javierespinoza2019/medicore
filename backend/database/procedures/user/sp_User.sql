-- CRUD admin de usuarios de tenant. Baja lógica; sin DELETE/DROP/TRUNCATE.
-- Códigos THROW 503xx (no colisionan con agenda 502xx ni sujeto 501xx).
USE [$(DbName)];
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_List
    @TenantId   UNIQUEIDENTIFIER,
    @OnlyActive BIT = 0,
    @Search     NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @q NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Search)), N'');

    SELECT
        u.UserId,
        u.TenantId,
        u.UserName,
        u.DisplayName,
        u.IsActive,
        u.IsSuperAdmin,
        u.LockoutUntilUtc,
        IsLockedOut = CASE
            WHEN u.LockoutUntilUtc IS NOT NULL AND u.LockoutUntilUtc > SYSUTCDATETIME()
            THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT)
        END,
        u.CreatedAtUtc,
        u.UpdatedAtUtc,
        LastAccessUtc = (
            SELECT MAX(rt.CreatedAtUtc)
            FROM dbo.RefreshToken rt
            WHERE rt.TenantId = u.TenantId AND rt.UserId = u.UserId
        ),
        RoleCodesCsv = STRING_AGG(CASE WHEN ur.IsDeleted = 0 THEN r.Code END, N',')
            WITHIN GROUP (ORDER BY r.Code),
        BranchIdsCsv = (
            SELECT STRING_AGG(CONVERT(NVARCHAR(36), ub.BranchId), N',')
                WITHIN GROUP (ORDER BY b.Name)
            FROM dbo.UserBranch ub
            INNER JOIN dbo.Branch b
                ON b.BranchId = ub.BranchId AND b.TenantId = ub.TenantId
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId AND ub.IsDeleted = 0
        ),
        HealthcareProfessionalId = hp.HealthcareProfessionalId,
        ProfessionalDisplayName = hp.FullName,
        ProfessionalLicense = hp.ProfessionalLicense,
        SpecialtyName = sp.Name
    FROM dbo.[User] u
    LEFT JOIN dbo.UserRole ur
        ON ur.UserId = u.UserId AND ur.TenantId = u.TenantId AND ur.IsDeleted = 0
    LEFT JOIN dbo.Role r
        ON r.RoleId = ur.RoleId AND r.TenantId = u.TenantId
    LEFT JOIN dbo.HealthcareProfessional hp
        ON hp.UserId = u.UserId AND hp.TenantId = u.TenantId AND hp.IsDeleted = 0 AND hp.IsActive = 1
    LEFT JOIN dbo.Specialty sp
        ON sp.SpecialtyId = hp.SpecialtyId AND sp.TenantId = u.TenantId AND sp.IsDeleted = 0
    WHERE u.TenantId = @TenantId
      AND u.IsDeleted = 0
      AND (@OnlyActive = 0 OR u.IsActive = 1)
      AND (
            @q IS NULL
            OR u.UserName LIKE N'%' + @q + N'%'
            OR u.DisplayName LIKE N'%' + @q + N'%'
          )
    GROUP BY
        u.UserId, u.TenantId, u.UserName, u.DisplayName, u.IsActive, u.IsSuperAdmin,
        u.LockoutUntilUtc, u.CreatedAtUtc, u.UpdatedAtUtc,
        hp.HealthcareProfessionalId, hp.FullName, hp.ProfessionalLicense, sp.Name
    ORDER BY u.DisplayName;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_GetById
    @TenantId UNIQUEIDENTIFIER,
    @UserId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.UserId,
        u.TenantId,
        u.UserName,
        u.DisplayName,
        u.IsActive,
        u.IsSuperAdmin,
        u.LockoutUntilUtc,
        IsLockedOut = CASE
            WHEN u.LockoutUntilUtc IS NOT NULL AND u.LockoutUntilUtc > SYSUTCDATETIME()
            THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT)
        END,
        u.CreatedAtUtc,
        u.UpdatedAtUtc,
        LastAccessUtc = (
            SELECT MAX(rt.CreatedAtUtc)
            FROM dbo.RefreshToken rt
            WHERE rt.TenantId = u.TenantId AND rt.UserId = u.UserId
        ),
        RoleCodesCsv = STRING_AGG(CASE WHEN ur.IsDeleted = 0 THEN r.Code END, N',')
            WITHIN GROUP (ORDER BY r.Code),
        BranchIdsCsv = (
            SELECT STRING_AGG(CONVERT(NVARCHAR(36), ub.BranchId), N',')
                WITHIN GROUP (ORDER BY b.Name)
            FROM dbo.UserBranch ub
            INNER JOIN dbo.Branch b
                ON b.BranchId = ub.BranchId AND b.TenantId = ub.TenantId
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId AND ub.IsDeleted = 0
        ),
        HealthcareProfessionalId = hp.HealthcareProfessionalId,
        ProfessionalDisplayName = hp.FullName,
        ProfessionalLicense = hp.ProfessionalLicense,
        SpecialtyName = sp.Name
    FROM dbo.[User] u
    LEFT JOIN dbo.UserRole ur
        ON ur.UserId = u.UserId AND ur.TenantId = u.TenantId AND ur.IsDeleted = 0
    LEFT JOIN dbo.Role r
        ON r.RoleId = ur.RoleId AND r.TenantId = u.TenantId
    LEFT JOIN dbo.HealthcareProfessional hp
        ON hp.UserId = u.UserId AND hp.TenantId = u.TenantId AND hp.IsDeleted = 0 AND hp.IsActive = 1
    LEFT JOIN dbo.Specialty sp
        ON sp.SpecialtyId = hp.SpecialtyId AND sp.TenantId = u.TenantId AND sp.IsDeleted = 0
    WHERE u.TenantId = @TenantId
      AND u.UserId = @UserId
      AND u.IsDeleted = 0
    GROUP BY
        u.UserId, u.TenantId, u.UserName, u.DisplayName, u.IsActive, u.IsSuperAdmin,
        u.LockoutUntilUtc, u.CreatedAtUtc, u.UpdatedAtUtc,
        hp.HealthcareProfessionalId, hp.FullName, hp.ProfessionalLicense, sp.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Create
    @TenantId       UNIQUEIDENTIFIER,
    @UserId         UNIQUEIDENTIFIER,
    @UserName       NVARCHAR(128),
    @DisplayName    NVARCHAR(200),
    @PasswordHash   NVARCHAR(200),
    @IsActive       BIT,
    @RoleCodesCsv   NVARCHAR(MAX) = NULL,
    @BranchIdsCsv   NVARCHAR(MAX) = NULL,
    @ActorUserId    UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM dbo.[User]
        WHERE TenantId = @TenantId AND UserName = @UserName AND IsDeleted = 0
    )
    BEGIN
        THROW 50301, N'Ya existe un usuario con ese nombre de acceso en el tenant.', 1;
    END

    DECLARE @WantedRoles TABLE (Code NVARCHAR(64) NOT NULL PRIMARY KEY);
    IF NULLIF(LTRIM(RTRIM(@RoleCodesCsv)), N'') IS NOT NULL
    BEGIN
        INSERT INTO @WantedRoles (Code)
        SELECT DISTINCT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@RoleCodesCsv, N',')
        WHERE NULLIF(LTRIM(RTRIM(value)), N'') IS NOT NULL;
    END

    IF EXISTS (SELECT 1 FROM @WantedRoles WHERE Code = N'SuperAdmin')
    BEGIN
        THROW 50302, N'No se puede asignar el rol de plataforma SuperAdmin desde el admin de tenant.', 1;
    END

    IF EXISTS (
        SELECT 1 FROM @WantedRoles w
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Role r
            WHERE r.TenantId = @TenantId AND r.Code = w.Code
        )
    )
    BEGIN
        THROW 50303, N'Uno o más roles no existen en el tenant.', 1;
    END

    DECLARE @WantedBranches TABLE (BranchId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY);
    IF NULLIF(LTRIM(RTRIM(@BranchIdsCsv)), N'') IS NOT NULL
    BEGIN
        INSERT INTO @WantedBranches (BranchId)
        SELECT DISTINCT TRY_CONVERT(UNIQUEIDENTIFIER, LTRIM(RTRIM(value)))
        FROM STRING_SPLIT(@BranchIdsCsv, N',')
        WHERE TRY_CONVERT(UNIQUEIDENTIFIER, LTRIM(RTRIM(value))) IS NOT NULL;
    END

    IF EXISTS (
        SELECT 1 FROM @WantedBranches w
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Branch b
            WHERE b.TenantId = @TenantId AND b.BranchId = w.BranchId AND b.IsDeleted = 0
        )
    )
    BEGIN
        THROW 50304, N'Una o más sucursales no existen en el tenant o están dadas de baja.', 1;
    END

    BEGIN TRAN;

    INSERT INTO dbo.[User] (
        UserId, TenantId, UserName, DisplayName, PasswordHash,
        IsActive, IsSuperAdmin, IsDeleted
    )
    VALUES (
        @UserId, @TenantId, @UserName, @DisplayName, @PasswordHash,
        @IsActive, 0, 0
    );

    INSERT INTO dbo.UserRole (UserId, RoleId, TenantId, IsDeleted)
    SELECT @UserId, r.RoleId, @TenantId, 0
    FROM @WantedRoles w
    INNER JOIN dbo.Role r ON r.TenantId = @TenantId AND r.Code = w.Code;

    INSERT INTO dbo.UserBranch (UserId, BranchId, TenantId, IsDeleted)
    SELECT @UserId, w.BranchId, @TenantId, 0
    FROM @WantedBranches w;

    COMMIT TRAN;

    EXEC dbo.sp_User_GetById @TenantId = @TenantId, @UserId = @UserId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_Update
    @TenantId         UNIQUEIDENTIFIER,
    @UserId           UNIQUEIDENTIFIER,
    @DisplayName      NVARCHAR(200),
    @IsActive         BIT,
    @LockoutUntilUtc  DATETIME2(3) = NULL,
    @RoleCodesCsv     NVARCHAR(MAX) = NULL,
    @BranchIdsCsv     NVARCHAR(MAX) = NULL,
    @ActorUserId      UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.[User]
        WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0
    )
    BEGIN
        THROW 50310, N'Usuario no encontrado.', 1;
    END

    DECLARE @WantedRoles TABLE (Code NVARCHAR(64) NOT NULL PRIMARY KEY);
    IF NULLIF(LTRIM(RTRIM(@RoleCodesCsv)), N'') IS NOT NULL
    BEGIN
        INSERT INTO @WantedRoles (Code)
        SELECT DISTINCT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@RoleCodesCsv, N',')
        WHERE NULLIF(LTRIM(RTRIM(value)), N'') IS NOT NULL;
    END

    IF EXISTS (SELECT 1 FROM @WantedRoles WHERE Code = N'SuperAdmin')
    BEGIN
        THROW 50302, N'No se puede asignar el rol de plataforma SuperAdmin desde el admin de tenant.', 1;
    END

    IF EXISTS (
        SELECT 1 FROM @WantedRoles w
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Role r
            WHERE r.TenantId = @TenantId AND r.Code = w.Code
        )
    )
    BEGIN
        THROW 50303, N'Uno o más roles no existen en el tenant.', 1;
    END

    DECLARE @WantedBranches TABLE (BranchId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY);
    IF NULLIF(LTRIM(RTRIM(@BranchIdsCsv)), N'') IS NOT NULL
    BEGIN
        INSERT INTO @WantedBranches (BranchId)
        SELECT DISTINCT TRY_CONVERT(UNIQUEIDENTIFIER, LTRIM(RTRIM(value)))
        FROM STRING_SPLIT(@BranchIdsCsv, N',')
        WHERE TRY_CONVERT(UNIQUEIDENTIFIER, LTRIM(RTRIM(value))) IS NOT NULL;
    END

    IF EXISTS (
        SELECT 1 FROM @WantedBranches w
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.Branch b
            WHERE b.TenantId = @TenantId AND b.BranchId = w.BranchId AND b.IsDeleted = 0
        )
    )
    BEGIN
        THROW 50304, N'Una o más sucursales no existen en el tenant o están dadas de baja.', 1;
    END

    BEGIN TRAN;

    UPDATE dbo.[User]
    SET DisplayName = @DisplayName,
        IsActive = @IsActive,
        LockoutUntilUtc = @LockoutUntilUtc,
        FailedLoginCount = CASE WHEN @LockoutUntilUtc IS NULL THEN 0 ELSE FailedLoginCount END,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0;

    -- Roles: baja lógica de los que ya no aplican; reactivar/insertar deseados
    UPDATE ur
    SET IsDeleted = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    FROM dbo.UserRole ur
    INNER JOIN dbo.Role r ON r.RoleId = ur.RoleId AND r.TenantId = ur.TenantId
    WHERE ur.TenantId = @TenantId
      AND ur.UserId = @UserId
      AND ur.IsDeleted = 0
      AND NOT EXISTS (SELECT 1 FROM @WantedRoles w WHERE w.Code = r.Code);

    MERGE dbo.UserRole AS t
    USING (
        SELECT r.RoleId
        FROM @WantedRoles w
        INNER JOIN dbo.Role r ON r.TenantId = @TenantId AND r.Code = w.Code
    ) AS s
    ON t.TenantId = @TenantId AND t.UserId = @UserId AND t.RoleId = s.RoleId
    WHEN MATCHED THEN
        UPDATE SET IsDeleted = 0, UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (UserId, RoleId, TenantId, IsDeleted)
        VALUES (@UserId, s.RoleId, @TenantId, 0);

    UPDATE ub
    SET IsDeleted = 1,
        UpdatedAtUtc = SYSUTCDATETIME()
    FROM dbo.UserBranch ub
    WHERE ub.TenantId = @TenantId
      AND ub.UserId = @UserId
      AND ub.IsDeleted = 0
      AND NOT EXISTS (SELECT 1 FROM @WantedBranches w WHERE w.BranchId = ub.BranchId);

    MERGE dbo.UserBranch AS t
    USING (SELECT BranchId FROM @WantedBranches) AS s
    ON t.TenantId = @TenantId AND t.UserId = @UserId AND t.BranchId = s.BranchId
    WHEN MATCHED THEN
        UPDATE SET IsDeleted = 0, UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (UserId, BranchId, TenantId, IsDeleted)
        VALUES (@UserId, s.BranchId, @TenantId, 0);

    COMMIT TRAN;

    EXEC dbo.sp_User_GetById @TenantId = @TenantId, @UserId = @UserId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_SoftDelete
    @TenantId    UNIQUEIDENTIFIER,
    @UserId      UNIQUEIDENTIFIER,
    @ActorUserId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ActorUserId IS NOT NULL AND @ActorUserId = @UserId
    BEGIN
        THROW 50320, N'No puede darse de baja a sí mismo.', 1;
    END

    UPDATE dbo.[User]
    SET IsDeleted = 1,
        IsActive = 0,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 50310, N'Usuario no encontrado.', 1;
    END

    UPDATE dbo.UserRole
    SET IsDeleted = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0;

    UPDATE dbo.UserBranch
    SET IsDeleted = 1, UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND UserId = @UserId AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_User_SetPassword
    @TenantId     UNIQUEIDENTIFIER,
    @UserId       UNIQUEIDENTIFIER,
    @PasswordHash NVARCHAR(200),
    @ActorUserId  UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.[User]
    SET PasswordHash = @PasswordHash,
        FailedLoginCount = 0,
        LockoutUntilUtc = NULL,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId
      AND UserId = @UserId
      AND IsDeleted = 0
      AND IsActive = 1;

    IF @@ROWCOUNT = 0
    BEGIN
        THROW 50310, N'Usuario no encontrado o inactivo.', 1;
    END
END
GO
