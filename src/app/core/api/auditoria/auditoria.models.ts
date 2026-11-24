// src/app/core/api/auditoria/auditoria.models.ts

export type AuditoriaTipo = 'OPERACION' | 'AUTENTICACION';

export interface AuditoriaResponse {
  id: number;
  fecha: string;
  tipo: AuditoriaTipo;
  actorId: number | null;
  actorUsername: string;
  metodo: string;
  endpoint: string;
  recurso: string;
  recursoId: string | null;
  resultado: string;
  exito: boolean;
}
