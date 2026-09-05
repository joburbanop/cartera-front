import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AmortizationTablePresenterComponent } from './amortization-table-presenter.component';

describe('AmortizationTablePresenterComponent', () => {
  let component: AmortizationTablePresenterComponent;
  let fixture: ComponentFixture<AmortizationTablePresenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmortizationTablePresenterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AmortizationTablePresenterComponent);
    component = fixture.componentInstance;
    component.currentView = 'venta';
  });

  it('muestra icono de vencimiento para cuotas mayores a 0, incluidas las pagadas', () => {
    component.selectable = true;
    component.installments = [
      {
        installment_number: 0,
        due_date: '2027-01-05',
        payment_date: null,
        installment_value: 100,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 100,
        remaining_balance: 100,
        status: 'pending',
      },
      {
        installment_number: 1,
        due_date: '2099-03-05',
        payment_date: null,
        installment_value: 100,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 100,
        remaining_balance: 100,
        status: 'pending',
      },
      {
        installment_number: 2,
        due_date: '2099-04-05',
        payment_date: null,
        installment_value: 100,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 100,
        remaining_balance: 100,
        status: 'paid',
      },
    ];

    fixture.detectChanges();

    const editButtons = fixture.debugElement.queryAll(By.css('[aria-label="Editar fecha de vencimiento"]'));
    expect(editButtons.length).toBe(2);

    const paymentButtons = fixture.debugElement.queryAll(By.css('[aria-label="Editar fecha de pago"]'));
    expect(paymentButtons.length).toBe(3);
  });

  it('oculta icono de editar cuando selectable es false (socio_gerencia)', () => {
    component.selectable = false;
    component.installments = [
      {
        installment_number: 3,
        due_date: '2099-05-05',
        payment_date: null,
        installment_value: 100,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 100,
        remaining_balance: 100,
        status: 'pending',
      },
    ];

    fixture.detectChanges();

    const editButtons = fixture.debugElement.queryAll(By.css('.due-date-edit-btn'));
    expect(editButtons.length).toBe(0);
  });

  it('muestra intereses y capital realmente pagados, no los del plan', () => {
    component.installments = [
      {
        installment_number: 1,
        due_date: '2099-03-05',
        payment_date: '2026-08-21',
        installment_value: 1714431.44,
        extra_payment: 0,
        interest_value: 1714431.44,
        principal_value: 1714431.44,
        interest_paid: 1400170.5,
        principal_paid: 99829.5,
        remaining_balance: 100,
        status: 'partial',
      },
    ];

    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const interestCell = cells[6].nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const principalCell = cells[7].nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(interestCell).toContain('1,400,170.50');
    expect(principalCell).toContain('99,829.50');
    expect(interestCell).not.toContain('1,714,431.44');
    expect(principalCell).not.toContain('1,714,431.44');
  });

  it('emite editDueDate al hacer clic en el icono', () => {
    component.selectable = true;
    component.installments = [
      {
        installment_number: 3,
        due_date: '2099-05-05',
        payment_date: null,
        installment_value: 100,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 100,
        remaining_balance: 100,
        status: 'pending',
      },
    ];

    let emittedInstallment: any = null;
    component.editDueDate.subscribe((fee) => {
      emittedInstallment = fee;
    });

    fixture.detectChanges();

    const editButton = fixture.debugElement.query(By.css('[aria-label="Editar fecha de vencimiento"]'));
    editButton.nativeElement.click();

    expect(emittedInstallment).toEqual(component.installments[0]);
  });
});
