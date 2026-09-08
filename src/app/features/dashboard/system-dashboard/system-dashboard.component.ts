import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { unwrapResource } from '../../../core/models/api-response';
import { rolesDisplayName } from '../../../core/models/app-roles';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

interface SystemUserRow {
  id: number;
  name: string;
  email: string;
  roles: string[];
  last_login_at?: string | null;
  created_at?: string | null;
}

interface SystemUsersSummary {
  total_users: number;
  pending_password_change: number;
  by_role: {
    administrador: number;
    admin_sistema: number;
    socio_gerencia: number;
  };
  recent_logins: SystemUserRow[];
  recently_created: SystemUserRow[];
}

@Component({
  selector: 'app-system-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './system-dashboard.component.html',
  styleUrls: ['./system-dashboard.component.scss'],
})
export class SystemDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  ready = false;
  totalUsers = 0;
  pendingPasswordChange = 0;
  adminCount = 0;
  socioCount = 0;
  systemAdminCount = 0;
  recentLogins: SystemUserRow[] = [];
  recentlyCreated: SystemUserRow[] = [];

  get userName(): string {
    return this.authService.getUserName() ?? '';
  }

  ngOnInit(): void {
    this.dashboardService.getSystemUsers().subscribe({
      next: (response) => {
        const payload = unwrapResource<SystemUsersSummary>(response);
        this.applySummary(payload);
        this.ready = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.ready = true;
        this.cdr.detectChanges();
      },
    });
  }

  roleLabel(roles: string[] | undefined): string {
    return rolesDisplayName(roles);
  }

  formatAccessAt(iso?: string | null): string {
    if (!iso) {
      return '';
    }

    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) {
      return '';
    }

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.round((startToday.getTime() - startTarget.getTime()) / 86400000);
    const time = target.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

    if (diffDays === 0) {
      return `Hoy, ${time}`;
    }
    if (diffDays === 1) {
      return `Ayer, ${time}`;
    }

    return target.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatCreatedAt(iso?: string | null): string {
    if (!iso) {
      return '';
    }

    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) {
      return '';
    }

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.round((startToday.getTime() - startTarget.getTime()) / 86400000);

    if (diffDays === 0) {
      return 'Hoy';
    }
    if (diffDays === 1) {
      return 'Ayer';
    }

    return target.toLocaleDateString('es-CO', { dateStyle: 'medium' });
  }

  private applySummary(payload: SystemUsersSummary | null): void {
    if (!payload) {
      return;
    }

    this.totalUsers = Number(payload.total_users ?? 0);
    this.pendingPasswordChange = Number(payload.pending_password_change ?? 0);
    this.adminCount = Number(payload.by_role?.administrador ?? 0);
    this.socioCount = Number(payload.by_role?.socio_gerencia ?? 0);
    this.systemAdminCount = Number(payload.by_role?.admin_sistema ?? 0);
    this.recentLogins = Array.isArray(payload.recent_logins) ? payload.recent_logins : [];
    this.recentlyCreated = Array.isArray(payload.recently_created) ? payload.recently_created : [];
  }
}
