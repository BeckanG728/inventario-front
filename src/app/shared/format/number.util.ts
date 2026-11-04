// src/app/shared/format/number.util.ts

/**
 * Formatea un número según las reglas de DESIGN.md (tradición es-PE con separador de miles '.' y decimales ','):
 * Ejemplo: 1234.56 -> '1.234,56'
 */
export function formatNumber(
  value: number | string | null | undefined,
  minDecimals = 0,
  maxDecimals = 2
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return '—';
  }

  // Separar entero y decimal
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(absNum * factor) / factor;

  const parts = rounded.toFixed(maxDecimals).split('.');
  const intPart = parts[0];
  let decPart = parts[1] || '';

  // Quitar ceros sobrantes si minDecimals < maxDecimals
  if (decPart.length > minDecimals) {
    while (decPart.length > minDecimals && decPart.endsWith('0')) {
      decPart = decPart.slice(0, -1);
    }
  }

  // Formatear miles con '.'
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const result = decPart.length > 0 ? `${formattedInt},${decPart}` : formattedInt;
  return isNegative ? `-${result}` : result;
}

/**
 * Formato monetario en Soles peruanos (S/) con cifras tabulares
 * Ejemplo: 1234.5 -> 'S/ 1.234,50'
 */
export function formatCurrency(
  value: number | string | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const formatted = formatNumber(value, decimals, decimals);
  return formatted === '—' ? '—' : `S/ ${formatted}`;
}

/**
 * Formato numérico abreviado según DESIGN.md (ejemplo: 124,3 mil, 1,14 M)
 */
export function formatCompactNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) {
    return '—';
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return `${sign}${formatNumber(abs / 1_000_000, 1, 2)} M`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatNumber(abs / 1_000, 1, 1)} mil`;
  }
  return `${sign}${formatNumber(abs, 0, 2)}`;
}

/**
 * Parsea una cadena de texto en formato es-PE (1.234,56) a número float
 */
export function parseLocalNumber(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null;
  const clean = value.trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return Number.isNaN(num) ? null : num;
}
