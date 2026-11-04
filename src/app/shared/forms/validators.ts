// src/app/shared/forms/validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para nombre de usuario según VAL-USR-01 / RN112:
 * 3 a 20 caracteres; solo letras, números y guión bajo (_).
 */
export function valUsr01Username(): ValidatorFn {
  const pattern = /^[a-zA-Z0-9_]{3,20}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null; // 'required' se maneja por separado
    if (!pattern.test(val)) {
      return { valUsr01: 'Debe tener entre 3 y 20 caracteres y solo contener letras, números y _' };
    }
    return null;
  };
}

/**
 * Validador para contraseña de usuario según VAL-USR-02 / RN113:
 * Mínimo 8 caracteres; al menos una letra mayúscula y un número.
 */
export function valUsr02Password(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    if (val.length < 8) {
      return { valUsr02MinLength: 'La contraseña debe tener al menos 8 caracteres' };
    }
    const hasUpper = /[A-Z]/.test(val);
    const hasNumber = /\d/.test(val);
    if (!hasUpper || !hasNumber) {
      return { valUsr02Complexity: 'Debe contener al menos una letra mayúscula y un número' };
    }
    return null;
  };
}

/**
 * Validador para rol según RN111:
 * Solo permite 'JEFE_TALLER' o 'MECANICO'. 'ADMIN' está terminantemente prohibido.
 */
export function valUsr03Role(): ValidatorFn {
  const allowed = ['JEFE_TALLER', 'MECANICO'];
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    if (!allowed.includes(val)) {
      return { valUsr03Role: 'El rol seleccionado no es válido para registro' };
    }
    return null;
  };
}
