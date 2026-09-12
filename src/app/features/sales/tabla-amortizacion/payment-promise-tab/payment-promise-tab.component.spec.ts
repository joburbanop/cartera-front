import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentPromiseTabComponent } from './payment-promise-tab.component';
import { PaymentPromise } from '../../../../core/models/payment-promise.model';

describe('PaymentPromiseTabComponent recorrido del recibo', () => {
  let fixture: ComponentFixture<PaymentPromiseTabComponent>;
  let component: PaymentPromiseTabComponent;

  const originPromise = (overrides: Partial<PaymentPromise> = {}): PaymentPromise => ({
    id: 1,
    contract_id: 10,
    payment_number: 1,
    expected_date: '2026-02-05',
    expected_amount: 1000,
    description: 'Promesa 1',
    is_paid: true,
    status: 'pagada',
    remaining_amount: 0,
    covered_amount: 1000,
    sources: [
      {
        transaction_id: 88,
        transaction_date: '2026-02-06',
        receipt_number: '0901',
        amount: 1000,
        also_applied_to: [
          { target_label: 'Promesa #2', installment_number: 2, amount: 500 },
        ],
        came_from: [],
      },
    ],
    ...overrides,
  });

  const destPromise = (): PaymentPromise => ({
    id: 2,
    contract_id: 10,
    payment_number: 2,
    expected_date: '2026-03-05',
    expected_amount: 1000,
    description: 'Promesa 2',
    is_paid: false,
    status: 'parcial',
    remaining_amount: 500,
    covered_amount: 500,
    sources: [
      {
        transaction_id: 88,
        transaction_date: '2026-02-06',
        receipt_number: '0901',
        amount: 500,
        also_applied_to: [],
        came_from: [
          { target_label: 'Promesa #1', installment_number: 1, amount: 500 },
        ],
      },
    ],
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentPromiseTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentPromiseTabComponent);
    component = fixture.componentInstance;
  });

  it('en la promesa destino dice que el recibo empezó en la promesa origen', () => {
    component.paymentPromises = [destPromise()];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.quota-details-toggle') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Recorrido del recibo');
    expect(text).toContain('Promesa #1');
    expect(text).toContain('Empezó en');
    expect(text).not.toContain('Viene de');

    const cells = fixture.nativeElement.querySelectorAll(
      '.quota-details-table tbody td',
    ) as NodeListOf<HTMLTableCellElement>;
    expect(cells[3].textContent?.trim()).toContain('Promesa #1');
    expect(cells[3].textContent).not.toContain('sobrante $');
  });

  it('en la promesa origen describe el resto del recibo en una sola columna', () => {
    component.paymentPromises = [originPromise()];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.quota-details-toggle') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll(
      '.quota-details-table tbody td',
    ) as NodeListOf<HTMLTableCellElement>;
    expect(cells[3].textContent?.trim()).toContain('Promesa #2');
    expect(cells[3].textContent).toContain('Empezó en esta promesa');
    expect(cells[3].textContent).not.toContain('sobrante $');
  });

  it('el recorrido no pega el monto de esta promesa al número de la origen', () => {
    const source = {
      transaction_id: 1,
      transaction_date: '2026-02-06',
      receipt_number: '1',
      amount: 100,
      also_applied_to: [{ target_label: 'Promesa #2', installment_number: 2, amount: 50 }],
      came_from: [{ target_label: 'Promesa #4', installment_number: 4, amount: 100 }],
    };

    const label = component.receiptRouteLabel(source, 11);
    expect(label).toContain('Promesa #4');
    expect(label).toContain('Empezó en');
    expect(label).not.toContain('sobrante $');
  });
});
