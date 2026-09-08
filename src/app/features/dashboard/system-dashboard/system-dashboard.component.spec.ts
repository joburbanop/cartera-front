import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SystemDashboardComponent } from './system-dashboard.component';

describe('SystemDashboardComponent', () => {
  let component: SystemDashboardComponent;
  let fixture: ComponentFixture<SystemDashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SystemDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('carga el resumen de usuarios y no pide endpoints de cartera', () => {
    fixture.detectChanges();

    const requests = httpMock.match(() => true);
    const urls = requests.map((req) => req.request.url);

    expect(urls.some((url) => url.includes('/dashboard/system-users'))).toBe(true);
    expect(urls.some((url) => url.includes('/dashboard/cartera-mora'))).toBe(false);
    expect(urls.some((url) => url.includes('/dashboard/clientes-totales'))).toBe(false);
    expect(requests).toHaveLength(1);

    requests[0].flush({
      data: {
        total_users: 4,
        pending_password_change: 2,
        by_role: {
          administrador: 2,
          admin_sistema: 1,
          socio_gerencia: 1,
        },
        recent_logins: [
          {
            id: 2,
            name: 'Ada Admin',
            email: 'ada.admin@example.com',
            roles: ['administrador'],
            last_login_at: '2026-09-07T18:00:00-05:00',
          },
        ],
        recently_created: [
          {
            id: 4,
            name: 'Nuevo Sin Acceso',
            email: 'nuevo.sinacceso@example.com',
            roles: ['administrador'],
            created_at: '2026-09-07T17:00:00-05:00',
          },
        ],
      },
    });

    fixture.detectChanges();

    expect(component.totalUsers).toBe(4);
    expect(component.pendingPasswordChange).toBe(2);
    expect(component.adminCount).toBe(2);
    expect(component.socioCount).toBe(1);
    expect(component.systemAdminCount).toBe(1);
    expect(component.recentLogins[0].name).toBe('Ada Admin');
    expect(component.recentlyCreated[0].name).toBe('Nuevo Sin Acceso');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Total usuarios');
    expect(text).toContain('Pendientes de cambiar contraseña');
    expect(text).toContain('Ada Admin');
    expect(text).toContain('Nuevo Sin Acceso');
    expect(text).toContain('1 admin sistema');
  });
});
