# MediCore — PWA, dispositivos y cola offline

Alineado a `docs/analisis/12-propuesta-final.md` §3 y plan F1 §3.4.

## Qué es la prueba real (no cosmética)

| Capacidad | Comportamiento |
|---|---|
| Instalación PWA | Chrome/Edge: «Instalar» → ventana `standalone` |
| Service worker | Precache del shell; **`/api/*` = NetworkOnly** (no cachear PHI) |
| Registro de dispositivo | Al login, la estación llama `POST /api/devices/register` |
| Aprobación admin | `Administración → Dispositivos` → `POST /api/devices/{id}/approve` |
| Cola local (IndexedDB) | Escrituras con `IdempotencyKey`; logout **no** la borra |
| Caché de lectura | Solo si `IsApproved && AllowsOfflineQueue`; logout **sí** la purga |
| Sin aprobación | Estación **solo en línea**; no captura offline |

## API

| Método | Ruta | AuthZ |
|---|---|---|
| POST | `/api/devices/register` | autenticado |
| GET | `/api/devices/{devicePublicId}` | autenticado |
| GET | `/api/devices?onlyPending=` | `canAdminUsers` |
| POST | `/api/devices/{devicePublicId}/approve` | `canAdminUsers` |

SPs: `sp_Device_UpsertPending`, `GetByPublicId`, `List`, `Approve`.

## Build / publish frontend

```powershell
cd frontend
npm run build   # sale a frontend/out/ con manifest + SW + web.config
```

Variables: `VITE_API_BASE_URL`, `VITE_TENANT_CODE` (provisional por build).

**IIS (Site4Now):** el `web.config` en la raíz del sitio reescribe rutas `/app/...` a `index.html`.
Sin URL Rewrite + ese archivo, **F5 en cualquier sección → 404**. Subir siempre el `web.config`
junto con `out/` (Vite lo copia desde `public/`).

Iconos PWA / favicon: salen de `src/assets/images/logo.png` (fuente del favicon original) vía
`python frontend/tools/generate-pwa-icons.py` → `public/pwa-192.png`, `pwa-512.png`, `favicon.ico`.
Variantes: `logo-blue.jpeg`, `logo-dark.jpeg`; wordmark: `medicore.jpeg`.

## Guion de demo — instalación PWA (≈5 min)

Objetivo frente al cliente: **probar que se instala** (Chrome/Edge «Instalar», acceso directo, ventana `standalone`).
No afirmar continuidad clínica offline completa por el solo hecho de instalar.

1. Abrir `https://medi-core.app` en Chrome (HTTPS).
2. DevTools → Application → Manifest (sin errores) y Service Workers (**activated**).
3. Instalar MediCore → abrir como app (sin barra de URL).
4. Login `admin` / `Demo123!` (tenant embebido `clinicas_del_valle`).
5. Decir con claridad: «instalable hoy; con red caída abre el shell cacheado, pero login y datos clínicos siguen requiriendo el API. Continuidad clínica offline = siguiente tramo.»

Tras republicar `frontend/out/`, un hard refresh una vez para tomar el SW nuevo.

### Workbox `bad-precaching-response` (403)

Si la consola muestra `bad-precaching-response` sobre `https://medi-core.app/assets/index-XXXX.js`
con **403**: el SW intenta precachear un hash de un build anterior que el host ya no sirve (o
bloquea). Mitigación: publicar **todo** `frontend/out/` (incl. `sw.js` / workbox), luego en el
navegador Application → Service Workers → **Unregister** + clear site data / hard refresh. No es
fallo del API.

## Guion de prueba — dispositivos / cola (más allá de la instalación)

1. Login admin → Administración → Dispositivos → **Aprobar** esta estación (cola offline = Sí).
2. Con red: ingreso a urgencias, triage, cita, nota o receta → deben pasar por cola + sync inmediato.
3. Sin red (DevTools Offline): mismas escrituras → quedan en IndexedDB; sin dispositivo aprobado → mensaje de bloqueo (excepto lectura).
4. Volver online → drenado automático; sin duplicar (idempotencia).
5. Logout → caché de lecturas vacía; comandos pending de outbox permanecen.

## Escrituras F1 cableadas a cola

| UI | `commandType` |
|---|---|
| Ingreso urgencias | `subject.create`, `encounter.open` |
| Triage | `triage.save` |
| Agenda (crear / estado) | `appointment.create`, `appointment.state` |
| Notas (crear / firmar / addendum) | `note.create`, `note.sign`, `note.addendum` |
| Receta (crear / firmar) | `prescription.create`, `prescription.sign` |

Sin enlace: create de receta/nota queda en cola; la firma de una entidad aún no sincronizada requiere enlace (el id lo asigna el servidor al sync).

## Fuera de este tramo

- Cobro/farmacia offline → Fase 2.
- Más pantallas F1 (alergias, historia, estados de encuentro) a la misma cola.
- SC-11 E2E de PWA/offline contra stack real.
- Pacientes reales: no en shared Site4Now (dedicado).
