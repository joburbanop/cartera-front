import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    expect(component.errorMessage).toBe('Las credenciales proporcionadas son incorrectas.');
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.login-error') as HTMLElement | null;
    expect(alert?.textContent).toContain('Las credenciales proporcionadas son incorrectas.');
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
    expect(component.errorMessage).toBe('Credenciales incorrectas o servidor no disponible.');

    errorSpy.mockRestore();
  });
});
