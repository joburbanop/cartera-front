import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DrawerCobroResidualComponent, ResidualCollectionPayload } from './drawer-cobro-residual.component';

describe('DrawerCobroResidualComponent', () => {
  let component: DrawerCobroResidualComponent;
  let fixture: ComponentFixture<DrawerCobroResidualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerCobroResidualComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DrawerCobroResidualComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('bankAccounts', [
      { id: 1, bank_name: 'Bancolombia', account_number: '123' },
    ]);
    fixture.componentRef.setInput('pendingAmount', 600);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exige recibo y no emite si falta', () => {
    const emitted: ResidualCollectionPayload[] = [];
    component.confirmCollection.subscribe((data) => emitted.push(data));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.paymentForm.patchValue({
      amount: 500,
      payment_method: 'cash',
      transaction_date: '2026-09-09',
    });
    component.submit();

    expect(component.receiptMissing).toBe(true);
    expect(emitted.length).toBe(0);
  });

  it('bloquea un monto mayor al pendiente', () => {
    const emitted: ResidualCollectionPayload[] = [];
    component.confirmCollection.subscribe((data) => emitted.push(data));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.selectedFile = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });
    component.paymentForm.patchValue({
      amount: 700,
      payment_method: 'cash',
      transaction_date: '2026-09-09',
    });
    component.submit();

    expect(component.amountExceedsPending).toBe(true);
    expect(emitted.length).toBe(0);
  });

  it('emite el cobro cuando el formulario está completo', () => {
    const emitted: ResidualCollectionPayload[] = [];
    component.confirmCollection.subscribe((data) => emitted.push(data));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.selectedFile = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });
    component.paymentForm.patchValue({
      amount: 500,
      payment_method: 'cash',
      transaction_date: '2026-09-09',
    });
    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].amount).toBe(500);
    expect(emitted[0].receipt.name).toBe('recibo.pdf');
  });

  it('no ofrece Tarjeta y emite Recibo #', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Tarjeta');
    expect(fixture.nativeElement.textContent).toContain('Recibo #');

    const emitted: ResidualCollectionPayload[] = [];
    component.confirmCollection.subscribe((data) => emitted.push(data));
    component.selectedFile = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });
    component.paymentForm.patchValue({
      amount: 500,
      payment_method: 'cash',
      transaction_date: '2026-09-09',
      receipt_number: '0448-0449',
    });
    component.submit();

    expect(emitted[0].receipt_number).toBe('0448-0449');
  });
});
