// src/app/features/admin/usuarios/usuarios-page.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideKeyRound, LucidePencil } from '@lucide/angular';
import { ListarUsuariosParams, UsuariosApi } from '@core/api/usuarios/usuarios-api';
import { UsuarioResponse } from '@core/api/usuarios/usuarios.models';
import { parseApiError } from '@core/api/api-error';
import { RegisterResponse } from '@core/api/auth/auth.models';
import { getRoleLabel, UserRole } from '@core/auth/roles';
import { ToastService } from '@core/notifications/toast-service';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { Badge, BadgeVariant } from '@shared/ui/badge/badge';
import { Button } from '@shared/ui/button/button';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Pagination } from '@shared/ui/pagination/pagination';
import { UsuarioCreateDialog } from './usuario-create-dialog';
import { UsuarioEditDialog } from './usuario-edit-dialog';
import { UsuarioPasswordDialog } from './usuario-password-dialog';

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DateTimePipe,
    PageHeader,
    Button,
    Badge,
    Pagination,
    UsuarioCreateDialog,
    UsuarioEditDialog,
    UsuarioPasswordDialog,
    LucidePencil,
    LucideKeyRound
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.css'
})
export class UsuariosPage implements OnInit {
  private readonly usuariosApi = inject(UsuariosApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roles: UserRole[] = ['ADMIN', 'JEFE_TALLER', 'MECANICO'];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly roleControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl('', { nonNullable: true });

  readonly usuarios = signal<UsuarioResponse[]>([]);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isCreateOpen = signal<boolean>(false);
  readonly isEditOpen = signal<boolean>(false);
  readonly isPasswordOpen = signal<boolean>(false);
  readonly selectedUsuario = signal<UsuarioResponse | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const page = params['page'] !== undefined ? parseInt(params['page'], 10) : 0;
      const size = params['size'] !== undefined ? parseInt(params['size'], 10) : 10;
      const username = params['username'] || '';
      const role = params['role'] || '';
      const activo = params['activo'] === 'true' || params['activo'] === 'false' ? params['activo'] : '';

      this.currentPage.set(Number.isNaN(page) ? 0 : page);
      this.pageSize.set(Number.isNaN(size) ? 10 : size);
      if (this.searchControl.value !== username) {
        this.searchControl.setValue(username, { emitEvent: false });
      }
      if (this.roleControl.value !== role) {
        this.roleControl.setValue(role, { emitEvent: false });
      }
      if (this.estadoControl.value !== activo) {
        this.estadoControl.setValue(activo, { emitEvent: false });
      }

      this.loadUsuarios();
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(text => {
      this.updateQueryParams({ username: text.trim() || null, page: 0 });
    });

    this.roleControl.valueChanges.pipe(distinctUntilChanged()).subscribe(role => {
      this.updateQueryParams({ role: role || null, page: 0 });
    });

    this.estadoControl.valueChanges.pipe(distinctUntilChanged()).subscribe(estado => {
      this.updateQueryParams({ activo: estado || null, page: 0 });
    });
  }

  loadUsuarios(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: ListarUsuariosParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      username: this.searchControl.value.trim() || undefined,
      role: (this.roleControl.value || undefined) as UserRole | undefined,
      activo: this.estadoControl.value === '' ? undefined : this.estadoControl.value === 'true'
    };

    this.usuariosApi.listar(params).subscribe({
      next: resp => {
        this.loading.set(false);
        this.usuarios.set(resp.content);
        this.totalElements.set(resp.totalElements);
        this.totalPages.set(resp.totalPages);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(parseApiError(err).message || 'Error al cargar el listado de usuarios.');
      }
    });
  }

  limpiarFiltros(): void {
    this.updateQueryParams({ username: null, role: null, activo: null, page: 0 });
  }

  onPageChange(page: number): void {
    this.updateQueryParams({ page });
  }

  openCreateDialog(): void {
    this.isCreateOpen.set(true);
  }

  openEditDialog(usuario: UsuarioResponse): void {
    this.selectedUsuario.set(usuario);
    this.isEditOpen.set(true);
  }

  openPasswordDialog(usuario: UsuarioResponse): void {
    this.selectedUsuario.set(usuario);
    this.isPasswordOpen.set(true);
  }

  onUsuarioCreado(resp: RegisterResponse): void {
    this.toast.success(
      `Usuario "${resp.username}" registrado correctamente como ${getRoleLabel(resp.role as UserRole)}.`
    );
    this.loadUsuarios();
  }

  onUsuarioActualizado(usuario: UsuarioResponse): void {
    this.replaceUsuario(usuario);
    this.toast.success(`Usuario "${usuario.username}" actualizado correctamente.`);
  }

  onPasswordActualizado(usuario: UsuarioResponse): void {
    this.replaceUsuario(usuario);
    this.toast.success(`Contraseña de "${usuario.username}" actualizada correctamente.`);
  }

  roleLabel(role: UserRole): string {
    return getRoleLabel(role);
  }

  roleVariant(role: UserRole): BadgeVariant {
    switch (role) {
      case 'ADMIN':
        return 'accent';
      case 'JEFE_TALLER':
        return 'primary';
      default:
        return 'info';
    }
  }

  private replaceUsuario(usuario: UsuarioResponse): void {
    this.usuarios.update(list => list.map(u => (u.id === usuario.id ? usuario : u)));
  }

  private updateQueryParams(params: Record<string, unknown>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }
}
