import { Component, ChangeDetectorRef, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly strengthLevels = [
    { label: 'Muy débil', className: 'weak' },
    { label: 'Débil', className: 'fair' },
    { label: 'Buena', className: 'good' },
    { label: 'Fuerte', className: 'strong' },
  ];

  errorMessage = '';
  isLoading = false;

  constructor() {
    this.loginForm.controls.password.valueChanges.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  get passwordStrength() {
    const value = this.loginForm.controls.password.value ?? '';
    const trimmed = value.trim();

    if (!trimmed) {
      return { level: 0, label: 'Sin contraseña', className: 'empty' };
    }

    let score = 0;
    if (trimmed.length >= 8) score += 1;
    if (/[A-Z]/.test(trimmed)) score += 1;
    if (/[0-9]/.test(trimmed)) score += 1;
    if (/[^A-Za-z0-9]/.test(trimmed)) score += 1;

    const level = Math.min(score, 4);
    return {
      level,
      label: this.strengthLevels[Math.max(level - 1, 0)].label,
      className: level === 0 ? 'empty' : this.strengthLevels[Math.max(level - 1, 0)].className,
    };
  }

  get passwordStrengthSegments(): number[] {
    const level = this.passwordStrength.level;
    return [1, 2, 3, 4].map((segment) => (segment <= level ? 1 : 0));
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      // Sin toast: ToastComponent solo vive en MainLayout (sesión autenticada).
      markAllAsTouched(this.loginForm);
      scrollToFirstInvalid(this.host.nativeElement);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.loginForm.controls.email.value.trim().toLowerCase(),
      password: this.loginForm.controls.password.value,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.router.navigate([this.authService.postLoginPath()]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.resolveLoginErrorMessage(err);
        this.cdr.markForCheck();
      }
    });
  }

  private resolveLoginErrorMessage(err: unknown): string {
    const status = (err as { status?: number } | null)?.status;
    if (status === 0 || (typeof status === 'number' && status >= 500)) {
      return 'No pudimos conectar con el servidor. Intenta de nuevo.';
    }

    return 'El correo o la contraseña no son correctos.';
  }
}