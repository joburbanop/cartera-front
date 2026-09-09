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

  it('en cuotas cobradas muestra intereses y amortización pagados, no el teórico', () => {
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

    const header = fixture.debugElement.queryAll(By.css('thead th')).map((th) => th.nativeElement.textContent.trim());
    expect(header).toContain('Amortización');
    expect(header).not.toContain('Capital Pagado');

    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const interestCell = cells[6].nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const principalCell = cells[7].nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(interestCell).toContain('1,400,170.50');
    expect(principalCell).toContain('99,829.50');
    expect(interestCell).not.toContain('1,714,431.44');
    expect(principalCell).not.toContain('1,714,431.44');
  });

  it('en cuotas pendientes muestra el desglose teórico del plan', () => {
    component.installments = [
      {
        installment_number: 3,
        due_date: '2027-09-15',
        payment_date: null,
        installment_value: 2268026.09,
        extra_payment: 0,
        interest_value: 994490.96,
        principal_value: 1273535.13,
        interest_paid: 0,
        principal_paid: 0,
        remaining_balance: 100,
        status: 'pending',
      },
    ];

    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const interestCell = cells[6].nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const principalCell = cells[7].nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(interestCell).toContain('994,490.96');
    expect(principalCell).toContain('1,273,535.13');
  });

  it('en cuota inicial parcial muestra el capital cobrado (pactada − quota_debt)', () => {
    component.installments = [
      {
        installment_number: 0,
        due_date: '2026-05-26',
        payment_date: '2026-07-14',
        installment_value: 16077970,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 16077970,
        interest_paid: 0,
        principal_paid: 0,
        quota_debt: 5577970,
        remaining_balance: 144701730,
        status: 'partial',
      },
    ];

    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const interestCell = cells[6].nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const principalCell = cells[7].nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(interestCell).toContain('0.00');
    expect(principalCell).toContain('10,500,000.00');
    expect(principalCell).not.toContain('16,077,970.00');
  });

  it('mantiene intereses en 0 cuando el plan y lo cobrado son 0', () => {
    component.installments = [
      {
        installment_number: 1,
        due_date: '2025-12-01',
        payment_date: '2025-12-01',
        installment_value: 20731800,
        extra_payment: 0,
        interest_value: 0,
        principal_value: 20731800,
        interest_paid: 0,
        principal_paid: 20731800,
        remaining_balance: 103659000,
        status: 'paid',
      },
    ];

    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    const interestCell = cells[6].nativeElement.textContent.replace(/\s+/g, ' ').trim();
    const principalCell = cells[7].nativeElement.textContent.replace(/\s+/g, ' ').trim();

    expect(interestCell).toContain('0.00');
    expect(principalCell).toContain('20,731,800.00');
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

  it('muestra Parcial si hay pago incompleto aunque la fecha ya venció', () => {
    component.installments = [
      {
        installment_number: 4,
        due_date: '2026-02-05',
        payment_date: '2026-05-29',
        installment_value: 2106024.23,
        extra_payment: 0,
        interest_value: 911637.25,
        principal_value: 1194386.98,
        interest_paid: 911637.25,
        principal_paid: 520692.06,
        quota_debt: 673694.92,
        remaining_balance: 100,
        status: 'overdue',
      },
    ];

    fixture.detectChanges();

    expect(component.displayStatus(component.installments[0])).toBe('partial');
    expect(fixture.nativeElement.textContent).toContain('Parcial');
  });

  it('paid manda sobre un pago que ya cerró la cuota', () => {
    component.installments = [
      {
        installment_number: 1,
        due_date: '2020-01-01',
        installment_value: 100,
        extra_payment: 0,
        interest_paid: 20,
        principal_paid: 80,
        quota_debt: 0,
        remaining_balance: 0,
        status: 'paid',
      },
    ];

    fixture.detectChanges();

    expect(component.displayStatus(component.installments[0])).toBe('paid');
    expect(fixture.nativeElement.textContent).toContain('Pagada');
  });

  it('muestra Ver detalles solo cuando la cuota tiene sources', () => {
    component.installments = [
      {
        id: 10,
        installment_number: 1,
        due_date: '2026-02-05',
        installment_value: 100,
        extra_payment: 0,
        interest_paid: 20,
        principal_paid: 80,
        quota_debt: 0,
        remaining_balance: 0,
        status: 'paid',
        sources: [
          {
            transaction_id: 77,
            transaction_date: '2026-02-06',
            receipt_number: '0433',
            amount: 100,
            also_applied_to: [
              { target_label: 'Cuota inicial', installment_number: 0, amount: 3000000 },
            ],
          },
        ],
      },
      {
        id: 11,
        installment_number: 2,
        due_date: '2026-03-05',
        installment_value: 100,
        extra_payment: 0,
        quota_debt: 100,
        remaining_balance: 100,
        status: 'pending',
        sources: [],
      },
    ];

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.quota-details-toggle') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(1);

    buttons[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('cuota inicial');
    expect(fixture.nativeElement.textContent).toContain('0433');
  });
});

