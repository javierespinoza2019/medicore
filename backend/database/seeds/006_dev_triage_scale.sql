-- Seed sintético Dev: escala de triage para tenant demo.
-- ESQUEMA FICTICIO DE DEMO — no es Manchester, ESI ni norma mexicana.
-- El responsable sanitario de cada tenant define la escala real vía API.
-- Producto sin escala fija hardcodeada (ratificado 2026-08-27; plantilla demo
-- de 5 niveles confirmada doc 06 §63, 2026-08-30).
USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @ConfigId UNIQUEIDENTIFIER = '88888888-8888-8888-8888-888888888801';
DECLARE @ActorUserId UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';

-- Escala sintética de 5 niveles. Códigos sin semántica de color de producto.
-- priority: menor número = mayor urgencia (cola: sin clasificar = 0 arriba).
DECLARE @LevelsJson NVARCHAR(MAX) = N'{
  "levels": [
    { "code": "prioridad_1", "label": "Atención inmediata", "priority": 1, "icon": "ri-flashlight-line", "sortHint": "1" },
    { "code": "prioridad_2", "label": "Muy urgente", "priority": 2, "icon": "ri-alarm-warning-line", "sortHint": "2" },
    { "code": "prioridad_3", "label": "Urgente", "priority": 3, "icon": "ri-error-warning-line", "sortHint": "3" },
    { "code": "prioridad_4", "label": "Menos urgente", "priority": 4, "icon": "ri-time-line", "sortHint": "4" },
    { "code": "prioridad_5", "label": "No urgente", "priority": 5, "icon": "ri-check-line", "sortHint": "5" }
  ],
  "note": "Escala sintética de desarrollo; no es convención oficial ni escala prescrita por norma mexicana."
}';

IF EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId AND IsDeleted = 0)
   AND OBJECT_ID(N'dbo.TriageScaleConfig', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.TriageScaleConfig
        WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1
    )
    BEGIN
        INSERT INTO dbo.TriageScaleConfig (
            ConfigId, TenantId, BranchId, ScaleCode, DisplayName, LevelsJson, IsActive, UpdatedByUserId
        )
        VALUES (
            @ConfigId, @TenantId, NULL,
            N'escala_sintetica_demo_v1',
            N'Escala sintética demo (5 niveles)',
            @LevelsJson,
            1,
            @ActorUserId
        );
        PRINT 'seed-triage-scale OK — escala sintética tenant demo (escala_sintetica_demo_v1).';
    END
    ELSE
        PRINT 'seed-triage-scale — config tenant demo ya existe; sin cambios.';
END
ELSE
    PRINT 'seed-triage-scale — omitido (tenant demo o tabla ausente).';
GO
