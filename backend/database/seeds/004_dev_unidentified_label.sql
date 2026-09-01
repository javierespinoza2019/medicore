-- Seed sintético Dev: configuración de etiqueta de no identificado para tenant demo.
-- ESQUEMA FICTICIO DE DEMO — no es norma ni instrucción DGIS/NOM.
-- El responsable sanitario de cada tenant define el esquema real vía API/config.
-- Tokens de color (rojo, verde, etc.) están explícitamente excluidos (colisionan con triage).
USE [$(DbName)];
GO

DECLARE @TenantId UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @ConfigId UNIQUEIDENTIFIER = '66666666-6666-6666-6666-666666666601';
DECLARE @ActorUserId UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';

-- Alfabeto fonético sintético de demo (subconjunto). NO presentar como norma.
DECLARE @Params NVARCHAR(MAX) = N'{
  "schemeCode": "fonetico_sintetico_demo",
  "note": "Esquema sintético de desarrollo; no es convención oficial.",
  "tokenAlphabet": ["ALFA","BRAVO","CHARLIE","DELTA","ECO","FOXTROT","GOLF","HOTEL","INDIA","JULIET","KILO","LIMA","MIKE","NOVEMBER","OSCAR","PAPA","QUEBEC","ROMEO","SIERRA","TANGO","UNIFORM","VICTOR","WHISKEY","XRAY","YANKEE","ZULU"],
  "blockedTokens": ["ROJO","NARANJA","AMARILLO","VERDE","AZUL","MORADO","NEGRO","BLANCO","GRIS","ROSA"],
  "internalCodePattern": "NN-{branchCode}-{date:yyMMdd}-{token}",
  "operationalLabelPattern": "NN-{token}",
  "sequenceScope": "branch_day"
}';

IF EXISTS (SELECT 1 FROM dbo.Tenant WHERE TenantId = @TenantId AND IsDeleted = 0)
   AND OBJECT_ID(N'dbo.UnidentifiedLabelConfig', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.UnidentifiedLabelConfig
        WHERE TenantId = @TenantId AND BranchId IS NULL AND IsActive = 1
    )
    BEGIN
        INSERT INTO dbo.UnidentifiedLabelConfig (
            ConfigId, TenantId, BranchId, SchemeCode, SchemeParamsJson, IsActive, UpdatedByUserId
        )
        VALUES (
            @ConfigId, @TenantId, NULL, N'fonetico_sintetico_demo', @Params, 1, @ActorUserId
        );
        PRINT 'seed-subject-label OK — config sintética tenant demo (fonetico_sintetico_demo).';
    END
    ELSE
        PRINT 'seed-subject-label — config tenant demo ya existe; sin cambios.';
END
ELSE
    PRINT 'seed-subject-label — omitido (tenant demo o tabla ausente).';
GO
