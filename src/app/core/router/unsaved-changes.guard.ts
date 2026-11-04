// src/app/core/router/unsaved-changes.guard.ts
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Guard funcional que previene la navegación accidental cuando el usuario
 * tiene una transacción en curso o datos no guardados en pantalla.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component && typeof component.hasUnsavedChanges === 'function' && component.hasUnsavedChanges()) {
    return window.confirm(
      'Tienes información o un registro en preparación. Si sales ahora, se perderán los datos ingresados.\n\n¿Estás seguro de que deseas salir?'
    );
  }
  return true;
};
