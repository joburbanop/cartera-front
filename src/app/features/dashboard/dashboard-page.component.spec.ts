import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppRoles } from '../../core/models/app-roles';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPageComponent);
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: {} }));
    httpMock.verify();
  });

  it('para admin_sistema carga el dashboard de sistema y no el de cartera', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMIN_SISTEMA);

    fixture.detectChanges();

    const requests = httpMock.match(() => true);
    const urls = requests.map((req) => req.request.url);
    expect(urls.some((url) => url.includes('/dashboard/system-users'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/cartera-mora'))).toBe(false);
    expect(urls.some((url) => url.includes('/dashboard/proyectos-activos'))).toBe(false);
    requests.forEach((req) => req.flush({ data: {} }));
  });

  it('para administrador carga el dashboard de negocio', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);

    fixture.detectChanges();

    const requests = httpMock.match(() => true);
    const urls = requests.map((req) => req.request.url);
    expect(urls.some((url) => url.includes('/dashboard/proyectos-activos'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/system-users'))).toBe(false);
    requests.forEach((req) => req.flush({ data: {} }));
  });
});
