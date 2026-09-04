import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppRoles } from './core/models/app-roles';

const businessViewerRoles = [AppRoles.SOCIO_GERENCIA, AppRoles.ADMINISTRADOR];
const administradorOnly = [AppRoles.ADMINISTRADOR];
const adminSistemaOnly = [AppRoles.ADMIN_SISTEMA];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'bank-accounts',
        canActivate: [roleGuard],
        data: { roles: administradorOnly },
        loadComponent: () => import('./features/collection/bank-accounts/bank-accounts.component').then(m => m.BankAccountsComponent)
      },
      {
        path: 'projects',
        canActivate: [roleGuard],
        data: { roles: businessViewerRoles },
        loadComponent: () => import('./features/inventory/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'lots',
        canActivate: [roleGuard],
        data: { roles: businessViewerRoles },
        loadComponent: () => import('./features/inventory/lots/lots.component').then(m => m.LotsComponent)
      },
      {
        path: 'contracts',
        canActivate: [roleGuard],
        data: { roles: businessViewerRoles },
        loadComponent: () => import('./features/sales/contracts/contracts.component').then(m => m.ContractsComponent)
      },
      {
        path: 'amortization/:id',
        canActivate: [roleGuard],
        data: { roles: businessViewerRoles },
        loadComponent: () => import('./features/sales/tabla-amortizacion/tabla-amortizacion.component').then(m => m.AmortizationComponent)
      },
      {
        path: 'clientes',
        canActivate: [roleGuard],
        data: { roles: administradorOnly },
        loadComponent: () => import('./features/clients/clients.component').then(m => m.ClientsComponent)
      },
      {
        path: 'clientes/:id',
        canActivate: [roleGuard],
        data: { roles: administradorOnly, title: 'Ficha de cliente' },
        loadComponent: () => import('./features/clients/client-detail/client-detail.component').then(m => m.ClientDetailComponent)
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard],
        data: { roles: adminSistemaOnly },
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
