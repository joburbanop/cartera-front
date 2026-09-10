import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { NavigationTrailService } from '../../../core/services/navigation-trail.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { AppRoles, roleDisplayName } from '../../../core/models/app-roles';
import { ToastComponent } from '../toast/toast.component';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { AppBreadcrumb, buildAppBreadcrumbs } from '../../../core/utils/breadcrumbs';

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
  private trail = inject(NavigationTrailService);
  private router = inject(Router);

  readonly expandedSidebarWidth = 240;

  isCollapsed = false;
  isHoverExpanded = false;
  isMobileMenuOpen = false;
  private readonly currentUrl = signal(this.router.url);

  private readonly collapsedSidebarKey = 'sidebar_collapsed';

  readonly breadcrumbs = computed(() => {
    this.currentUrl();
    this.pageTitle.title();
    this.trail.hubs();
    return this.buildBreadcrumbs(this.currentUrl());
  });

  ngOnInit() {
    this.authService.ensureProfile();
    this.readSidebarState();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.trail.captureFromRouter();
      this.currentUrl.set(event.urlAfterRedirects);
      this.closeMobileMenu();
    });
  }

  readonly userName = computed(() => this.authService.getUserName() ?? '');
  readonly userInitials = computed(() => this.authService.getUserInitials());

  get isSidebarCollapsed(): boolean {
    return this.isCollapsed && !this.isHoverExpanded;
  }

  private readSidebarState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const collapsedStored = window.localStorage.getItem(this.collapsedSidebarKey);
    this.isCollapsed = collapsedStored === null ? true : collapsedStored === 'true';
  }

  isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  onSidebarMouseEnter(): void {
    if (this.isMobileViewport()) {
      return;
    }

    this.isHoverExpanded = this.isCollapsed;
  }

  onSidebarMouseLeave(): void {
    if (this.isMobileViewport()) {
      return;
    }

    this.isHoverExpanded = false;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.isHoverExpanded = false;
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

  private buildBreadcrumbs(url: string = this.currentUrl()): AppBreadcrumb[] {
    const tree = this.router.parseUrl(url);
    const path = '/' + (tree.root.children['primary']?.segments.map((segment) => segment.path).join('/') ?? '');

    return buildAppBreadcrumbs(path, tree.queryParams, this.pageTitle.title(), this.trail.hubs());
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

  roleLabel(): string {
    if (this.authService.hasRole(AppRoles.ADMIN_SISTEMA)) {
      return roleDisplayName(AppRoles.ADMIN_SISTEMA);
    }

    if (this.authService.hasRole(AppRoles.ADMINISTRADOR)) {
      return roleDisplayName(AppRoles.ADMINISTRADOR);
    }

    return roleDisplayName(AppRoles.SOCIO_GERENCIA);
  }

  hasVisibleItemsInSection(section: 'general' | 'inventario' | 'ventas' | 'finanzas' | 'administracion'): boolean {
    switch (section) {
      case 'general':
        return true;
      case 'inventario':
        return this.canViewBusinessNav();
      case 'ventas':
        return this.canViewBusinessNav();
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
