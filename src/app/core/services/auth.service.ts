import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppRole, AppRoles } from '../models/app-roles';
import {
  ContractTabId,
  DEFAULT_CONTRACT_TAB_IDS,
  extractContractTabs,
  normalizeContractTabOrder,
} from '../utils/contract-tabs';

export const SESSION_EXPIRED_MESSAGE = 'La sesión expiró; vuelve a iniciar sesión';
export const SESSION_KEEP_ALIVE_MS = 60_000;
const SESSION_EXPIRED_NOTICE_KEY = 'auth_session_expired';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  static readonly SESSION_EXPIRED_MESSAGE = SESSION_EXPIRED_MESSAGE;

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private readonly tokenKey = 'auth_token';
  private readonly rolesKey = 'auth_roles';
  private readonly permissionsKey = 'auth_permissions';
  private readonly userIdKey = 'auth_user_id';
  private readonly userNameKey = 'auth_user_name';
  private readonly mustChangePasswordKey = 'auth_must_change_password';
  private readonly passwordChangedAtKey = 'auth_password_changed_at';
  private roles: string[] = this.readStoredRoles();
  private permissions: string[] = this.readStoredPermissions();
  private loggingOut = false;
  private profileSyncStarted = false;
  private inFlightWrites = 0;
  private sessionExpiryDeferred = false;
  private sessionExpiredNotified = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private readonly userNameState = signal<string | null>(this.readStoredName());
  readonly userName = this.userNameState.asReadonly();
  private readonly uiPreferencesState = signal<{ contractTabs: ContractTabId[] }>({
    contractTabs: [...DEFAULT_CONTRACT_TAB_IDS],
  });
  readonly uiPreferences = this.uiPreferencesState.asReadonly();
  readonly uiPreferencesReady = signal(false);

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        const payload = response?.data ?? response;
        const token = payload?.access_token ?? response?.access_token ?? null;
        const roles = payload?.roles ?? payload?.user?.roles ?? [];
        const permissions = payload?.permissions ?? payload?.user?.permissions ?? [];

        if (token) {
          this.resetSessionExpiryState();
          sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
          localStorage.setItem(this.tokenKey, token);
          this.setRoles(Array.isArray(roles) ? roles : []);
          this.setPermissions(Array.isArray(permissions) ? permissions : []);
          const userId = payload?.user?.id ?? null;
          if (userId != null) {
            localStorage.setItem(this.userIdKey, String(userId));
          }
          this.persistUserName(payload?.user?.name);
          this.persistPasswordFlags(payload?.user);
          this.persistUiPreferences(payload?.user?.ui_preferences);
          this.profileSyncStarted = true;
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

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  homePath(): string {
    return '/dashboard';
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

  beginWrite(): void {
    this.inFlightWrites += 1;
  }

  endWrite(): boolean {
    this.inFlightWrites = Math.max(0, this.inFlightWrites - 1);
    if (this.inFlightWrites > 0 || !this.sessionExpiryDeferred) {
      return false;
    }

    this.sessionExpiryDeferred = false;
    return true;
  }

  hasInFlightWrites(): boolean {
    return this.inFlightWrites > 0;
  }

  deferSessionExpiry(): void {
    this.sessionExpiryDeferred = true;
  }

  notifySessionExpired(): boolean {
    if (this.sessionExpiredNotified) {
      return false;
    }

    this.sessionExpiredNotified = true;
    sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1');
    return true;
  }

  consumeSessionExpiredNotice(): boolean {
    const raw = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
    sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    return raw === '1';
  }

  startSessionKeepAlive(): void {
    if (this.keepAliveTimer || !this.getToken()) {
      return;
    }

    this.pingSession();
    this.keepAliveTimer = setInterval(() => this.pingSession(), SESSION_KEEP_ALIVE_MS);
  }

  stopSessionKeepAlive(): void {
    if (!this.keepAliveTimer) {
      return;
    }

    clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  ensureProfile(): void {
    if (!this.getToken() || this.profileSyncStarted) {
      return;
    }

    this.profileSyncStarted = true;
    this.http.get(`${this.apiUrl}/me`).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response;
        const user = payload?.user ?? payload;
        this.persistUserName(user?.name ?? payload?.name);
        this.persistPasswordFlags(user);
        this.persistUiPreferences(user?.ui_preferences);
        const roles = payload?.roles ?? user?.roles;
        if (Array.isArray(roles)) {
          this.setRoles(roles.filter((role: unknown) => typeof role === 'string'));
        }
        const permissions = payload?.permissions ?? user?.permissions;
        if (Array.isArray(permissions)) {
          this.setPermissions(permissions.filter((permission: unknown) => typeof permission === 'string'));
        }
      },
      error: () => {
        this.uiPreferencesReady.set(true);
      },
    });
  }

  contractTabOrder(): ContractTabId[] {
    return this.uiPreferencesState().contractTabs;
  }

  updateContractTabs(order: readonly string[]): Observable<void> {
    const previous = this.contractTabOrder();
    const contractTabs = normalizeContractTabOrder(order);
    this.uiPreferencesState.set({ contractTabs });

    return this.http.patch(`${this.apiUrl}/me/preferences`, { contractTabs }).pipe(
      tap((response: any) => {
        const payload = response?.data ?? response;
        this.persistUiPreferences(payload?.ui_preferences ?? { contractTabs });
      }),
      catchError((error) => {
        this.uiPreferencesState.set({ contractTabs: previous });
        return throwError(() => error);
      }),
      map(() => undefined),
    );
  }

  resetContractTabs(): Observable<void> {
    return this.updateContractTabs(DEFAULT_CONTRACT_TAB_IDS);
  }

  private setRoles(roles: string[]): void {
    this.roles = roles;
    localStorage.setItem(this.rolesKey, JSON.stringify(roles));
  }

  private setPermissions(permissions: string[]): void {
    this.permissions = permissions.filter((permission) => typeof permission === 'string');
    localStorage.setItem(this.permissionsKey, JSON.stringify(this.permissions));
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
    this.stopSessionKeepAlive();
    this.resetSessionExpiryState();
    this.roles = [];
    this.permissions = [];
    this.userNameState.set(null);
    this.uiPreferencesState.set({ contractTabs: [...DEFAULT_CONTRACT_TAB_IDS] });
    this.uiPreferencesReady.set(false);
    this.profileSyncStarted = false;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolesKey);
    localStorage.removeItem(this.permissionsKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.userNameKey);
    localStorage.removeItem(this.mustChangePasswordKey);
    localStorage.removeItem(this.passwordChangedAtKey);
  }

  private resetSessionExpiryState(): void {
    this.inFlightWrites = 0;
    this.sessionExpiryDeferred = false;
    this.sessionExpiredNotified = false;
  }

  private pingSession(): void {
    if (!this.getToken() || this.loggingOut) {
      return;
    }

    this.http.get(`${this.apiUrl}/me`).subscribe({
      next: () => undefined,
      error: () => undefined,
    });
  }

  private persistUiPreferences(raw: unknown): void {
    this.uiPreferencesState.set({
      contractTabs: extractContractTabs(raw),
    });
    this.uiPreferencesReady.set(true);
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
    return this.readStoredStringList(this.rolesKey);
  }

  private readStoredPermissions(): string[] {
    return this.readStoredStringList(this.permissionsKey);
  }

  private readStoredStringList(key: string): string[] {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
}
