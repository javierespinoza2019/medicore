/** Respuesta de POST /api/sync/commands (contrato SyncAcceptedDto). */
export type SyncAcceptedDto = {
  idempotencyKey: string;
  status: string;
  serverEntityId?: string | null;
};
