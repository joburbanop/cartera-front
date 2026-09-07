import { ChangeDetectorRef, Component, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';

function differentFromCurrent(control: AbstractControl): ValidationErrors | null {
  const current = control.parent?.get('current_password')?.value;
  const next = control.value;
  if (!current || !next || current !== next) {
    return null;
  }

  return { sameAsCurrent: true };
}

function matchesPassword(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  const confirm = control.value;
  if (!confirm || !password || password === confirm) {
    return null;
  }

  return { mismatch: true };
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './change-password.component.html',
  styleUrls: ['../login/login.component.scss'],
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  readonly passwordMessages = {
    minlength: 'La contraseña debe tener al menos 8 caracteres.',
    sameAsCurrent: 'La nueva contraseña debe ser diferente a la actual.',
  };

  form = this.fb.nonNullable.group({
    current_password: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8), differentFromCurrent]],
    password_confirmation: ['', [Validators.required, matchesPassword]],
  });

  errorMessage = '';
  isLoading = false;

  get isFirstAccess(): boolean {
    return !this.authService.hasPreviousPasswordChange();
  }

  constructor() {
    this.form.controls.current_password.valueChanges.subscribe(() => {
      this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    });
    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.password_confirmation.updateValueAndValidity({ emitEvent: false });
    });
  }

  get showPasswordHint(): boolean {
    const control = this.form.controls.password;
    return !(control.hasError('minlength') && (control.touched || control.dirty));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      markAllAsTouched(this.form);
      scrollToFirstInvalid(this.host.nativeElement);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.clearServerErrors();

    this.authService.changePassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        void this.router.navigate([this.authService.homePath()]);
      },
      error: (err) => {
        this.isLoading = false;
        if (!this.applyFieldErrors(err)) {
          this.errorMessage = this.networkMessage(err);
        }
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }

  private clearServerErrors(): void {
    for (const control of Object.values(this.form.controls)) {
      if (control.hasError('server')) {
        const { server: _server, ...rest } = control.errors ?? {};
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
  }

  private applyFieldErrors(err: unknown): boolean {
    const errors = this.readErrorMap(err);
    if (!errors) {
      return false;
    }

    let applied = false;
    const fields = ['current_password', 'password', 'password_confirmation'] as const;

    for (const field of fields) {
      const message = this.firstError(errors[field]);
      if (!message) {
        continue;
      }

      this.form.controls[field].setErrors({ server: message });
      this.form.controls[field].markAsTouched();
      applied = true;
    }

    return applied;
  }

  private readErrorMap(err: unknown): Record<string, unknown> | null {
    const body = (err as { error?: unknown } | null)?.error;
    if (!body || typeof body !== 'object') {
      return null;
    }

    const errors = (body as { errors?: unknown }).errors;
    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
      return null;
    }

    return errors as Record<string, unknown>;
  }

  private firstError(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string' && item.trim());
      return typeof first === 'string' ? first.trim() : null;
    }

    return null;
  }

  private networkMessage(err: unknown): string {
    const status = (err as { status?: number } | null)?.status;
    if (status === 422) {
      return 'Revisa los campos e inténtalo de nuevo.';
    }

    return 'No pudimos guardar el cambio. Intenta de nuevo.';
  }
}
