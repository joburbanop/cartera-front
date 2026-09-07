import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    router = { navigate: vi.fn() };
    localStorage.clear();
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_must_change_password', '1');

    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('muestra el texto de primer ingreso si nunca cambió la contraseña', () => {
    expect(fixture.nativeElement.textContent).toContain('Bienvenido al sistema');
    expect(fixture.nativeElement.textContent).toContain(
      'Como es tu primer ingreso, por seguridad te pedimos definir una contraseña personal que solo tú conozcas.',
    );
  });

  it('muestra el texto de reset si ya había una contraseña personal', () => {
    localStorage.setItem('auth_password_changed_at', '2026-01-15T10:00:00-05:00');
    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bienvenido de nuevo');
    expect(fixture.nativeElement.textContent).toContain(
      'Un administrador restableció tu acceso. Por seguridad, define una contraseña personal que solo tú conozcas.',
    );
  });

  it('envía el cambio y navega al home', () => {
    component.form.setValue({
      current_password: 'password',
      password: 'nuevaClave1',
      password_confirmation: 'nuevaClave1',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/me/password'));
    expect(req.request.method).toBe('PUT');
    req.flush({ data: { must_change_password: false } });

    expect(authService.mustChangePassword()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('muestra el error de contraseña actual junto al campo', () => {
    component.form.setValue({
      current_password: 'mala',
      password: 'nuevaClave1',
      password_confirmation: 'nuevaClave1',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/me/password'));
    req.flush(
      { errors: { current_password: ['La contraseña actual no es correcta.'] } },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    fixture.detectChanges();

    expect(component.form.controls.current_password.getError('server'))
      .toBe('La contraseña actual no es correcta.');
    expect(fixture.nativeElement.textContent).toContain('La contraseña actual no es correcta.');
    expect(component.errorMessage).toBe('');
  });

  it('detecta al escribir que las contraseñas nuevas no coinciden', () => {
    component.form.controls.password.setValue('nuevaClave1');
    component.form.controls.password_confirmation.setValue('otraClave1');
    component.form.controls.password_confirmation.markAsDirty();
    fixture.detectChanges();

    expect(component.form.controls.password_confirmation.hasError('mismatch')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('avisa el mínimo de 8 caracteres junto al campo', () => {
    expect(fixture.nativeElement.textContent).toContain('La contraseña debe tener al menos 8 caracteres.');

    component.form.controls.password.setValue('corta');
    component.form.controls.password.markAsDirty();
    fixture.detectChanges();

    expect(component.form.controls.password.hasError('minlength')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('La contraseña debe tener al menos 8 caracteres.');
  });

  it('rechaza una nueva contraseña igual a la actual', () => {
    component.form.controls.current_password.setValue('password');
    component.form.controls.password.setValue('password');
    component.form.controls.password.markAsDirty();
    fixture.detectChanges();

    expect(component.form.controls.password.hasError('sameAsCurrent')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('La nueva contraseña debe ser diferente a la actual.');
  });

  it('permite cerrar sesión', () => {
    component.logout();
    const req = httpMock.expectOne((request) => request.url.includes('/logout'));
    req.flush({ status: 'success' });

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(authService.isLoggedIn()).toBe(false);
  });
});
