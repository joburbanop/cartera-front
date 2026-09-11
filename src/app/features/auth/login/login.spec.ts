import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };
  const queryParams: Record<string, string> = {};

  beforeEach(async () => {
    router = { navigate: vi.fn() };
    Object.keys(queryParams).forEach((key) => delete queryParams[key]);
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(queryParams);
              },
            },
          },
        },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    localStorage.clear();
    localStorage.setItem('auth_token', 'fake-token');
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('envía el correo en minúsculas aunque el usuario lo escriba con mayúsculas', () => {
    component.loginForm.setValue({
      email: 'Santiago@Empresa.TEST',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));

    expect(req.request.body.email).toBe('santiago@empresa.test');
    req.flush({
      data: {
        access_token: 'tok-case',
        roles: ['administrador'],
        user: { id: 1, name: 'Santiago' },
      },
    });
  });

  it('should stop loading and show the backend error on invalid login without logging out', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.loginForm.setValue({
      email: 'bad@example.com',
      password: 'wrong-password'
    });

    const logoutSpy = vi.spyOn(authService, 'logout');

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));

    expect(req.request.method).toBe('POST');

    req.flush(
      {
        message: 'Las credenciales proporcionadas son incorrectas.',
        errors: {
          email: ['Las credenciales proporcionadas son incorrectas.']
        }
      },
      { status: 422, statusText: 'Unprocessable Content' }
    );

    expect(component.isLoading).toBeFalsy();
    expect(component.errorMessage).toBe('El correo o la contraseña no son correctos.');
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.login-error') as HTMLElement | null;
    expect(alert?.textContent).toContain('El correo o la contraseña no son correctos.');
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalsy();

    errorSpy.mockRestore();
  });

  it('should stop loading and use the fallback when the 422 body has no extractable message', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.loginForm.setValue({
      email: 'bad@example.com',
      password: 'wrong-password'
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));

    req.flush({ status: 'error', errors: null }, { status: 422, statusText: 'Unprocessable Content' });

    expect(component.isLoading).toBeFalsy();
    expect(component.errorMessage).toBe('El correo o la contraseña no son correctos.');

    errorSpy.mockRestore();
  });

  it('distingue un fallo de servidor de un error de credenciales', () => {
    component.loginForm.setValue({
      email: 'admin@admin.com',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({ status: 'error' }, { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('No pudimos conectar con el servidor. Intenta de nuevo.');
  });

  it('tras login de administrador navega al dashboard', () => {
    component.loginForm.setValue({
      email: 'admin@admin.com',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({
      data: {
        access_token: 'tok-admin',
        roles: ['administrador'],
        user: { id: 1, name: 'Administrador' },
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('tras login de admin_sistema navega a /dashboard', () => {
    component.loginForm.setValue({
      email: 'sistema@cartera.test',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({
      data: {
        access_token: 'tok-sistema',
        roles: ['admin_sistema'],
        user: { id: 3, name: 'Admin Sistema' },
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('tras login con must_change_password navega a /cambiar-contrasena', () => {
    component.loginForm.setValue({
      email: 'admin@admin.com',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({
      data: {
        access_token: 'tok-force',
        roles: ['administrador'],
        user: { id: 1, name: 'Administrador', must_change_password: true, password_changed_at: null },
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/cambiar-contrasena']);
    expect(authService.mustChangePassword()).toBe(true);
    expect(authService.hasPreviousPasswordChange()).toBe(false);
  });

  it('tras login con reset de admin conserva password_changed_at', () => {
    component.loginForm.setValue({
      email: 'admin@admin.com',
      password: 'password',
    });

    component.onSubmit();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({
      data: {
        access_token: 'tok-reset',
        roles: ['administrador'],
        user: {
          id: 1,
          name: 'Administrador',
          must_change_password: true,
          password_changed_at: '2026-01-15T10:00:00-05:00',
        },
      },
    });

    expect(router.navigate).toHaveBeenCalledWith(['/cambiar-contrasena']);
    expect(authService.mustChangePassword()).toBe(true);
    expect(authService.hasPreviousPasswordChange()).toBe(true);
  });

  it('muestra el aviso de sesión expirada al volver con expired=1', () => {
    queryParams['expired'] = '1';
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe(SESSION_EXPIRED_MESSAGE);
    const alert = fixture.nativeElement.querySelector('.login-error') as HTMLElement | null;
    expect(alert?.textContent).toContain(SESSION_EXPIRED_MESSAGE);
  });

  it('recupera el aviso de sesión expirada desde sessionStorage', () => {
    sessionStorage.setItem('auth_session_expired', '1');
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe(SESSION_EXPIRED_MESSAGE);
    expect(sessionStorage.getItem('auth_session_expired')).toBeNull();
  });
});
