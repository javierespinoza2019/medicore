# Instalación y uso con Claude

## Opción A — Claude Code
1. Coloca este paquete dentro del repositorio/proyecto donde trabajará Claude.
2. Conserva `CLAUDE.md` en la raíz del proyecto para que funcione como memoria/instrucciones compartidas del proyecto.
3. Instala o registra las carpetas de `skills/` como Agent Skills según la versión actual de Claude Code.
4. Mantén `knowledge/` y `assets/` accesibles al agente.
5. Abre Claude Code desde la raíz del proyecto y valida con `/memory` que `CLAUDE.md` esté cargado.

## Opción B — Claude.ai / Projects
- Usa `CLAUDE.md` y los archivos de `knowledge/` como conocimiento del proyecto.
- Añade los Agent Skills personalizados desde la función de Skills disponible en tu plan/entorno.
- Conserva la matriz Excel como material de referencia operativo.

## Opción C — Claude API / Agent SDK
- Usa `CLAUDE.md` como base de instrucciones de sistema del agente.
- Registra los Skills como recursos especializados.
- Conecta una fuente regulatoria/MCP si deseas verificación dinámica de DOF, Cámara de Diputados, COFEPRIS, DGIS y otros sistemas.

## Pruebas de aceptación sugeridas
Pídele a Claude:

1. "Determina qué normativa aplica a una clínica privada de consulta general que usa expediente electrónico en México. Separa obligatorio de recomendado."
2. "Diseña el workflow de una nota de evolución y dime qué controles se derivan de NOM-004 y NOM-024."
3. "Una clínica quiere borrar por completo un expediente a petición del paciente. Analiza privacidad contra conservación sanitaria."
4. "La clínica agrega laboratorio clínico. ¿Qué nuevas obligaciones y módulos debo activar?"
5. "¿Esta NOM sigue vigente hoy? Verifica fuente oficial y no respondas desde memoria."

## Regla de mantenimiento
Revisar periódicamente las normas y actualizar `last_verified_at`, fuentes, versiones y reglas de aplicabilidad. Nunca reemplazar una versión histórica sin conservar trazabilidad.
