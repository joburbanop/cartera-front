import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentPromiseTabComponent } from './payment-promise-tab.component';
import { PaymentPromise } from '../../../../core/models/payment-promise.model';

describe('PaymentPromiseTabComponent Viene de', () => {
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

  it('en la promesa destino muestra Viene de y deja También cubrió vacío', () => {
    component.paymentPromises = [destPromise()];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.quota-details-toggle') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Viene de');
    expect(text).toContain('Promesa #1');
    expect(text).toContain('sobrante');

    const cells = fixture.nativeElement.querySelectorAll(
      '.quota-details-table tbody td',
    ) as NodeListOf<HTMLTableCellElement>;
    expect(cells[3].textContent?.trim()).toBe('—');
    expect(cells[4].textContent?.trim()).toContain('Promesa #1');
    expect(cells[4].textContent?.trim()).toContain('sobrante $');
  });

  it('en la promesa origen muestra También cubrió y deja Viene de vacío', () => {
    component.paymentPromises = [originPromise()];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.quota-details-toggle') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll(
      '.quota-details-table tbody td',
    ) as NodeListOf<HTMLTableCellElement>;
    expect(cells[3].textContent?.trim()).toContain('Promesa #2');
    expect(cells[3].textContent).not.toContain('sobrante');
    expect(cells[4].textContent?.trim()).toBe('—');
  });

  it('nunca muestra ambas etiquetas en la misma fila aunque vengan ambos arrays', () => {
    const source = {
      transaction_id: 1,
      transaction_date: '2026-02-06',
      receipt_number: '1',
      amount: 100,
      also_applied_to: [{ target_label: 'Promesa #2', installment_number: 2, amount: 50 }],
      came_from: [{ target_label: 'Promesa #4', installment_number: 4, amount: 100 }],
    };

    expect(component.alsoAppliedLabel(source)).toBe('');
    expect(component.cameFromLabel(source)).toContain('Promesa #4 (sobrante $');
  });
});
