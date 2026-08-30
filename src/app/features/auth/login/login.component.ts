import { Component, ElementRef, inject } from '@angular/core';
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
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;

        const backendErrors = err?.error?.errors ?? null;
        const firstMessage = backendErrors
          ? Object.values(backendErrors).flat().find((msg: unknown) => typeof msg === 'string')
          : null;

        this.errorMessage = firstMessage
          ? String(firstMessage)
          : 'Credenciales incorrectas o servidor no disponible.';

        console.error('Login error:', err);
      }
    });
  }
}