// src/app/shared/forms/error-messages.ts
import { ValidationErrors } from '@angular/forms';

/**
 * Traduce errores de validación estándar y personalizados de Reactive Forms a textos en español
 */
export function getFirstErrorMessage(errors: ValidationErrors | null | undefined): string | null {
  if (!errors) return null;

  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['server']) return String(errors['server']);
  if (errors['valUsr01']) return String(errors['valUsr01']);
  if (errors['valUsr02MinLength']) return String(errors['valUsr02MinLength']);
  if (errors['valUsr02Complexity']) return String(errors['valUsr02Complexity']);
  if (errors['valUsr03Role']) return String(errors['valUsr03Role']);
  if (errors['minlength']) {
    return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  }
  if (errors['maxlength']) {
    return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  }
  if (errors['pattern']) return 'El formato ingresado no es válido.';
  if (errors['min']) return `El valor mínimo permitido es ${errors['min'].min}.`;
  if (errors['max']) return `El valor máximo permitido es ${errors['max'].max}.`;

  const keys = Object.keys(errors);
  return keys.length > 0 ? 'Valor inválido.' : null;
}
