import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LifeSheet } from '../../../../core/models/life-sheet.model';
import { LifeSheetTabComponent } from './life-sheet-tab.component';

describe('LifeSheetTabComponent', () => {
  let fixture: ComponentFixture<LifeSheetTabComponent>;
  let component: LifeSheetTabComponent;

  const sheet: LifeSheet = {
    header: {
      lot_number: '49',
      sale_price: '122148000.00',
      financed_value: '158938999.00',
      financed_value_basis: 'french_pmt',
      area_m2: null,
      price_m2: null,
      down_payment: '12214800.00',
      monthly_quota: '2445403.00',
      customer_name: 'Cliente Demo',
      document_number: '123',
      address: null,
      email: null,
      phone: null,
      term_months: 60,
      seller_name: null,
      is_special_lot: false,
      is_custom_plan: false,
      note: 'Saldo calculado sobre el valor total del plan, restando los pagos recibidos.',
    },
    rows: [
      {
        transaction_id: 1,
        date: '2025-08-01',
        concept: 'CUOTA INICIAL',
        receipt_number: '0349',
        efectivo: '1000000.00',
        bancolombia: '0.00',
        occidente: '0.00',
        amount: '1000000.00',
        payment_method: 'cash',
        total_paid: '1000000.00',
        balance: '157938999.00',
        notes: 'Recibo #0349 | Concepto: CUOTA INICIAL',
        amortization_application: [
          {
            installment_number: 0,
            principal_paid: '1000000.00',
            interest_paid: '0.00',
            extra_payment: '0.00',
          },
        ],
      },
      {
        transaction_id: 2,
        date: '2025-09-10',
        concept: 'CUOTA 1',
        receipt_number: '0350',
        efectivo: '0.00',
        bancolombia: '2445403.00',
        occidente: '0.00',
        amount: '2445403.00',
        payment_method: 'transfer',
        total_paid: '3445403.00',
        balance: '155493596.00',
        notes: 'Recibo #0350 | Concepto: CUOTA 1',
        amortization_application: [],
      },
    ],
    summary: {
      collected: '3445403.00',
      interest_paid: '1099332.00',
      principal_paid: '2346071.00',
      unimputed: '0.00',
      life_sheet_balance: '157938999.00',
      outstanding_capital: '121148000.00',
      criteria_gap: '36790999.00',
      criteria_gap_label: 'Brecha entre criterios',
      criteria_gap_hint: 'Saldo de la hoja de vida (valor futuro) − capital insoluto (amortización).',
      amortization_note: 'Saldo de capital del plan francés.',
      life_sheet_note: 'Saldo calculado sobre el valor total del plan.',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifeSheetTabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LifeSheetTabComponent);
    component = fixture.componentInstance;
  });

  it('muestra encabezado, brecha y columnas de forma de pago', () => {
    fixture.componentRef.setInput('sheet', sheet);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('VALOR LOTE FINANCIADO');
    expect(text).toContain('Brecha entre criterios');
    expect(text).toContain('Valor hoja de vida');
    expect(text).toContain('Valor total de amortización');
    expect(text).toContain('Diferencia');
    expect(text).toContain('Efectivo');
    expect(text).toContain('Bancolombia');
    expect(text).toContain('Occidente 6391');
    expect(text).toContain('0349');
    expect(text).toContain('En amortización:');
  });

  it('muestra el consolidado con el desglose de interés y capital', () => {
    fixture.componentRef.setInput('sheet', sheet);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const block = fixture.nativeElement.querySelector('.hv-consolidated') as HTMLElement;
    const text = block.textContent as string;

    expect(text).toContain('Total pagado a la fecha');
    expect(text).toContain('3,445,403');
    expect(text).toContain('A capital');
    expect(text).toContain('2,346,071');
    expect(text).toContain('A interés');
    expect(text).toContain('1,099,332');
    // Con todo imputado no se anuncia dinero pendiente de aplicar.
    expect(text).not.toContain('Sin imputar');
  });

  it('anuncia el recaudo que aún no se aplicó a cuotas', () => {
    fixture.componentRef.setInput('sheet', {
      ...sheet,
      summary: { ...sheet.summary, unimputed: '300000.00' },
    });
    fixture.detectChanges();

    const block = fixture.nativeElement.querySelector('.hv-consolidated') as HTMLElement;
    expect(block.textContent).toContain('Sin imputar');
    expect(block.textContent).toContain('300,000');
  });

  it('acumula el total pagado fila a fila', () => {
    fixture.componentRef.setInput('sheet', sheet);
    fixture.detectChanges();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('.hv-table thead th') as NodeListOf<HTMLElement>
    ).map((th) => th.textContent?.trim());
    expect(headers).toContain('Total pagado');

    const accumulated = Array.from(
      fixture.nativeElement.querySelectorAll('.hv-accumulated') as NodeListOf<HTMLElement>
    ).map((cell) => cell.textContent?.trim());
    expect(accumulated).toEqual(['$ 1,000,000', '$ 3,445,403']);
  });

  it('marca la fila revertida sin mover el énfasis del saldo corrido', () => {
    fixture.componentRef.setInput('sheet', {
      ...sheet,
      rows: [
        sheet.rows[0],
        {
          ...sheet.rows[1],
          concept: 'PAGO (revertido, no afecta el saldo)',
          affects_running_total: false,
          total_paid: sheet.rows[0].total_paid,
          balance: sheet.rows[0].balance,
        },
      ],
    });
    fixture.detectChanges();

    const reversed = fixture.nativeElement.querySelector('tr.hv-no-running') as HTMLElement;
    expect(reversed).toBeTruthy();
    expect(reversed.textContent).toContain('revertido, no afecta el saldo');
  });

  it('expresa cada parte como porcentaje del total pagado', () => {
    fixture.componentRef.setInput('sheet', sheet);
    fixture.detectChanges();

    expect(component.share('2346071.00')).toBe('68.1 % del total');
    expect(component.share('0.00')).toBe('0.0 % del total');
  });

  it('no divide por cero cuando todavía no hay pagos', () => {
    fixture.componentRef.setInput('sheet', {
      ...sheet,
      rows: [],
      summary: { ...sheet.summary, collected: '0.00', interest_paid: '0.00', principal_paid: '0.00' },
    });
    fixture.detectChanges();

    expect(component.share('0.00')).toBe('—');
  });

  describe('pago repartido entre cuota inicial y cuota regular', () => {
    // Una sola consignación de $2.100.000 que cubrió el faltante de la inicial
    // y la cuota del mes.
    const splitSheet: LifeSheet = {
      ...sheet,
      rows: [
        {
          ...sheet.rows[0],
          transaction_id: 9,
          concept: 'CUOTA INICIAL + CUOTA',
          amount: '2100000.00',
          efectivo: '0.00',
          bancolombia: '2100000.00',
          amortization_application: [],
          allocations: [
            {
              target: 'down_payment',
              target_label: 'Cuota inicial',
              installment_number: null,
              amount: '200000.00',
              principal: '200000.00',
              interest: '0.00',
            },
            {
              target: 'installment',
              target_label: 'Cuota regular',
              installment_number: 1,
              amount: '1900000.00',
              principal: '1000000.00',
              interest: '900000.00',
            },
          ],
        },
      ],
    };

    it('ofrece ver detalles solo en las filas repartidas', () => {
      fixture.componentRef.setInput('sheet', splitSheet);
      fixture.detectChanges();

      expect(component.isSplit(splitSheet.rows[0])).toBe(true);
      expect(component.isSplit(sheet.rows[1])).toBe(false);
      expect(fixture.nativeElement.querySelectorAll('.hv-details-toggle').length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Ver detalles');
    });

    it('despliega el reparto sin duplicar el movimiento', () => {
      fixture.componentRef.setInput('sheet', splitSheet);
      fixture.detectChanges();

      // Antes de desplegar, la tabla tiene una sola fila de pago.
      expect(fixture.nativeElement.querySelectorAll('.hv-details-row').length).toBe(0);

      fixture.nativeElement.querySelector('.hv-details-toggle').click();
      fixture.detectChanges();

      const detail = fixture.nativeElement.querySelector('.hv-details-row') as HTMLElement;
      const text = detail.textContent as string;

      expect(text).toContain('2,100,000');
      expect(text).toContain('Cuota inicial');
      expect(text).toContain('200,000');
      expect(text).toContain('Cuota regular');
      expect(text).toContain('cuota #1');
      expect(text).toContain('900,000');

      fixture.nativeElement.querySelector('.hv-details-toggle').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.hv-details-row').length).toBe(0);
    });
  });

  it('emite la descarga del PDF', () => {
    fixture.componentRef.setInput('sheet', sheet);
    fixture.detectChanges();

    let emitted = false;
    component.downloadPdf.subscribe(() => {
      emitted = true;
    });

    fixture.nativeElement.querySelector('.hv-pdf').click();
    expect(emitted).toBe(true);
  });
});
