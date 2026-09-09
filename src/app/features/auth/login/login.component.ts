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