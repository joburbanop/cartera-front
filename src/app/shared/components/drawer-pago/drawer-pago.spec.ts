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

  it('no ofrece Tarjeta y emite Recibo #', () => {
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('prefilledAmount', 100000);
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('Efectivo');
    expect(html).toContain('Transferencia');
    expect(html).toContain('Permuta');
    expect(html).not.toContain('Tarjeta');
    expect(html).toContain('Recibo #');

    component.paymentForm.patchValue({
      amount: 100000,
      payment_method: 'cash',
      receipt_number: '0258, 0289',
    });
    component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

    const emitted: any[] = [];
    component.confirmPayment.subscribe((data: any) => emitted.push(data));
    component.submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0].receipt_number).toBe('0258, 0289');
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

  describe('pago dividido entre cuota inicial y cuota regular', () => {
    // El caso real: la inicial quedó con $200.000 abiertos y el cliente manda
    // una sola consignación de $2.100.000 que cubre eso más la cuota del mes.
    function abrirConInicialPendiente(): void {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('pendingInitialAmount', 200000);
      fixture.componentRef.setInput('regularDueAmount', 1900000);
      fixture.detectChanges();
    }

    it('ofrece dividir cuando la cuota inicial tiene saldo', () => {
      abrirConInicialPendiente();

      expect(component.canSplit).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Dividir este pago');
    });

    it('no ofrece dividir si la inicial ya está saldada', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.detectChanges();

      expect(component.canSplit).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain('Dividir este pago');
    });

    it('no ofrece dividir cuando el pago es de la propia cuota inicial', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('pendingInitialAmount', 200000);
      fixture.componentRef.setInput('selectedFees', [
        { id: 10, installment_number: 0, quota_debt: 200000 },
      ]);
      fixture.detectChanges();

      expect(component.canSplit).toBe(false);
    });

    it('propone el faltante de la inicial y deja el resto a la cuota', () => {
      abrirConInicialPendiente();
      component.paymentForm.patchValue({ amount: 2100000 });
      component.toggleSplit();

      expect(component.splitToDownPayment).toBe(200000);
      expect(component.splitToInstallments).toBe(1900000);
      expect(component.splitError).toBeNull();
    });

    it('rechaza que la parte de la inicial supere su saldo', () => {
      abrirConInicialPendiente();
      component.paymentForm.patchValue({ amount: 2100000 });
      component.toggleSplit();
      component.paymentForm.patchValue({ to_down_payment: 500000 });

      expect(component.splitError).toContain('saldo pendiente');
    });

    it('rechaza que no quede nada para la cuota regular', () => {
      abrirConInicialPendiente();
      component.paymentForm.patchValue({ amount: 200000 });
      component.toggleSplit();

      expect(component.splitError).toContain('No queda nada para la cuota regular');
    });

    it('mide el excedente sobre la parte regular, no sobre el total', () => {
      abrirConInicialPendiente();
      // $200.000 a la inicial y $2.900.000 contra una cuota de $1.900.000.
      component.paymentForm.patchValue({ amount: 3100000 });
      component.toggleSplit();

      expect(component.excessAmount).toBe(1000000);
    });

    it('emite el reparto junto al total recibido', () => {
      abrirConInicialPendiente();
      component.paymentForm.patchValue({
        amount: 2100000,
        payment_method: 'cash',
      });
      component.toggleSplit();
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();

      expect(emitted.length).toBe(1);
      // El banco ve un solo movimiento: el reparto viaja aparte.
      expect(emitted[0].amount).toBe(2100000);
      expect(emitted[0].split).toEqual({
        to_down_payment: 200000,
        to_installments: 1900000,
      });
    });

    it('no manda reparto cuando el cobrador no lo pidió', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('pendingInitialAmount', 200000);
      // Abono a la inicial por su saldo exacto: no hay excedente que destinar.
      fixture.componentRef.setInput('prefilledAmount', 200000);
      fixture.detectChanges();
      component.paymentForm.patchValue({ amount: 200000, payment_method: 'cash' });
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();

      expect(emitted[0].split).toBeNull();
    });

    it('no premarca ningún destino si hay excedente', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({ amount: 1500000 });
      fixture.detectChanges();

      expect(component.hasSurplus).toBe(true);
      expect(component.isContractCurrent).toBe(true);
      expect(component.paymentForm.get('surplus_action')?.value).toBeFalsy();
      expect(fixture.nativeElement.querySelector('input[value="abono_capital"]:checked')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Abono a capital');
      expect(fixture.nativeElement.textContent).not.toContain('predeterminado');
      expect(fixture.nativeElement.textContent).toContain('Reducir Plazo');
      expect(fixture.nativeElement.textContent).toContain('Reducir Cuota');
      expect(fixture.nativeElement.textContent).toContain('Adelanto de Cuotas');
    });

    it('tampoco premarca destino si hay mora y hay excedente', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 1000000);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({ amount: 1500000 });

      expect(component.hasSurplus).toBe(true);
      expect(component.isContractCurrent).toBe(false);
      expect(component.paymentForm.get('surplus_action')?.value).toBeFalsy();
    });

    it('pide confirmación de abono a capital si hay excedente y no eligió destino', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({ amount: 1500000, payment_method: 'cash' });
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();

      expect(emitted.length).toBe(0);
      expect(component.pendingDefaultCapitalConfirm).toBe(true);
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('.app-modal-backdrop.app-modal-backdrop--stack');
      expect(modal).toBeTruthy();
      expect(modal.textContent).toContain('Este pago se aplicará como abono a capital');
      expect(modal.textContent).toContain('No elegiste otro destino para el excedente');
      expect(modal.textContent).toContain('Volver');
      expect(modal.textContent).toContain('Sí, abonar a capital');
      expect(fixture.nativeElement.querySelector('.panel-footer')?.textContent).toContain('Confirmar pago');

      component.submit();

      expect(emitted.length).toBe(1);
      expect(emitted[0].payment_option).toBe('abono_capital');
      expect(emitted[0].surplus_action).toBe('abono_capital');
    });

    it('Volver cierra el modal sin enviar el pago', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({ amount: 1500000, payment_method: 'cash' });
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();
      fixture.detectChanges();

      expect(component.pendingDefaultCapitalConfirm).toBe(true);

      const volver = fixture.nativeElement.querySelector('.app-modal-body .btn-secondary') as HTMLButtonElement;
      expect(volver.textContent).toContain('Volver');
      volver.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(emitted.length).toBe(0);
      expect(component.pendingDefaultCapitalConfirm).toBe(false);
      expect(fixture.nativeElement.querySelector('.app-modal-backdrop')).toBeNull();
    });

    it('emite de una si el operador eligió un destino explícito', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({
        amount: 1500000,
        payment_method: 'cash',
        surplus_action: 'adelantar_cuotas',
      });
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();

      expect(component.pendingDefaultCapitalConfirm).toBe(false);
      expect(emitted[0].payment_option).toBe('adelantar_cuotas');
    });

    it('emite abono_capital de una si el operador marcó ese radio', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({
        amount: 1500000,
        payment_method: 'cash',
        surplus_action: 'abono_capital',
      });
      component['selectedFile'] = new File(['x'], 'recibo.pdf', { type: 'application/pdf' });

      const emitted: any[] = [];
      component.confirmPayment.subscribe((data: any) => emitted.push(data));
      component.submit();

      expect(component.pendingDefaultCapitalConfirm).toBe(false);
      expect(emitted[0].payment_option).toBe('abono_capital');
    });

    it('no pisa la elección del operador si ya eligió un destino', async () => {
      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.componentRef.setInput('overdueTotalAmount', 0);
      fixture.componentRef.setInput('selectedFees', [
        { id: 1, installment_number: 1, quota_debt: 1000000 },
      ]);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.paymentForm.patchValue({ amount: 1500000, surplus_action: 'adelantar_cuotas' });

      expect(component.paymentForm.get('surplus_action')?.value).toBe('adelantar_cuotas');
    });

    it('olvida el reparto si la inicial deja de tener saldo', () => {
      abrirConInicialPendiente();
      component.paymentForm.patchValue({ amount: 2100000 });
      component.toggleSplit();
      expect(component.splitEnabled).toBe(true);

      fixture.componentRef.setInput('pendingInitialAmount', 0);
      fixture.detectChanges();

      expect(component.splitEnabled).toBe(false);
      expect(component.paymentForm.get('to_down_payment')?.value).toBe('');
    });
  });
});
