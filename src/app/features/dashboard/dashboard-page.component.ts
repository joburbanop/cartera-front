import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppRoles } from '../../core/models/app-roles';
import { AuthService } from '../../core/services/auth.service';
import { DashboardComponent } from './dashboard.component';
import { SystemDashboardComponent } from './system-dashboard/system-dashboard.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, DashboardComponent, SystemDashboardComponent],
  template: `
    <app-system-dashboard *ngIf="isAdminSistema(); else businessDashboard" />
    <ng-template #businessDashboard>
      <app-dashboard />
    </ng-template>
  `,
})
export class DashboardPageComponent {
  private authService = inject(AuthService);

  isAdminSistema(): boolean {
    return this.authService.hasRole(AppRoles.ADMIN_SISTEMA);
  }
}
