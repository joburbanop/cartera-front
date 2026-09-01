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

  errorMessage = '';
  isLoading = false;

  onSubmit() {
    if (this.loginForm.invalid) {
      // Sin toast: ToastComponent solo vive en MainLayout (sesión autenticada).
      markAllAsTouched(this.loginForm);
      scrollToFirstInvalid(this.host.nativeElement);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login error:', err);

        this.errorMessage = this.resolveLoginErrorMessage(err);
        this.cdr.markForCheck();
      }
    });
  }

  private resolveLoginErrorMessage(err: unknown): string {
    const fallback = 'Credenciales incorrectas o servidor no disponible.';

    try {
      const body = (err as { error?: unknown } | null)?.error;

      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }

      if (!body || typeof body !== 'object') {
        return fallback;
      }

      const record = body as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message'].trim()) {
        return record['message'].trim();
      }

      const errors = record['errors'];
      if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
        return fallback;
      }

      for (const value of Object.values(errors as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }

        if (Array.isArray(value)) {
          const first = value.find((item) => typeof item === 'string' && item.trim());
          if (typeof first === 'string') {
            return first.trim();
          }
        }
      }

      return fallback;
    } catch {
      return fallback;
    }
  }
}