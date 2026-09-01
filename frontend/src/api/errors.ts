/**
 * Taxonomía única de fallas del API y sus mensajes para personal clínico y administrativo.
 *
 * Doc 12 §3 y doc 07 §7: la transición offline es imperceptible al escribir y **explícita al leer**.
 * Un problema de enlace nunca se comunica como un problema de credenciales o de captura.
 *
 * Este archivo es el único lugar donde vive el texto de un error de API. Las pantallas
 * consumen `mensajeDeFalla`; no redactan mensajes propios.
 */

export type ApiFailureKind =
  /** La petición no llegó al servidor (red caída, servidor sin escuchar, DNS). */
  | 'sin_enlace'
  /** La petición salió pero el servidor no respondió dentro del tiempo de espera. */
  | 'tiempo_agotado'
  /** Hay enlace, pero el servidor o su intermediario declaran que no pueden atender (502/503/504). */
  | 'servidor_no_disponible'
  /** El API rechazó las credenciales presentadas en el inicio de sesión. */
  | 'credenciales'
  /** Había sesión y el servidor ya no la reconoce. */
  | 'sesion_expirada'
  /** La cuenta está autenticada pero no autorizada para la operación. */
  | 'sin_permiso'
  /** Respuesta de negocio: datos incompletos, duplicados o estado inválido. */
  | 'solicitud_invalida'
  /** El servidor falló al procesar la petición. */
  | 'error_servidor';

export type ApiFailure = {
  kind: ApiFailureKind;
  /** Código HTTP observado, si hubo respuesta. Nunca se muestra al usuario. */
  status?: number;
  /** Mensaje de negocio del API. Solo se muestra cuando la falla es de negocio. */
  apiMessage?: string;
};

const FALLAS_DE_ENLACE: ReadonlySet<ApiFailureKind> = new Set<ApiFailureKind>([
  'sin_enlace',
  'tiempo_agotado',
  'servidor_no_disponible',
]);

/** True cuando el problema es de comunicación con el servidor, no del usuario ni de los datos. */
export function esFallaDeEnlace(failure: ApiFailure | null | undefined): boolean {
  return failure ? FALLAS_DE_ENLACE.has(failure.kind) : false;
}

export type MensajeDeFalla = {
  /** Frase principal, sin jerga técnica ni códigos. */
  titulo: string;
  /** Qué hacer o qué se puede seguir haciendo. */
  detalle: string;
  /** Si es problema de comunicación con el servidor. */
  esEnlace: boolean;
};

const CONTINUIDAD =
  'La atención no se detiene: puedes seguir capturando en las pantallas que trabajan sin enlace y lo capturado se enviará solo en cuanto se restablezca la conexión.';

export function mensajeDeFalla(failure: ApiFailure | null | undefined): MensajeDeFalla {
  if (!failure) {
    return {
      titulo: 'No se pudo completar la operación.',
      detalle: 'Intenta de nuevo. Si continúa, avisa a soporte de sistemas.',
      esEnlace: false,
    };
  }

  switch (failure.kind) {
    case 'sin_enlace':
      return {
        titulo: 'No hay conexión con el servidor de MediCore.',
        detalle: `Esto no significa que tus datos de acceso estén mal: la estación no logró comunicarse con el servidor. Revisa la red de la clínica o avisa a soporte de sistemas. ${CONTINUIDAD}`,
        esEnlace: true,
      };
    case 'tiempo_agotado':
      return {
        titulo: 'El servidor no respondió a tiempo.',
        detalle: `La conexión está muy lenta o interrumpida. Vuelve a intentar en un momento o avisa a soporte de sistemas. ${CONTINUIDAD}`,
        esEnlace: true,
      };
    case 'servidor_no_disponible':
      return {
        titulo: 'El servidor de MediCore no está disponible en este momento.',
        detalle: `Tus datos de acceso no están en duda; el servidor no puede atender la solicitud. Avisa a soporte de sistemas. ${CONTINUIDAD}`,
        esEnlace: true,
      };
    case 'credenciales':
      // Deliberadamente ambiguo: no revela si el usuario existe.
      return {
        titulo: 'Usuario o contraseña incorrectos.',
        detalle: 'Verifica los datos y vuelve a intentar. Si no los recuerdas, solicita apoyo al administrador del sistema.',
        esEnlace: false,
      };
    case 'sesion_expirada':
      return {
        titulo: 'Tu sesión terminó.',
        detalle: 'Vuelve a iniciar sesión para continuar.',
        esEnlace: false,
      };
    case 'sin_permiso':
      return {
        titulo: 'Tu cuenta no tiene permiso para esta acción.',
        detalle: 'Solicita el acceso al administrador del sistema.',
        esEnlace: false,
      };
    case 'solicitud_invalida':
      return {
        titulo: failure.apiMessage?.trim() || 'La información capturada no se pudo procesar.',
        detalle: 'Revisa los datos y vuelve a intentar.',
        esEnlace: false,
      };
    case 'error_servidor':
      return {
        titulo: 'Ocurrió un problema en el servidor.',
        detalle: 'Vuelve a intentar. Si continúa, avisa a soporte de sistemas.',
        esEnlace: false,
      };
  }
}
