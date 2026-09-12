import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor sesión', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toast: ToastService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn() };
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('auth_token', 'tok');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    toast.toasts().forEach((item) => toast.dismiss(item.id));
    (toast as unknown as { toastsState: { set: (value: unknown[]) => void }; timers: Map<number, number[]> }).toastsState.set([]);
    (toast as unknown as { timers: Map<number, number[]> }).timers.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('en un 401 muestra el aviso y navega a login con expired=1', () => {
    http.get(`${environment.apiUrl}/contracts/1`).subscribe({
      error: () => undefined,
    });

    const req = httpMock.expectOne((request) => request.url.includes('/contracts/1'));
    req.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    const logout = httpMock.expectOne((request) => request.url.includes('/logout'));
    logout.flush({});

    expect(toast.toasts()[0]?.title).toBe(SESSION_EXPIRED_MESSAGE);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
  });

  it('no trata como fallo un POST 201 si un GET posterior recibe 401', () => {
    let paymentOk = false;

    http.post(`${environment.apiUrl}/contracts/1/payments`, {}).subscribe({
      next: () => {
        paymentOk = true;
      },
    });
    http.get(`${environment.apiUrl}/me`).subscribe({
      error: () => undefined,
    });

    const post = httpMock.expectOne((request) => request.method === 'POST' && request.url.includes('/payments'));
    const get = httpMock.expectOne((request) => request.method === 'GET' && request.url.includes('/me'));

    get.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toast.toasts().some((item) => item.title === SESSION_EXPIRED_MESSAGE)).toBe(false);

    post.flush({ data: { id: 99 } }, { status: 201, statusText: 'Created' });
    expect(paymentOk).toBe(true);

    const logout = httpMock.expectOne((request) => request.url.includes('/logout'));
    logout.flush({});

    expect(toast.toasts().some((item) => item.title === SESSION_EXPIRED_MESSAGE)).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
  });
});
