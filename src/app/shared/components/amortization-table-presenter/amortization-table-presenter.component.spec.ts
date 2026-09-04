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

  it('muestra icono de editar solo para cuotas no pagadas y mayores a 0', () => {
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

    const editButtons = fixture.debugElement.queryAll(By.css('.due-date-edit-btn'));
    expect(editButtons.length).toBe(1);
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

    const editButton = fixture.debugElement.query(By.css('.due-date-edit-btn'));
    editButton.nativeElement.click();

    expect(emittedInstallment).toEqual(component.installments[0]);
  });
});
