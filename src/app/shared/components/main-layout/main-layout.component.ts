import { Component, ElementRef, OnInit, ViewChild, computed, effect, inject } from '@angular/core';
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
  @ViewChild('sidebarElement') sidebarElement?: ElementRef<HTMLElement>;

  private authService = inject(AuthService);
  private pageTitle = inject(PageTitleService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  breadcrumbs: Breadcrumb[] = [];
  isCollapsed = false;
  isMobileMenuOpen = false;
  isResizing = false;
  sidebarWidth = 260;

  private readonly collapsedSidebarKey = 'sidebar_collapsed';
  private readonly sidebarWidthKey = 'sidebar_width';
  private readonly sidebarMinWidth = 200;
  private readonly sidebarMaxWidth = 400;
  private resizeMoveListener?: (event: MouseEvent) => void;
  private resizeStopListener?: () => void;

  private routeLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'projects': 'Proyectos',
    'lots': 'Lotes',
    'clientes': 'Clientes',
    'usuarios': 'Usuarios',
    'bank-accounts': 'Cuentas bancarias',
    'contracts': 'Contratos'
  };

  constructor() {
    effect(() => {
      this.pageTitle.title();
      this.breadcrumbs = this.buildBreadcrumbs();
    });
  }

  ngOnInit() {
    this.authService.ensureProfile();
    this.readSidebarState();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.breadcrumbs = this.buildBreadcrumbs();
      this.closeMobileMenu();
    });
    this.breadcrumbs = this.buildBreadcrumbs();
  }

  readonly userName = computed(() => this.authService.getUserName() ?? '');
  readonly userInitials = computed(() => this.authService.getUserInitials());

  private readSidebarState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const collapsedStored = window.localStorage.getItem(this.collapsedSidebarKey);
    this.isCollapsed = collapsedStored === null ? false : collapsedStored === 'true';

    const storedWidth = window.localStorage.getItem(this.sidebarWidthKey);
    if (storedWidth !== null) {
      const parsed = Number(storedWidth);
      this.sidebarWidth = this.clampSidebarWidth(Number.isFinite(parsed) ? parsed : 260);
      return;
    }

    this.sidebarWidth = 260;
  }

  private clampSidebarWidth(value: number): number {
    return Math.min(this.sidebarMaxWidth, Math.max(this.sidebarMinWidth, value));
  }

  private applySidebarWidth(width: number): void {
    const clamped = this.clampSidebarWidth(width);

    if (this.sidebarElement?.nativeElement) {
      this.sidebarElement.nativeElement.style.width = `${clamped}px`;
      this.sidebarElement.nativeElement.style.minWidth = `${clamped}px`;
    }
  }

  isResizeEnabled(): boolean {
    return !this.isCollapsed && !this.isMobileViewport();
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  startResize(event: MouseEvent): void {
    if (!this.isResizeEnabled()) {
      return;
    }

    event.preventDefault();
    this.isResizing = true;
    const sidebarEl = this.sidebarElement?.nativeElement ?? document.querySelector('.sidebar') as HTMLElement | null;

    if (!sidebarEl) {
      return;
    }

    const sidebarRect = sidebarEl.getBoundingClientRect();
    this.resizeMoveListener = (mouseEvent: MouseEvent) => {
      if (this.isMobileViewport()) {
        this.stopResize();
        return;
      }

      const nextWidth = this.clampSidebarWidth(mouseEvent.clientX - sidebarRect.left);
      sidebarEl.style.width = `${nextWidth}px`;
      sidebarEl.style.minWidth = `${nextWidth}px`;
    };

    this.resizeStopListener = () => this.stopResize();

    document.addEventListener('mousemove', this.resizeMoveListener);
    document.addEventListener('mouseup', this.resizeStopListener);
    document.body.style.userSelect = 'none';
  }

  private stopResize(): void {
    if (!this.isResizing && !this.resizeMoveListener && !this.resizeStopListener) {
      return;
    }

    const currentWidth = this.sidebarElement?.nativeElement
      ? Number.parseFloat(this.sidebarElement.nativeElement.style.width || String(this.sidebarWidth))
      : this.sidebarWidth;

    this.isResizing = false;
    if (this.resizeMoveListener) {
      document.removeEventListener('mousemove', this.resizeMoveListener);
      this.resizeMoveListener = undefined;
    }
    if (this.resizeStopListener) {
      document.removeEventListener('mouseup', this.resizeStopListener);
      this.resizeStopListener = undefined;
    }
    document.body.style.userSelect = '';

    this.sidebarWidth = this.clampSidebarWidth(currentWidth || this.sidebarWidth);
    if (this.sidebarElement?.nativeElement) {
      this.sidebarElement.nativeElement.style.width = `${this.sidebarWidth}px`;
      this.sidebarElement.nativeElement.style.minWidth = `${this.sidebarWidth}px`;
    }
    this.saveSidebarWidth();
  }

  private saveSidebarWidth(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.sidebarWidthKey, String(this.clampSidebarWidth(this.sidebarWidth)));
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.collapsedSidebarKey, String(this.isCollapsed));
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

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

  hasVisibleItemsInSection(section: 'general' | 'inventario' | 'ventas' | 'finanzas' | 'administracion'): boolean {
    switch (section) {
      case 'general':
        return true;
      case 'inventario':
        return this.canViewBusinessNav();
      case 'ventas':
        return true;
      case 'finanzas':
        return this.canViewBusinessNav() && this.canViewClientes();
      case 'administracion':
        return this.canViewUsers();
      default:
        return false;
    }
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
