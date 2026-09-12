import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentConfirmModalComponent, PaymentConfirmSummary } from './payment-confirm-modal.component';

describe('PaymentConfirmModalComponent', () => {
  let component: PaymentConfirmModalComponent;
  let fixture: ComponentFixture<PaymentConfirmModalComponent>;

  const summary: PaymentConfirmSummary = {
    kind: 'payment',
    contractLabel: 'Contrato 12 · Lote 7 · Ana Pérez',
    amount: 2100000,
    transactionDate: '2026-09-10',
    paymentMethod: 'cash',
    receiptNumber: '0258',
    installmentsLabel: 'Imputación FIFO / flujo general',
    split: { toDownPayment: 200000, toInstallments: 1900000 },
    surplusActionLabel: 'Abono a capital',
    residualPending: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentConfirmModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentConfirmModalComponent);
    component = fixture.componentInstance;
  });

  it('no se muestra cerrado', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="payment-confirm-modal"]')).toBeNull();
  });

  it('muestra el resumen y no confirma al volver', () => {
    const confirmed: void[] = [];
    const returned: void[] = [];
    component.confirm.subscribe(() => confirmed.push(undefined));
    component.goBack.subscribe(() => returned.push(undefined));

    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Confirmar pago');
    expect(text).toContain('Contrato 12 · Lote 7 · Ana Pérez');
    expect(text).toMatch(/2[.,\s]?100[.,\s]?000/);
    expect(text).toContain('2026-09-10');
    expect(text).toContain('Efectivo');
    expect(text).toContain('0258');
    expect(text).toContain('Imputación FIFO / flujo general');
    expect(text).toMatch(/Inicial \$ 200[.,\s]?000/);
    expect(text).toMatch(/Regulares \$ 1[.,\s]?900[.,\s]?000/);
    expect(text).toContain('Abono a capital');

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();

    expect(returned.length).toBe(1);
    expect(confirmed.length).toBe(0);
  });

  it('emite confirm al pulsar Confirmar pago', () => {
    const confirmed: void[] = [];
    component.confirm.subscribe(() => confirmed.push(undefined));

    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    const primary = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.classList.contains('btn-primary'));
    primary?.click();

    expect(confirmed.length).toBe(1);
  });
});
