import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/services/auth.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: {} }));
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('con socio_gerencia no dispara llamadas a /customers y pide el resumen de dashboard', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === 'socio_gerencia');
    vi.spyOn(auth, 'getRole').mockReturnValue('socio_gerencia');
    vi.spyOn(auth, 'getRoles').mockReturnValue(['socio_gerencia']);

    fixture.detectChanges();

    const requests = httpMock.match(() => true);
    const urls = requests.map((req) => req.request.url);

    expect(urls.some((url) => url.includes('/dashboard/clientes-totales'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/proyectos-activos'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/contratos-por-estado'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/lotes-por-estado'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/recaudo-mensual'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/cartera-vencida-resumen'))).toBe(true);
    expect(urls.some((url) => /\/customers(?:\?|$)/.test(url))).toBe(false);
    expect(urls.some((url) => /\/lots(?:\?|$)/.test(url))).toBe(false);
    expect(urls.some((url) => /\/contracts(?:\?|$)/.test(url))).toBe(false);
    expect(urls.some((url) => /\/projects(?:\?|$)/.test(url))).toBe(false);

    const resumen = requests.find((req) => req.request.url.includes('/dashboard/clientes-totales'));
    resumen?.flush({ data: { total_clientes: 4 } });

    requests
      .filter((req) => req !== resumen)
      .forEach((req) => req.flush({ data: [] }));

    expect(component.totalClientes).toBe(4);
  });
});
