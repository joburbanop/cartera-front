import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';

import { RefinanceConfirmPayload, RefinanceModalComponent } from './refinance-modal.component';
import { FinancialService } from '../../../../core/services/financial.service';

describe('RefinanceModalComponent', () => {
  let component: RefinanceModalComponent;
  let financials: FinancialService;

  const open = (): void => {
    component.isOpen = true;
    component.ngOnChanges({ isOpen: new SimpleChange(false, true, false) });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RefinanceModalComponent] });
    const fixture = TestBed.createComponent(RefinanceModalComponent);
    component = fixture.componentInstance;
    financials = TestBed.inject(FinancialService);
    component.installments = [
      {
        id: 1,
        installment_number: 0,
        status: 'paid',
        principal_paid: 2000000,
        interest_paid: 0,
        interest_value: 0,
      } as any,
      {
        id: 2,
        installment_number: 1,
        status: 'paid',
        principal_paid: 1000000,
        interest_paid: 0,
        interest_value: 0,
      } as any,
      {
        id: 3,
        installment_number: 2,
        status: 'pending',
        principal_paid: 0,
        interest_paid: 0,
        interest_value: 250000,
      } as any,
    ];
    component.listPrice = 70000000;
    open();
  });

  it('exige motivo en las cinco estrategias', () => {
    component.extraAmount = 250000;
    component.months = 3;
    component.newSalePrice = 7000000;
    component.newTermMonths = 24;
    component.newInterestRate = '1.2';
    component.deferredInterestAction = 'condonar';
    component.reductionPercent = '25';
    component.toggleInstallment(9, true);

    for (const tipo of [
      'acuerdo_pago',
      'tiempo_gracia',
      'refinanciar_saldo',
      'exoneracion_intereses',
      'liquidacion_contado',
    ] as const) {
      component.tipo = tipo;

      component.motivo = '';
      expect(component.canSubmit).toBe(false);

      component.motivo = 'corto';
      expect(component.canSubmit).toBe(false);

      component.motivo = 'Otrosí firmado el 2 de septiembre.';
      expect(component.canSubmit).toBe(true);
    }
  });

  it('en refinanciar saldo muestra capital, diferido y cuota PMT del front', () => {
    component.tipo = 'refinanciar_saldo';
    component.newSalePrice = 7000000;
    component.newTermMonths = 2;
    component.newInterestRate = '0';

    expect(component.capitalPaidTotal).toBe(3000000);
    expect(component.newPrincipal).toBe(4000000);
    expect(component.accruedUnpaidInterest).toBe(250000);
    expect(component.hasAccruedUnpaidInterest).toBe(true);
    expect(component.resultingMonthlyQuota).toBe(
      financials.calculateFrenchQuota(4000000, 2, 0),
    );
    expect(component.canSubmit).toBe(false);

    component.deferredInterestAction = 'cobrar_aparte';
    component.motivo = 'Actualización de precio comercial del lote.';
    expect(component.canSubmit).toBe(true);
  });

  it('no precarga el list_price en el precio actualizado', () => {
    expect(component.listPrice).toBe(70000000);
    expect(component.newSalePrice).toBeNull();
  });

  it('envía precio, decisión de diferido y cuota params al confirmar', () => {
    let payload: RefinanceConfirmPayload | null = null;
    component.confirmRefinance.subscribe((value) => (payload = value));

    component.tipo = 'refinanciar_saldo';
    component.newSalePrice = 9000000;
    component.newTermMonths = 12;
    component.newInterestRate = '1.00';
    component.deferredInterestAction = 'condonar';
    component.motivo = 'Otrosí con nuevo precio de lista.';

    component.confirm();

    expect(payload).not.toBeNull();
    expect(payload!.params['new_sale_price']).toBe('9000000.00');
    expect(payload!.params['new_term_months']).toBe(12);
    expect(payload!.params['new_interest_rate']).toBe('1.00');
    expect(payload!.params['deferred_interest_action']).toBe('condonar');
    expect(payload!.params['motivo']).toBe('Otrosí con nuevo precio de lista.');
  });

  it('envía el motivo recortado y una clave de idempotencia con cada estrategia', () => {
    let payload: RefinanceConfirmPayload | null = null;
    component.confirmRefinance.subscribe((value) => (payload = value));

    component.tipo = 'tiempo_gracia';
    component.months = 2;
    component.motivo = '  El cliente perdió el empleo.  ';

    component.confirm();

    expect(payload).not.toBeNull();
    expect(payload!.params['motivo']).toBe('El cliente perdió el empleo.');
    expect(payload!.params['idempotency_key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(payload!.params['months']).toBe(2);
  });

  it('mantiene la clave mientras el modal está abierto y la renueva al reabrir', () => {
    const keys: unknown[] = [];
    component.confirmRefinance.subscribe((value) => keys.push(value.params['idempotency_key']));

    component.tipo = 'tiempo_gracia';
    component.months = 2;
    component.motivo = 'Prórroga aprobada en comité.';

    component.confirm();
    component.confirm();
    expect(keys[0]).toBe(keys[1]);

    open();
    component.tipo = 'tiempo_gracia';
    component.months = 2;
    component.motivo = 'Prórroga aprobada en comité.';
    component.confirm();

    expect(keys[2]).not.toBe(keys[0]);
  });

  it('limpia el motivo al reabrir el modal', () => {
    component.motivo = 'Motivo de la refinanciación anterior.';

    open();

    expect(component.motivo).toBe('');
    expect(component.isMotivoValid).toBe(false);
  });

  it('muestra cinco tarjetas con nombres que no se confunden', () => {
    expect(component.options.map((option) => option.tipo)).toEqual([
      'acuerdo_pago',
      'tiempo_gracia',
      'refinanciar_saldo',
      'exoneracion_intereses',
      'liquidacion_contado',
    ]);
    expect(component.options[3].title).toBe('Exoneración de intereses en cuotas puntuales');
    expect(component.options[4].title).toBe('Liquidación de contado del saldo');
  });

  it('en liquidación de contado resume capital, causado y futuro sin mezclar diferido', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const toIso = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const future = new Date();
    future.setDate(future.getDate() + 20);

    component.deferredInterestBalance = 500000;
    // La cuota 1 lleva un abono extra dentro del capital, así que el cronograma
    // no suma el precio del lote. El capital insoluto sale de la tabla, no del precio.
    component.installments = [
      {
        id: 1,
        installment_number: 0,
        status: 'paid',
        principal_value: 2000000,
        principal_paid: 2000000,
        interest_paid: 0,
        interest_value: 0,
        due_date: '2026-01-05',
      } as any,
      {
        id: 2,
        installment_number: 1,
        status: 'paid',
        principal_value: 1700000,
        principal_paid: 1700000,
        interest_paid: 0,
        interest_value: 0,
        due_date: '2026-02-05',
      } as any,
      {
        id: 3,
        installment_number: 2,
        status: 'overdue',
        principal_value: 2500000,
        principal_paid: 0,
        interest_paid: 0,
        interest_value: 200000,
        due_date: toIso(yesterday),
      } as any,
      {
        id: 4,
        installment_number: 3,
        status: 'pending',
        principal_value: 1500000,
        principal_paid: 0,
        interest_paid: 0,
        interest_value: 400000,
        due_date: toIso(future),
      } as any,
    ];

    // 2.500.000 + 1.500.000 pendientes del cronograma. Con "precio − capital pagado"
    // (7.000.000 − 3.700.000) habría dado 3.300.000, que no es lo que falta por cobrar.
    expect(component.outstandingCapital).toBe(4000000);
    expect(component.causedUnpaidInterest).toBe(200000);
    expect(component.unaccruedUnpaidInterest).toBe(400000);
    expect(component.amountToClose).toBe(4200000);
    expect(component.deferredInterestBalance).toBe(500000);

    component.tipo = 'liquidacion_contado';
    component.motivo = 'El cliente paga el saldo de contado.';
    expect(component.canSubmit).toBe(true);

    let payload: RefinanceConfirmPayload | null = null;
    component.confirmRefinance.subscribe((value) => (payload = value));
    component.confirm();

    expect(payload!.tipo).toBe('liquidacion_contado');
    expect(payload!.params['motivo']).toBe('El cliente paga el saldo de contado.');
    expect(payload!.params['installment_ids']).toBeUndefined();
    expect(payload!.params['reduction_percent']).toBeUndefined();
  });
});
