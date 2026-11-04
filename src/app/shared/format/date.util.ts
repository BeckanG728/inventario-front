// src/app/shared/format/date.util.ts

const LIMA_OFFSET_HOURS = -5;

/**
 * Convierte una fecha/string ISO a objeto Date ajustado a zona horaria de Lima (UTC-5)
 */
function toLimaDate(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value.getTime());
  // Si es un string 'yyyy-MM-dd', parsear como fecha local directamente para evitar desfase UTC
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    return new Date(y, m - 1, day, 12, 0, 0);
  }
  return d;
}

/**
 * Formatea una fecha en formato 'DD/MM/YYYY'
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = toLimaDate(value);
    if (Number.isNaN(d.getTime())) return '—';
    // Formatear en Lima usando Intl
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formatea una fecha y hora completa 'DD/MM/YYYY HH:mm'
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = toLimaDate(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formatea solo la hora 'HH:mm'
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  try {
    const d = toLimaDate(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Retorna la fecha de hoy en Lima en formato 'yyyy-MM-dd' para inputs de fecha
 */
export function getLimaTodayString(): string {
  const now = new Date();
  // Obtener partes en Lima
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // en-CA produce yyyy-mm-dd
}

/**
 * Retorna el rango de fechas del mes actual en Lima (primer y último día) en formato 'yyyy-MM-dd'
 */
export function getLimaMonthRange(): { desde: string; hasta: string } {
  const today = getLimaTodayString();
  const [year, month] = today.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const paddedLastDay = String(lastDay).padStart(2, '0');

  return {
    desde: `${year}-${month}-01`,
    hasta: `${year}-${month}-${paddedLastDay}`
  };
}
