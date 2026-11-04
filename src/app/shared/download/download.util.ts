// src/app/shared/download/download.util.ts
import { HttpResponse } from '@angular/common/http';

/**
 * Extrae el nombre de archivo desde la cabecera `Content-Disposition`.
 * Soporta `filename*="UTF-8''..."` y `filename="..."` o `filename=...`.
 * Si no se encuentra, retorna `fallbackFilename`.
 */
export function extractFilenameFromHeader(
  contentDispositionHeader: string | null | undefined,
  fallbackFilename: string
): string {
  if (!contentDispositionHeader) return fallbackFilename;

  // 1. Probar sintaxis RFC 5987: filename*=UTF-8''nombre.ext
  const rfcMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDispositionHeader);
  if (rfcMatch && rfcMatch[1]) {
    try {
      return decodeURIComponent(rfcMatch[1].trim());
    } catch {
      return rfcMatch[1].trim();
    }
  }

  // 2. Probar sintaxis estándar: filename="nombre.ext" o filename=nombre.ext
  const match = /filename=["']?([^"';]+)["']?/i.exec(contentDispositionHeader);
  if (match && match[1]) {
    return match[1].trim();
  }

  return fallbackFilename;
}

/**
 * Dispara la descarga directa de un Blob en el navegador sin abrir pestañas en blanco.
 * Limpia el ObjectURL de forma segura tras la invocación.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();

  // Limpieza asíncrona segura
  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 150);
}

/**
 * Procesa la respuesta HTTP binaria completa, extrayendo el nombre de archivo
 * desde los encabezados de respuesta o usando el fallback con su extensión.
 */
export function downloadHttpResponse(
  response: HttpResponse<Blob>,
  fallbackFilename: string
): void {
  const blob = response.body;
  if (!blob) return;

  const contentDisposition = response.headers.get('content-disposition');
  const filename = extractFilenameFromHeader(contentDisposition, fallbackFilename);

  triggerBlobDownload(blob, filename);
}
