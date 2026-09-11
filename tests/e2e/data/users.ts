/**
 * Usuarios de prueba alineados con docs/frontend/src/mocks/users.ts.
 * No usar datos personales reales ni credenciales de producción.
 */

export type UserRole =
  | 'admin'
  | 'medico'
  | 'recepcion'
  | 'enfermeria'
  | 'caja'
  | 'farmacia'
  | 'laboratorio'
  | 'directivo'
  | 'trabajo_social';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  rol: UserRole;
  rolLabel: string;
  sucursalIds: string[];
  status: 'activo' | 'inactivo' | 'bloqueado';
  /** Payload mínimo que persiste useAuth en localStorage. */
  toAuthPayload: () => Record<string, unknown>;
}

/**
 * Password de usuarios por rol (seed 002): Admin123!.
 * Distinto de `admin`/`Demo123!` del tenant (api.fixtures / MEDICORE_E2E_PASSWORD).
 */
const ROLE_PASSWORD = process.env.MEDICORE_E2E_ROLE_PASSWORD?.trim() || 'Admin123!';

function makeUser(
  partial: Omit<TestUser, 'password' | 'toAuthPayload' | 'status'> & { status?: TestUser['status'] },
): TestUser {
  const user: TestUser = {
    ...partial,
    password: ROLE_PASSWORD,
    status: partial.status ?? 'activo',
    toAuthPayload() {
      return {
        id: this.id,
        nombre: this.nombre,
        apellidos: this.apellidos,
        email: this.email,
        password: this.password,
        telefono: '',
        rol: this.rol,
        rolLabel: this.rolLabel,
        sucursalIds: this.sucursalIds,
        sucursales: [],
        ultimoAcceso: '',
        status: this.status,
        fechaCreacion: '',
      };
    },
  };
  return user;
}

export const users = {
  admin: makeUser({
    id: 'u6',
    email: 'laura.torres@medicore.mx',
    nombre: 'Laura Elena',
    apellidos: 'Torres Pérez',
    rol: 'admin',
    rolLabel: 'Administrador',
    sucursalIds: ['suc1', 'suc2', 'suc3'],
  }),
  medico: makeUser({
    id: 'u1',
    email: 'alejandro.garcia@medicore.mx',
    nombre: 'Alejandro',
    apellidos: 'García Mendoza',
    rol: 'medico',
    rolLabel: 'Médico',
    sucursalIds: ['suc1', 'suc2'],
  }),
  recepcion: makeUser({
    id: 'u8',
    email: 'jose.ramirez@medicore.mx',
    nombre: 'José Luis',
    apellidos: 'Ramírez Díaz',
    rol: 'recepcion',
    rolLabel: 'Recepción',
    sucursalIds: ['suc1'],
  }),
  enfermeria: makeUser({
    id: 'u7',
    email: 'carmen.vargas@medicore.mx',
    nombre: 'Carmen Alicia',
    apellidos: 'Vargas Luna',
    rol: 'enfermeria',
    rolLabel: 'Enfermería',
    sucursalIds: ['suc1'],
  }),
  /** Enfermería NORTE — sin compartir break-glass con specs API (carmen.vargas). */
  enfermeriaNorte: makeUser({
    id: 'u7n',
    email: 'rocio.bautista@medicore.mx',
    nombre: 'Rocío',
    apellidos: 'Bautista León',
    rol: 'enfermeria',
    rolLabel: 'Enfermería',
    sucursalIds: ['suc2'],
  }),
  caja: makeUser({
    id: 'u9',
    email: 'monica.soto@medicore.mx',
    nombre: 'Mónica Fernanda',
    apellidos: 'Soto Rivera',
    rol: 'caja',
    rolLabel: 'Caja y Cobros',
    sucursalIds: ['suc1', 'suc2'],
  }),
  /**
   * Recepción NORTE — break-glass / multi-estación.
   * No usar jose.ramirez aquí: UI de permisos y agenda asumen rol base sin grants.
   */
  recepcionNorte: makeUser({
    id: 'u-r2',
    email: 'veronica.salinas@medicore.mx',
    nombre: 'Verónica',
    apellidos: 'Salinas Castro',
    rol: 'recepcion',
    rolLabel: 'Recepción',
    sucursalIds: ['suc2'],
  }),
  trabajoSocial: makeUser({
    id: 'u-ts1',
    email: 'gabriela.moreno@medicore.mx',
    nombre: 'Gabriela',
    apellidos: 'Moreno Sánchez',
    rol: 'trabajo_social',
    rolLabel: 'Trabajo social',
    sucursalIds: ['suc1'],
  }),
} as const;
