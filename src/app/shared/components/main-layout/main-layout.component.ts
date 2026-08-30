import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { AppRoles } from '../../../core/models/app-roles';
import { ToastComponent } from '../toast/toast.component';
import { GlobalSearchComponent } from '../global-search/global-search.component';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, ToastComponent, GlobalSearchComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private pageTitle = inject(PageTitleService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  breadcrumbs: Breadcrumb[] = [];

  private routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'projects': 'Proyectos',
    'lots': 'Lotes',
    'clientes': 'Clientes',
    'usuarios': 'Usuarios',
    'bank-accounts': 'Cuentas bancarias',
    'contracts': 'Contratos',
    'historial-pagos': 'Historial de pagos'
  };

  constructor() {
    effect(() => {
      this.pageTitle.title();
      this.breadcrumbs = this.buildBreadcrumbs();
    });
  }

  ngOnInit() {
    this.authService.ensureProfile();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumbs = this.buildBreadcrumbs();
    });
    this.breadcrumbs = this.buildBreadcrumbs();
  }

  readonly userName = computed(() => this.authService.getUserName() ?? '');
  readonly userInitials = computed(() => this.authService.getUserInitials());

  private buildBreadcrumbs(): Breadcrumb[] {
    const root: ActivatedRoute = this.activatedRoute.root;
    const crumbs: Breadcrumb[] = [{ label: 'Panel', url: '/' }];
    let currentUrl = '';

    const getChild = (route: ActivatedRoute): void => {
      if (!route.firstChild) return;

      const child = route.firstChild;
      const segment = child.snapshot.url.map(s => s.path).join('/');

      if (segment) {
        currentUrl += '/' + segment;

        let label = this.routeLabels[segment] || segment;

        if (child.snapshot.data && child.snapshot.data['title']) {
          label = child.snapshot.data['title'];
        } else if (segment.startsWith('amortization')) {
          label = this.pageTitle.title() || 'Contrato';
        } else if (child.snapshot.queryParams['projectName']) {
          const rawName = decodeURIComponent(child.snapshot.queryParams['projectName']);
          label = `${this.routeLabels[segment] || segment}: ${rawName}`;
        } else if (child.snapshot.queryParams['search']) {
          const rawSearch = decodeURIComponent(child.snapshot.queryParams['search']);
          label = `${label} (${rawSearch})`;
        }

        crumbs.push({ label, url: currentUrl });
      }

      getChild(child);
    };

    getChild(root);
    return crumbs;
  }

  canViewSearch(): boolean {
    return !this.authService.hasRole(AppRoles.ADMIN_SISTEMA);
  }

  canViewBusinessNav(): boolean {
    return this.authService.hasRole(AppRoles.SOCIO_GERENCIA)
      || this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  canViewClientes(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  canViewUsers(): boolean {
    return this.authService.hasRole(AppRoles.ADMIN_SISTEMA);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
