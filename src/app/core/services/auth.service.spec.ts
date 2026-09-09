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
    httpMock.verify();
    localStorage.clear();
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
          ui_preferences: { contractTabs: custom },
        },
      },
    });

    expect(service.contractTabOrder()).toEqual(custom);
    expect(service.uiPreferencesReady()).toBe(true);
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
