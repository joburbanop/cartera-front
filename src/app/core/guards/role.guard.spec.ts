import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AppRoles } from '../models/app-roles';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let auth: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    hasRole: ReturnType<typeof vi.fn>;
    homePath: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    router = { navigate: vi.fn() };
    auth = {
      isLoggedIn: vi.fn(() => true),
      hasRole: vi.fn(() => false),
      homePath: vi.fn(() => '/usuarios'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirige admin_sistema fuera del dashboard a /usuarios', () => {
    auth.hasRole.mockImplementation((role: string) => role === AppRoles.ADMIN_SISTEMA);
    auth.homePath.mockReturnValue('/usuarios');

    const route = {
      data: { roles: [AppRoles.SOCIO_GERENCIA, AppRoles.ADMINISTRADOR] },
    } as unknown as ActivatedRouteSnapshot;

    const allowed = TestBed.runInInjectionContext(() =>
      roleGuard(route, {} as RouterStateSnapshot),
    );

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/usuarios']);
  });
});
