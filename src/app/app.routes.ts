import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
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
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];