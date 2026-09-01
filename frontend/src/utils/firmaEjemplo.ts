// Genera una firma digital de ejemplo para el doctor con ID `d1` (Dr. Alejandro García Mendoza)
// y la persiste en localStorage al cargar la app si aún no existe.
// Esto permite ver la funcionalidad de e.firma sin necesidad de subir un archivo.

const FIRMA_PREFIX = 'medicore_settings_firma_';
const FIRMA_EJEMPLO_KEY = `${FIRMA_PREFIX}d1`;

const SAMPLE_FIRMA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
  <!-- Firma manuscrita estilizada — Dr. Alejandro García Mendoza -->
  <g fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <!-- A de Alejandro -->
    <path d="M 30 90 L 50 35 L 70 90" />
    <path d="M 37 68 L 63 68" />
    <!-- l e j a n d r o -->
    <path d="M 78 35 L 78 90" />
    <path d="M 78 90 Q 88 100 96 88 Q 102 75 95 65 Q 88 55 80 62" />
    <path d="M 105 62 Q 115 55 120 65 Q 124 75 118 85 Q 112 94 103 88 L 102 97 Q 104 105 116 103" />
    <path d="M 128 62 Q 128 82 130 90" />
    <path d="M 122 72 L 136 72" />
    <path d="M 144 90 L 144 62 Q 162 55 165 70 Q 166 82 155 88 L 168 102" />
    <!-- espacio G -->
    <path d="M 178 62 Q 194 55 198 70 L 198 80 L 188 80" />
    <path d="M 204 62 Q 215 55 218 68 Q 220 80 212 88 Q 204 96 196 88 L 195 97" />
    <!-- a r c í a -->
    <path d="M 225 75 Q 228 62 238 62 Q 248 62 249 74 Q 250 86 240 91 Q 229 95 225 88 L 224 97 Q 226 106 237 104" />
    <path d="M 257 90 L 257 62 Q 268 58 270 68" />
    <path d="M 276 90 Q 280 62 290 62 Q 300 64 300 75 L 286 78 Q 278 80 278 86 Q 280 94 290 90 L 300 85" />
    <path d="M 308 62 L 308 90" />
    <path d="M 305 55 Q 308 52 311 55" />
    <path d="M 316 75 Q 320 62 330 62 Q 340 62 341 74 Q 342 86 332 91 Q 321 95 317 88 L 316 97 Q 318 106 329 104" />
    <!-- línea base decorativa -->
    <path d="M 24 96 L 350 96" stroke-width="0.8" stroke="#444" />
    <!-- rúbrica / garabato final -->
    <path d="M 340 82 Q 355 70 365 80 Q 372 88 360 95 Q 348 102 342 96 Q 336 90 345 85 Q 352 80 360 88" stroke-width="1.8" />
  </g>
</svg>`;

function svgToDataUrl(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export function seedFirmaEjemplo(): void {
  try {
    const existing = localStorage.getItem(FIRMA_EJEMPLO_KEY);
    if (!existing) {
      const dataUrl = svgToDataUrl(SAMPLE_FIRMA_SVG);
      localStorage.setItem(FIRMA_EJEMPLO_KEY, dataUrl);
      // Notifica a los suscriptores de appSettings
      window.dispatchEvent(new Event('medicore:settings-changed'));
    }
  } catch {
    // localStorage no disponible, ignorar
  }
}