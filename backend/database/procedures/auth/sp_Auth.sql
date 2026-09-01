USE [$(DbName)];
GO

-- El profesional sanitario se resuelve en el mismo viaje que el usuario para que la
-- sesión lo traiga desde el servidor. Cuando el usuario no tiene profesional vigente
-- asociado, las tres columnas vienen NULL: eso significa «no hay profesional», y el
-- filtro clínico que dependa de ello debe fallar cerrado, no dejar pasar todo.
-- La liga es 0..1 por el índice único filtrado de 0003, así que el LEFT JOIN no
-- multiplica filas.

CREATE OR ALTER PROCEDURE dbo.sp_Auth_GetUserForLogin
    @TenantCode NVARCHAR(64),
    @UserName   NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        u.UserId,
        u.TenantId,
        u.UserName,
        u.DisplayName,
        u.PasswordHash,
        u.IsActive,
        u.IsSuperAdmin,
        u.FailedLoginCount,
        u.LockoutUntilUtc,
        RoleCodesCsv = STRING_AGG(r.Code, N','),
        BranchIdsCsv = (
            SELECT STRING_AGG(CONVERT(NVARCHAR(36), ub.BranchId), N',')
            FROM dbo.UserBranch ub
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId
        ),
        BranchCodesCsv = (
            SELECT STRING_AGG(b.Code, N',')
            FROM dbo.UserBranch ub
            INNER JOIN dbo.Branch b ON b.BranchId = ub.BranchId AND b.IsDeleted = 0 AND b.IsActive = 1
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId
        ),
        hp.HealthcareProfessionalId,
        ProfessionalLicense = hp.ProfessionalLicense,
        SpecialtyName = sp.Name
    FROM dbo.[User] u
    INNER JOIN dbo.Tenant t ON t.TenantId = u.TenantId AND t.IsDeleted = 0 AND t.IsActive = 1
    LEFT JOIN dbo.UserRole ur ON ur.UserId = u.UserId AND ur.TenantId = u.TenantId
    LEFT JOIN dbo.Role r ON r.RoleId = ur.RoleId AND r.TenantId = u.TenantId
    LEFT JOIN dbo.HealthcareProfessional hp
        ON hp.UserId = u.UserId AND hp.TenantId = u.TenantId AND hp.IsDeleted = 0 AND hp.IsActive = 1
    LEFT JOIN dbo.Specialty sp
        ON sp.SpecialtyId = hp.SpecialtyId AND sp.TenantId = hp.TenantId AND sp.IsDeleted = 0
    WHERE t.Code = @TenantCode
      AND u.UserName = @UserName
      AND u.IsDeleted = 0
    GROUP BY
        u.UserId, u.TenantId, u.UserName, u.DisplayName, u.PasswordHash,
        u.IsActive, u.IsSuperAdmin, u.FailedLoginCount, u.LockoutUntilUtc,
        hp.HealthcareProfessionalId, hp.ProfessionalLicense, sp.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_GetUserById
    @TenantId UNIQUEIDENTIFIER,
    @UserId   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        u.UserId,
        u.TenantId,
        u.UserName,
        u.DisplayName,
        u.PasswordHash,
        u.IsActive,
        u.IsSuperAdmin,
        u.FailedLoginCount,
        u.LockoutUntilUtc,
        RoleCodesCsv = STRING_AGG(r.Code, N','),
        BranchIdsCsv = (
            SELECT STRING_AGG(CONVERT(NVARCHAR(36), ub.BranchId), N',')
            FROM dbo.UserBranch ub
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId
        ),
        BranchCodesCsv = (
            SELECT STRING_AGG(b.Code, N',')
            FROM dbo.UserBranch ub
            INNER JOIN dbo.Branch b ON b.BranchId = ub.BranchId AND b.IsDeleted = 0 AND b.IsActive = 1
            WHERE ub.UserId = u.UserId AND ub.TenantId = u.TenantId
        ),
        hp.HealthcareProfessionalId,
        ProfessionalLicense = hp.ProfessionalLicense,
        SpecialtyName = sp.Name
    FROM dbo.[User] u
    LEFT JOIN dbo.UserRole ur ON ur.UserId = u.UserId AND ur.TenantId = u.TenantId
    LEFT JOIN dbo.Role r ON r.RoleId = ur.RoleId AND r.TenantId = u.TenantId
    LEFT JOIN dbo.HealthcareProfessional hp
        ON hp.UserId = u.UserId AND hp.TenantId = u.TenantId AND hp.IsDeleted = 0 AND hp.IsActive = 1
    LEFT JOIN dbo.Specialty sp
        ON sp.SpecialtyId = hp.SpecialtyId AND sp.TenantId = hp.TenantId AND sp.IsDeleted = 0
    WHERE u.TenantId = @TenantId
      AND u.UserId = @UserId
      AND u.IsDeleted = 0
    GROUP BY
        u.UserId, u.TenantId, u.UserName, u.DisplayName, u.PasswordHash,
        u.IsActive, u.IsSuperAdmin, u.FailedLoginCount, u.LockoutUntilUtc,
        hp.HealthcareProfessionalId, hp.ProfessionalLicense, sp.Name;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_UpdateLoginFailure
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @FailedLoginCount INT,
    @LockoutUntilUtc DATETIME2(3) NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.[User]
    SET FailedLoginCount = @FailedLoginCount,
        LockoutUntilUtc = @LockoutUntilUtc
    WHERE TenantId = @TenantId AND UserId = @UserId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_ResetLoginFailure
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.[User]
    SET FailedLoginCount = 0,
        LockoutUntilUtc = NULL
    WHERE TenantId = @TenantId AND UserId = @UserId;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_SaveRefreshToken
    @RefreshTokenId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @TokenHash NVARCHAR(128),
    @ExpiresAtUtc DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.RefreshToken (RefreshTokenId, TenantId, UserId, TokenHash, ExpiresAtUtc)
    VALUES (@RefreshTokenId, @TenantId, @UserId, @TokenHash, @ExpiresAtUtc);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_GetRefreshToken
    @TokenHash NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RefreshTokenId, UserId, TenantId, TokenHash, ExpiresAtUtc, RevokedAtUtc
    FROM dbo.RefreshToken
    WHERE TokenHash = @TokenHash;
END
GO

-- Revoca UNA sesión: la del refresh token presentado. Filtra por tenant y usuario
-- para que un token de otro tenant nunca se pueda revocar con claims ajenos.
-- Devuelve el número de filas revocadas: 0 significa que no había sesión vigente.
CREATE OR ALTER PROCEDURE dbo.sp_Auth_RevokeRefreshToken
    @RefreshTokenId UNIQUEIDENTIFIER,
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.RefreshToken
    SET RevokedAtUtc = SYSUTCDATETIME()
    WHERE RefreshTokenId = @RefreshTokenId
      AND TenantId = @TenantId
      AND UserId = @UserId
      AND RevokedAtUtc IS NULL;

    SELECT Revoked = @@ROWCOUNT;
END
GO

-- Cierre global de sesiones del usuario. NO lo usa el logout ordinario (decisión 73:
-- logout cierra sólo la sesión actual). Política doc 06 §75 (2026-08-30, opción A):
-- invocar al implementar (1) cambio de contraseña, (2) bloqueo/baja admin IsActive=false,
-- (3) botón autogestión «cerrar en todos mis dispositivos». NO invocar en lockout por
-- intentos fallidos. Endpoints aún no existen; el SP se conserva para esos flujos.
CREATE OR ALTER PROCEDURE dbo.sp_Auth_RevokeAllRefreshTokensForUser
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.RefreshToken
    SET RevokedAtUtc = SYSUTCDATETIME()
    WHERE TenantId = @TenantId AND UserId = @UserId AND RevokedAtUtc IS NULL;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Auth_UserExistsInTenant
    @TenantId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM dbo.[User]
        WHERE TenantId = @TenantId AND UserId = @UserId
    ) THEN 1 ELSE 0 END AS BIT) AS [Exists];
END
GO
