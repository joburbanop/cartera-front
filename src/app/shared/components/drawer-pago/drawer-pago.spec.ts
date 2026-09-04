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

  it('en preventa etiqueta el total como pendiente a la fecha', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('overdueTotalAmount', 3000000);
    fixture.componentRef.setInput('overdueTotalIsPreventa', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Total pendiente a la fecha');
    expect(fixture.nativeElement.textContent).not.toContain('Total vencido a la fecha');
  });

  it('fuera de preventa conserva Total vencido a la fecha', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('overdueTotalAmount', 1000000);
    fixture.componentRef.setInput('overdueTotalIsPreventa', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Total vencido a la fecha');
  });
});
