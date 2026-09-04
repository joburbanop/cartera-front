import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

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
});
