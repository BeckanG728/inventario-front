// src/app/features/admin/usuario-form-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApi } from '@core/api/auth/auth-api';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getRoleLabel } from '@core/auth/roles';
import { valUsr01Username, valUsr02Password, valUsr03Role } from '@shared/forms/validators';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-usuario-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Registrar nuevo usuario"
      subtitle="Creación de cuentas operativas para el personal del taller"
    />

    <div class="user-form-layout">
      <div class="data-panel form-card">
        <div class="panel-head">
          <h2>Datos del usuario</h2>
          <span class="panel-meta">Rol ADMIN</span>
        </div>

        @if (generalError()) {
          <div class="inline-alert inline-alert--error form-alert" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ generalError() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <app-field
            label="Nombre de usuario"
            forId="username"
            [required]="true"
            hint="De 3 a 20 caracteres; solo letras, números y _"
            [error]="usernameError()"
          >
            <input
              id="username"
              type="text"
              formControlName="username"
              autocomplete="off"
              placeholder="Ej. juan_perez"
              [attr.aria-invalid]="!!usernameError()"
            />
          </app-field>

          <app-field
            label="Contraseña inicial"
            forId="password"
            [required]="true"
            hint="Mínimo 8 caracteres, al menos una mayúscula y un número"
            [error]="passwordError()"
          >
            <div class="password-wrap">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                placeholder="Ingresa la contraseña para el usuario"
                [attr.aria-invalid]="!!passwordError()"
              />
              <button
                type="button"
                class="toggle-visibility"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (showPassword()) {
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  } @else {
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  }
                </svg>
              </button>
            </div>
          </app-field>

          <app-field
            label="Rol asignado"
            forId="role"
            [required]="true"
            hint="Determina los accesos y operaciones autorizadas en el sistema"
            [error]="roleError()"
          >
            <select
              id="role"
              formControlName="role"
              [attr.aria-invalid]="!!roleError()"
            >
              <option value="MECANICO">Mecánico (Registra consumos, consulta existencias)</option>
              <option value="JEFE_TALLER">Jefe de Taller (Administra catálogo, entradas y reportes)</option>
            </select>
          </app-field>

          <div class="form-actions">
            <app-button
              type="submit"
              variant="primary"
              size="lg"
              [loading]="submitting()"
            >
              Registrar usuario
            </app-button>
          </div>
        </form>
      </div>

      <div class="data-panel info-card">
        <h3>Políticas de seguridad (RN110–RN113)</h3>
        <ul class="policy-list">
          <li><strong>Rol ADMIN:</strong> Es un rol semilla único. No puede crearse desde este formulario por regla de negocio.</li>
          <li><strong>Mecánico:</strong> Tiene acceso directo al registro rápido de consumos desde móvil, catálogo de productos y alertas de inventario.</li>
          <li><strong>Jefe de Taller:</strong> Tiene permisos para dar de alta repuestos, registrar compras/entradas, realizar ajustes y visualizar reportes analíticos.</li>
          <li><strong>Contraseñas:</strong> Deben cumplir obligatoriamente los requisitos de longitud y complejidad para ser aceptadas por el servidor.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .user-form-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      max-width: 960px;
    }

    @media (min-width: 768px) {
      .user-form-layout {
        grid-template-columns: 3fr 2fr;
      }
    }

    .form-card {
      display: flex;
      flex-direction: column;
    }

    .form-alert {
      margin-bottom: var(--space-4);
    }

    .password-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .toggle-visibility {
      position: absolute;
      right: 14px;
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-visibility:hover {
      color: var(--color-text-primary);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-soft);
    }

    .info-card {
      height: fit-content;
      background-color: var(--color-surface);
    }

    .info-card h3 {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: var(--space-3);
      color: var(--color-text-primary);
    }

    .policy-list {
      margin: 0;
      padding-left: 20px;
      font-size: var(--font-size-body);
      color: var(--color-text-secondary);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      line-height: 1.5;
    }

    .policy-list strong {
      color: var(--color-text-primary);
    }
  `]
})
export class UsuarioFormPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly toast = inject(ToastService);

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, valUsr01Username()]],
    password: ['', [Validators.required, valUsr02Password()]],
    role: ['MECANICO' as 'JEFE_TALLER' | 'MECANICO', [Validators.required, valUsr03Role()]]
  });

  get usernameError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.username;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get passwordError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.password;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get roleError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.role;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const raw = this.form.getRawValue();

    this.authApi.register({
      username: raw.username.trim(),
      password: raw.password,
      role: raw.role
    }).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        const roleText = getRoleLabel(raw.role);
        this.toast.success(`Usuario "${resp.username}" registrado correctamente como ${roleText}.`);
        this.form.reset({
          username: '',
          password: '',
          role: 'MECANICO'
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = parseApiError(err);

        // Conflicto de usuario existente (409)
        if (apiError.status === 409 || apiError.code === 'USER_ALREADY_EXISTS') {
          this.form.controls.username.setErrors({
            server: 'Ya existe un usuario registrado con ese nombre de usuario.'
          });
          return;
        }

        // Errores de validación de campo desde el backend
        if (apiError.status === 400 && apiError.details.length > 0) {
          for (const d of apiError.details) {
            if (d.field === 'username') {
              this.form.controls.username.setErrors({ server: d.reason });
            } else if (d.field === 'password') {
              this.form.controls.password.setErrors({ server: d.reason });
            } else if (d.field === 'role') {
              this.form.controls.role.setErrors({ server: d.reason });
            }
          }
          return;
        }

        this.generalError.set(apiError.message || 'No se pudo completar el registro del usuario.');
      }
    });
  }
}
