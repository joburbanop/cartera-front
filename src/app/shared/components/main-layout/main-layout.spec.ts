import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppRoles } from '../../../core/models/app-roles';
import { AuthService } from '../../../core/services/auth.service';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  function stubRole(role: string): void {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((candidate) => candidate === role);
    vi.spyOn(auth, 'getRoles').mockReturnValue([role]);
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide empty finance section for non-admin business roles', () => {
    component.canViewBusinessNav = () => true;
    component.canViewClientes = () => false;

    expect(component.hasVisibleItemsInSection('finanzas')).toBe(false);
  });

  it('should show finance section when at least one visible item exists for the role', () => {
    component.canViewBusinessNav = () => true;
    component.canViewClientes = () => true;

    expect(component.hasVisibleItemsInSection('finanzas')).toBe(true);
  });

  it('should read a stored sidebar width and keep it within bounds', () => {
    localStorage.setItem('sidebar_width', '520');

    component.ngOnInit();

    expect(component.sidebarWidth).toBe(400);
  });

  it('admin_sistema solo ve Dashboard y Usuarios', () => {
    stubRole(AppRoles.ADMIN_SISTEMA);

    expect(component.hasVisibleItemsInSection('general')).toBe(true);
    expect(component.hasVisibleItemsInSection('administracion')).toBe(true);
    expect(component.hasVisibleItemsInSection('inventario')).toBe(false);
    expect(component.hasVisibleItemsInSection('ventas')).toBe(false);
    expect(component.hasVisibleItemsInSection('finanzas')).toBe(false);
    expect(component.canViewBusinessNav()).toBe(false);
    expect(component.canViewSearch()).toBe(false);
    expect(component.roleLabel()).toBe('Admin sistema');
  });

  it('administrador ve el menú de negocio y no Usuarios', () => {
    stubRole(AppRoles.ADMINISTRADOR);

    expect(component.hasVisibleItemsInSection('general')).toBe(true);
    expect(component.hasVisibleItemsInSection('inventario')).toBe(true);
    expect(component.hasVisibleItemsInSection('ventas')).toBe(true);
    expect(component.hasVisibleItemsInSection('finanzas')).toBe(true);
    expect(component.hasVisibleItemsInSection('administracion')).toBe(false);
    expect(component.canViewClientes()).toBe(true);
    expect(component.roleLabel()).toBe('Administrador');
  });

  it('socio_gerencia ve inventario y contratos, no clientes ni usuarios', () => {
    stubRole(AppRoles.SOCIO_GERENCIA);

    expect(component.hasVisibleItemsInSection('general')).toBe(true);
    expect(component.hasVisibleItemsInSection('inventario')).toBe(true);
    expect(component.hasVisibleItemsInSection('ventas')).toBe(true);
    expect(component.hasVisibleItemsInSection('finanzas')).toBe(false);
    expect(component.hasVisibleItemsInSection('administracion')).toBe(false);
    expect(component.canViewClientes()).toBe(false);
    expect(component.canViewUsers()).toBe(false);
    expect(component.roleLabel()).toBe('Socio gerencia');
  });
});
