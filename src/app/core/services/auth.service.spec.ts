import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { DEFAULT_CONTRACT_TAB_IDS } from '../utils/contract-tabs';

describe('AuthService preferencias de UI', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopSessionKeepAlive();
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hidrata el orden de pestañas desde el login', () => {
    const custom = [
      'hoja-vida',
      'bitacora-contrato',
      'promesa',
      'amortizacion',
      'bitacora-cliente',
    ];

    service.login({ email: 'admin@admin.com', password: 'secret' }).subscribe();
    const req = httpMock.expectOne((request) => request.url.includes('/login'));
    req.flush({
      data: {
        access_token: 'tok',
        roles: ['administrador'],
        user: {
          id: 1,
          name: 'Admin',
          permissions: ['payments.reverse', 'payments.register'],
          ui_preferences: { contractTabs: custom },
        },
      },
    });

    expect(service.contractTabOrder()).toEqual(custom);
    expect(service.uiPreferencesReady()).toBe(true);
    expect(service.hasPermission('payments.reverse')).toBe(true);
  });

  it('pide /me una vez por sesión aunque ya haya nombre guardado', () => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user_name', 'Admin');
    service.ensureProfile();
    service.ensureProfile();

    const req = httpMock.expectOne((request) => request.url.includes('/me') && request.method === 'GET');
    req.flush({
      data: {
        user: {
          name: 'Admin',
          ui_preferences: { contractTabs: ['bitacora-cliente'] },
        },
      },
    });

    expect(service.contractTabOrder()[0]).toBe('bitacora-cliente');
    httpMock.expectNone((request) => request.url.includes('/me') && request.method === 'GET');
  });

  it('guarda el orden y lo revierte si el PATCH falla', () => {
    const next = [
      'hoja-vida',
      'amortizacion',
      'promesa',
      'bitacora-contrato',
      'bitacora-cliente',
    ];
    let failed = false;

    service.updateContractTabs(next).subscribe({
      error: () => {
        failed = true;
      },
    });

    expect(service.contractTabOrder()).toEqual(next);
    const req = httpMock.expectOne((request) => request.url.includes('/me/preferences'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ message: 'error' }, { status: 500, statusText: 'Error' });

    expect(failed).toBe(true);
    expect(service.contractTabOrder()).toEqual([...DEFAULT_CONTRACT_TAB_IDS]);
  });
});

describe('AuthService sesión', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopSessionKeepAlive();
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('hace ping a /me al iniciar keep-alive y cada 60s', () => {
    vi.useFakeTimers();
    localStorage.setItem('auth_token', 'tok');

    service.startSessionKeepAlive();
    const first = httpMock.expectOne((request) => request.url.includes('/me') && request.method === 'GET');
    first.flush({ data: { user: { name: 'Admin' } } });

    vi.advanceTimersByTime(60_000);
    const second = httpMock.expectOne((request) => request.url.includes('/me') && request.method === 'GET');
    second.flush({ data: { user: { name: 'Admin' } } });

    service.stopSessionKeepAlive();
    vi.advanceTimersByTime(60_000);
    httpMock.expectNone((request) => request.url.includes('/me') && request.method === 'GET');
  });

  it('endWrite indica expirar solo si había un 401 diferido', () => {
    service.beginWrite();
    service.deferSessionExpiry();
    expect(service.endWrite()).toBe(true);
    expect(service.endWrite()).toBe(false);
  });

  it('notifySessionExpired es idempotente y deja el aviso para el login', () => {
    expect(service.notifySessionExpired()).toBe(true);
    expect(service.notifySessionExpired()).toBe(false);
    expect(service.consumeSessionExpiredNotice()).toBe(true);
    expect(service.consumeSessionExpiredNotice()).toBe(false);
  });
});
