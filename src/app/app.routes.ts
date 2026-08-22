import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
        // Ruta para el dashboard
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { 
        // Ruta para las cuentas bancarias
        path: 'bank-accounts',
        loadComponent: () => import('./features/collection/bank-accounts/bank-accounts.component').then(m => m.BankAccountsComponent)
      },
      { 
        // Ruta para los proyectos (CORREGIDA)
        path: 'projects',
        loadComponent: () => import('./features/inventory/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {// Ruta para los lotes
        path: 'lots',
        loadComponent: () => import('./features/inventory/lots/lots.component').then(m => m.LotsComponent)
      },
      { 
        // Ruta para los Contratos de Venta
        path: 'contracts',
        loadComponent: () => import('./features/sales/contracts/contracts.component').then(m => m.ContractsComponent)
      },
      {//ruta para la amortización de un contrato
        path:'amortization/:id',
        loadComponent: () => import('./features/sales/tabla-amortizacion/tabla-amortizacion.component').then(m => m.AmortizationComponent)
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];