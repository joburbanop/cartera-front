import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppRole, AppRoles } from '../models/app-roles';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private readonly tokenKey = 'auth_token';
  private readonly rolesKey = 'auth_roles';
  private readonly userIdKey = 'auth_user_id';
  private readonly userNameKey = 'auth_user_name';
  private readonly mustChangePasswordKey = 'auth_must_change_password';
  private readonly passwordChangedAtKey = 'auth_password_changed_at';
  private roles: string[] = this.readStoredRoles();
  private loggingOut = false;
  private readonly userNameState = signal<string | null>(this.readStoredName());
  readonly userName = this.userNameState.asReadonly();

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        const payload = response?.data ?? response;
        const token = payload?.access_token ?? response?.access_token ?? null;
        const roles = payload?.roles ?? payload?.user?.roles ?? [];

        if (token) {
          localStorage.setItem(this.tokenKey, token);
          this.setRoles(Array.isArray(roles) ? roles : []);
          const userId = payload?.user?.id ?? null;
          if (userId != null) {
            localStorage.setItem(this.userIdKey, String(userId));
          }
          this.persistUserName(payload?.user?.name);
          this.persistPasswordFlags(payload?.user);
          return;
        }

        this.clearSession();
      })
    );
  }

  logout(): Observable<void> {
    if (this.loggingOut) {
      this.clearSession();
      return of(undefined);
    }

    this.loggingOut = true;

    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      finalize(() => {
        this.clearSession();
        this.loggingOut = false;
      }),
      map(() => undefined)
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): string | null {
    return this.roles[0] ?? null;
  }

  hasRole(role: string | AppRole): boolean {
    return this.roles.includes(role);
  }

  homePath(): string {
    return this.hasRole(AppRoles.ADMIN_SISTEMA) ? '/usuarios' : '/dashboard';
  }

  postLoginPath(): string {
    return this.mustChangePassword() ? '/cambiar-contrasena' : this.homePath();
  }

  mustChangePassword(): boolean {
    return localStorage.getItem(this.mustChangePasswordKey) === '1';
  }

  setMustChangePassword(value: boolean): void {
    if (value) {
      localStorage.setItem(this.mustChangePasswordKey, '1');
      return;
    }

    localStorage.removeItem(this.mustChangePasswordKey);
  }

  hasPreviousPasswordChange(): boolean {
    return !!localStorage.getItem(this.passwordChangedAtKey);
  }

  setPasswordChangedAt(value: string | null | undefined): void {
    if (typeof value === 'string' && value.trim()) {
      localStorage.setItem(this.passwordChangedAtKey, value.trim());
      return;
    }

    localStorage.removeItem(this.passwordChangedAtKey);
  }

  changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/me/password`, payload).pipe(
      tap((response: any) => {
        const user = response?.data ?? response;
        this.persistPasswordFlags(user);
      })
    );
  }

  getRoles(): string[] {
    return [...this.roles];
  }

  getUserName(): string | null {
    return this.userNameState();
  }

  getUserInitials(): string {
    const name = this.userNameState();
    if (!name) {
      return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  getUserId(): number | null {
    const raw = localStorage.getItem(this.userIdKey);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  isLogoutRequest(url: string): boolean {
    return url.includes('/logout');
  }

  ensureProfile(): void {
    if (this.getUserName() || !this.getToken()) {
      return;
    }

    this.http.get(`${this.apiUrl}/me`).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        this.persistUserName(payload?.user?.name ?? payload?.name);
        this.persistPasswordFlags(payload?.user ?? payload);
      }
    });
  }

  private setRoles(roles: string[]): void {
    this.roles = roles;
    localStorage.setItem(this.rolesKey, JSON.stringify(roles));
  }

  private persistUserName(name: unknown): void {
    if (typeof name !== 'string' || !name.trim()) {
      return;
    }

    const trimmed = name.trim();
    localStorage.setItem(this.userNameKey, trimmed);
    this.userNameState.set(trimmed);
  }

  private readStoredName(): string | null {
    const name = localStorage.getItem(this.userNameKey);
    return name?.trim() || null;
  }

  private clearSession(): void {
    this.roles = [];
    this.userNameState.set(null);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolesKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.userNameKey);
    localStorage.removeItem(this.mustChangePasswordKey);
    localStorage.removeItem(this.passwordChangedAtKey);
  }

  private persistPasswordFlags(user: { must_change_password?: boolean; password_changed_at?: string | null } | null | undefined): void {
    if (!user || typeof user !== 'object') {
      return;
    }

    if (typeof user.must_change_password === 'boolean') {
      this.setMustChangePassword(user.must_change_password);
    }

    if ('password_changed_at' in user) {
      this.setPasswordChangedAt(user.password_changed_at);
    }
  }

  private readStoredRoles(): string[] {
    const raw = localStorage.getItem(this.rolesKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((role) => typeof role === 'string') : [];
    } catch {
      return [];
    }
  }
}
