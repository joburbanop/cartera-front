import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawerPagoComponent } from './drawer-pago.component';

describe('DrawerPagoComponent', () => {
  let component: DrawerPagoComponent;
  let fixture: ComponentFixture<DrawerPagoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerPagoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerPagoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('bankAccounts', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
