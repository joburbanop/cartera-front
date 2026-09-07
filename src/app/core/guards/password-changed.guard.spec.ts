import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { changePasswordGuard } from './change-password.guard';
import { passwordChangedGuard } from './password-changed.guard';

describe('password change guards', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let auth: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    mustChangePassword: ReturnType<typeof vi.fn>;
    homePath: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    router = { navigate: vi.fn() };
    auth = {
      isLoggedIn: vi.fn(() => true),
      mustChangePassword: vi.fn(() => false),
      homePath: vi.fn(() => '/dashboard'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('el layout redirige a /cambiar-contrasena si está marcado', () => {
    auth.mustChangePassword.mockReturnValue(true);

    const allowed = TestBed.runInInjectionContext(() =>
      passwordChangedGuard({} as never, {} as RouterStateSnapshot),
    );

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/cambiar-contrasena']);
  });

  it('la pantalla de cambio no se abre si ya no está marcado', () => {
    auth.mustChangePassword.mockReturnValue(false);

    const allowed = TestBed.runInInjectionContext(() =>
      changePasswordGuard({} as never, {} as RouterStateSnapshot),
    );

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
