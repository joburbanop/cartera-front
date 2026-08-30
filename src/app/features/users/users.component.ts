import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { AppRoles } from '../../core/models/app-roles';
import { ToastService } from '../../shared/services/toast.service';
import { FieldErrorComponent } from '../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../shared/utils/form-utils';

interface UserUI {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  readonly roleOptions = [
    { value: AppRoles.SOCIO_GERENCIA, label: 'Socio / Gerencia' },
    { value: AppRoles.ADMIN_SISTEMA, label: 'Admin sistema' },
    { value: AppRoles.ADMINISTRADOR, label: 'Administrador' },
  ];

  users: UserUI[] = [];
  isLoading = false;
  isModalOpen = false;
  isEditing = false;
  editingUserId: number | null = null;
  successMessage = '';
  errorMessage = '';

  userForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(8)]],
    role: [AppRoles.ADMINISTRADOR, Validators.required],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  get currentUserId(): number | null {
    return this.authService.getUserId();
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get adminSistemaCount(): number {
    return this.users.filter((user) => user.roles.includes(AppRoles.ADMIN_SISTEMA)).length;
  }

  get administradorCount(): number {
    return this.users.filter((user) => user.roles.includes(AppRoles.ADMINISTRADOR)).length;
  }

  roleLabel(role: string): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? role;
  }

  canDelete(user: UserUI): boolean {
    return user.id !== this.currentUserId;
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (response) => {
        const payload = response?.data ?? response ?? [];
        this.users = (Array.isArray(payload) ? payload : []).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          roles: Array.isArray(user.roles) ? user.roles : [],
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.users = [];
        this.errorMessage = 'No se pudieron cargar los usuarios. Intente nuevamente.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingUserId = null;
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      role: AppRoles.ADMINISTRADOR,
    });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.successMessage = '';
    this.errorMessage = '';
    this.isModalOpen = true;
  }

  openEditModal(user: UserUI): void {
    this.isEditing = true;
    this.editingUserId = user.id;
    this.userForm.reset({
      name: user.name,
      email: user.email,
      password: '',
      role: (user.roles[0] as typeof AppRoles.ADMINISTRADOR) || AppRoles.ADMINISTRADOR,
    });
    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
    this.successMessage = '';
    this.errorMessage = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.editingUserId = null;
    this.successMessage = '';
    this.errorMessage = '';
  }

  submit(): void {
    if (this.userForm.invalid) {
      markAllAsTouched(this.userForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const value = this.userForm.getRawValue();

    const request$ = this.isEditing && this.editingUserId
      ? this.userService.updateUser(this.editingUserId, {
          name: value.name,
          email: value.email,
          role: value.role,
        })
      : this.userService.createUser({
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
        });

    request$.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadUsers();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.readError(err);
        this.cdr.detectChanges();
      }
    });
  }

  deleteUser(user: UserUI): void {
    if (!this.canDelete(user)) {
      return;
    }

    if (!confirm(`¿Eliminar a ${user.name}? Esta acción archiva la cuenta.`)) {
      return;
    }

    this.userService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        this.errorMessage = this.readError(err);
        this.cdr.detectChanges();
      }
    });
  }

  private readError(err: any): string {
    if (err?.status === 422 && err.error?.errors) {
      return Object.values(err.error.errors).flat().join('. ');
    }

    return err?.error?.message || 'No se pudo completar la operación.';
  }
}
