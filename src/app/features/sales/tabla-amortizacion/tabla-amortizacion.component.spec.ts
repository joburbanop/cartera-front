import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CDK_DRAG_CONFIG } from '@angular/cdk/drag-drop';

import { AmortizationComponent } from './tabla-amortizacion.component';
import { AppRoles } from '../../../core/models/app-roles';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service';
import { RecaudoService } from '../../../core/services/recaudo.service';
import { PaymentPromiseService } from '../../../core/services/payment-promise.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { NavigationTrailService } from '../../../core/services/navigation-trail.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DEFAULT_CONTRACT_TAB_IDS } from '../../../core/utils/contract-tabs';
import { lotContractsHub, lotsHub } from '../../../core/utils/navigation-trail';

describe('AmortizationComponent', () => {
  let component: AmortizationComponent;
  let toastService: ToastService;
  let registerPaymentResult: Observable<unknown> = of({});
  let lastRegisterPaymentArgs: {
    contractId: number;
    formData: FormData;
    transactionType: string;
  } | null = null;
  let lastSplitPaymentArgs: { contractId: number; formData: FormData } | null = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isoWithOffset = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().substring(0, 10);
  };

  const cuotaInicial = {
    id: 0,
    installment_number: 0,
    due_date: isoWithOffset(-30),
    installment_value: 2000000,
    quota_debt: 2000000,
    remaining_balance: 2000000,
    status: 'pending',
  };

  const cuota1 = {
    id: 1,
    installment_number: 1,
    due_date: isoWithOffset(-20),
    installment_value: 1000000,
    quota_debt: 1000000,
    remaining_balance: 1000000,
    status: 'pending',
  };

  const cuota2 = {
    id: 2,
    installment_number: 2,
    due_date: isoWithOffset(-10),
    installment_value: 1000000,
    quota_debt: 0,
    remaining_balance: 0,
    status: 'paid',
  };

  const cuota3 = {
    id: 3,
    installment_number: 3,
    due_date: isoWithOffset(10),
    installment_value: 1000000,
    quota_debt: 1000000,
    remaining_balance: 1000000,
    status: 'pending',
  };

  beforeEach(async () => {
    const amortizationServiceMock = {
      getPlan: () => of({ data: [] }),
      getLifeSheet: () => of({ data: undefined }),
      downloadPdf: () => of(new Blob()),
      downloadLifeSheetPdf: () => of(new Blob()),
      generatePlan: () => of({}),
      refinanceContract: () => of({}),
      updateInstallmentDueDate: () => of({}),
      previewInstallmentDueDate: () => of({ data: { preview: [], affected_count: 1 } }),
      updateInstallmentPaymentDate: () => of({ data: { warning: null } }),
    } as Partial<AmortizationService> as AmortizationService;

    const contractServiceMock = {
      getContractById: () => of({ data: {} }),
    } as Partial<ContractService> as ContractService;

    const financialServiceMock = {
      calculateFrenchQuota: () => 1000000,
      calculateProjectedTotal: () => 7000000,
    } as Partial<FinancialService> as FinancialService;

    const recaudoServiceMock = {
      registerPayment: (contractId: number, formData: FormData, transactionType: string) => {
        lastRegisterPaymentArgs = { contractId, formData, transactionType };
        return registerPaymentResult;
      },
      registerSplitPayment: (contractId: number, formData: FormData) => {
        lastSplitPaymentArgs = { contractId, formData };
        return registerPaymentResult;
      },
      getTransactionsByContract: () => of({ data: [] }),
      getAllTransactions: () => of({ data: [] }),
    } as Partial<RecaudoService> as RecaudoService;

    const paymentPromiseServiceMock = {
      getPromisesByContract: () => of([]),
      reorderPromises: () => of({ data: [] }),
    } as Partial<PaymentPromiseService> as PaymentPromiseService;

    const activityServiceMock = {
      getActivity: () => of({ data: [] }),
    } as Partial<ActivityService> as ActivityService;

    const authServiceMock = {
      hasRole: () => true,
      getRole: () => 'administrador',
      isLoggedIn: () => true,
      uiPreferences: signal({ contractTabs: [...DEFAULT_CONTRACT_TAB_IDS] }),
      uiPreferencesReady: signal(true),
      contractTabOrder: () => [...DEFAULT_CONTRACT_TAB_IDS],
      updateContractTabs: () => of(undefined),
      resetContractTabs: () => of(undefined),
    } as unknown as AuthService;

    const routerMock = {
      navigate: () => Promise.resolve(true),
      url: '/amortization/1',
    } as Partial<Router> as Router;

    await TestBed.configureTestingModule({
      imports: [AmortizationComponent],
      providers: [
        AmortizationFinancialsService,
        ToastService,
        { provide: ActivatedRoute, useValue: { params: of({}) } },
        { provide: Router, useValue: routerMock },
        { provide: AmortizationService, useValue: amortizationServiceMock },
        { provide: ContractService, useValue: contractServiceMock },
        { provide: FinancialService, useValue: financialServiceMock },
        { provide: RecaudoService, useValue: recaudoServiceMock },
        { provide: PaymentPromiseService, useValue: paymentPromiseServiceMock },
        { provide: ActivityService, useValue: activityServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AmortizationComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    toastService.toasts().forEach((toast) => toastService.dismiss(toast.id));
    (toastService as any).toastsState.set([]);
    (toastService as any).timers.clear();

    registerPaymentResult = of({});
    lastRegisterPaymentArgs = null;
    lastSplitPaymentArgs = null;

    component.contractData = {
      status: 'activo',
      transactions: [],
      down_payment_pactada: 2000000,
    };
    component.currentView = 'venta';
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];
  });

  it('Debe bloquear checkboxes de cuotas pasadas y habilitar cuotas futuras', () => {
    const isVencida = (component as any).isVencida.bind(component) as (d: string) => boolean;

    expect(isVencida(cuota1.due_date)).toBeTruthy();
    expect(isVencida(cuota2.due_date)).toBeTruthy();
    expect(isVencida(cuota3.due_date)).toBeFalsy();
    expect(isVencida(isoWithOffset(0))).toBeFalsy();
  });

  it('el banner de cartera vencida usa quota_debt y no el saldo del préstamo', () => {
    const cuotaConSaldoPrestamo = {
      ...cuota1,
      remaining_balance: 80000000,
      projected_balance: 80000000,
      quota_debt: 1000000,
      status: 'pending',
    };
    const cuotaQueVenceHoy = {
      ...cuota3,
      id: 30,
      installment_number: 30,
      due_date: isoWithOffset(0),
      remaining_balance: 80000000,
      quota_debt: 1000000,
      status: 'pending',
    };

    component.amortizationPlan = [cuotaConSaldoPrestamo, cuota2, cuotaQueVenceHoy];

    expect(component.cantidadCuotasVencidas).toBe(1);
    expect(component.totalDineroVencido).toBe(1000000);
  });

  it('Debe asignar correctamente las etiquetas visuales (Vencida, Pagada, Pendiente)', () => {
    const cuotaVencida = { ...cuota1, status: 'overdue' };
    const cuotaPagada = { ...cuota2, status: 'paid' };
    const cuotaPendiente = { ...cuota3, status: 'pending' };

    expect(component.getFeeStatus(cuotaVencida)).toBe('overdue');
    expect(component.getFeeStatus(cuotaPagada)).toBe('paid');
    expect(component.getFeeStatus(cuotaPendiente)).toBe('pending');
  });

  it('Debe fusionar la mora ordinaria al seleccionar una cuota ordinaria actual', () => {
    component.selectedFees = [{ ...cuota3 }];

    component.openDrawer();

    const selectedIds = component.selectedFees.map((fee: any) => fee.id);

    expect(selectedIds).toContain(1);
    expect(selectedIds).toContain(3);
    expect(selectedIds).not.toContain(0);
    expect(selectedIds).not.toContain(2);
    expect(component.isDrawerOpen).toBeTruthy();
  });

  it('Debe calcular el monto total sugerido incluyendo la mora', () => {
    component.selectedFees = [{ ...cuota3 }];

    component.openDrawer();

    expect(component.totalSelectedAmount).toBe(2000000);
  });

  it('Separación de tuberías: Al seleccionar Cuota Inicial, ignora mora ordinaria', () => {
    component.selectedFees = [{ ...cuotaInicial }];

    component.openDrawer();

    const selectedIds = component.selectedFees.map((fee: any) => fee.id);

    expect(selectedIds).toEqual([0]);
    expect(selectedIds).not.toContain(1);
    expect(selectedIds).not.toContain(2);
    expect(selectedIds).not.toContain(3);
    expect(component.isDrawerOpen).toBeTruthy();
  });

  it('Debe registrar un toast de éxito en el servicio tras un pago correcto', () => {
    registerPaymentResult = of({});
    component.contractId = 1;
    component.selectedFees = [{ ...cuota3 }];
    vi.spyOn(component, 'cargarTablaAmortizacion').mockImplementation(() => undefined);
    vi.spyOn(component, 'loadContractData').mockImplementation(() => undefined);

    component.procesarPago({
      amount: 1000000,
      payment_method: 'transfer',
      transaction_date: '2026-08-30',
      receipt: new Blob(),
    });

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Pago registrado');
  });

  it('Un pago dividido va a la ruta de reparto con las dos partes', () => {
    component.contractId = 1;
    component.selectedFees = [];
    vi.spyOn(component, 'cargarTablaAmortizacion').mockImplementation(() => undefined);
    vi.spyOn(component, 'loadContractData').mockImplementation(() => undefined);

    component.procesarPago({
      amount: 2100000,
      payment_method: 'transfer',
      transaction_date: '2026-08-30',
      receipt: new Blob(),
      split: { to_down_payment: 200000, to_installments: 1900000 },
    });

    // El pago normal no se dispara: el reparto necesita su propio endpoint.
    expect(lastRegisterPaymentArgs).toBeNull();
    expect(lastSplitPaymentArgs).not.toBeNull();
    expect(lastSplitPaymentArgs!.formData.get('amount')).toBe('2100000');
    expect(lastSplitPaymentArgs!.formData.get('to_down_payment')).toBe('200000');
    expect(lastSplitPaymentArgs!.formData.get('to_installments')).toBe('1900000');
  });

  it('Un pago sin reparto sigue por la ruta de siempre', () => {
    component.contractId = 1;
    component.selectedFees = [{ ...cuota3 }];
    vi.spyOn(component, 'cargarTablaAmortizacion').mockImplementation(() => undefined);
    vi.spyOn(component, 'loadContractData').mockImplementation(() => undefined);

    component.procesarPago({
      amount: 1000000,
      payment_method: 'transfer',
      transaction_date: '2026-08-30',
      receipt: new Blob(),
      split: null,
    });

    expect(lastSplitPaymentArgs).toBeNull();
    expect(lastRegisterPaymentArgs).not.toBeNull();
    expect(lastRegisterPaymentArgs!.formData.get('to_down_payment')).toBeNull();
  });

  it('El historial despliega el reparto de un pago dividido', () => {
    const split = {
      id: 77,
      transaction_type: 'pago_mixto',
      amount: 2100000,
      allocations: [
        { target: 'down_payment', target_label: 'Cuota inicial', installment_number: null, amount: 200000, principal: 200000, interest: 0 },
        { target: 'installment', target_label: 'Cuota regular', installment_number: 1, amount: 1900000, principal: 1000000, interest: 900000 },
      ],
    } as any;

    expect(component.hasAllocations(split)).toBe(true);
    expect(component.transactionTypeLabel(split)).toBe('Inicial + cuota');
    expect(component.isTransactionExpanded(split)).toBe(false);

    component.toggleTransactionDetails(split);
    expect(component.isTransactionExpanded(split)).toBe(true);

    component.toggleTransactionDetails(split);
    expect(component.isTransactionExpanded(split)).toBe(false);

    // Un pago de un solo destino no ofrece desglose.
    expect(component.hasAllocations({ id: 78, allocations: [] } as any)).toBe(false);
  });

  it('Preventa lista la parte a inicial de un pago mixto, no el total del banco', () => {
    component.contractData = {
      transactions: [
        { id: 1, transaction_type: 'down_payment', amount: 10500000, transaction_date: '2026-01-05', payment_method: 'cash' },
        {
          id: 2,
          transaction_type: 'pago_mixto',
          amount: 5577970,
          transaction_date: '2026-09-09',
          payment_method: 'cash',
          allocations: [
            { target: 'down_payment', target_label: 'Cuota inicial', installment_number: 0, amount: 3000000, principal: 3000000, interest: 0 },
            { target: 'installment', target_label: 'Cuota regular', installment_number: 1, amount: 2577970, principal: 1130952.7, interest: 1447017.3 },
          ],
        },
      ],
    } as any;

    const rows = component.initialPaymentTransactions;
    expect(rows.length).toBe(2);
    expect(rows[0].amount).toBe(10500000);
    expect(rows[0].is_split).toBe(false);
    expect(rows[1].amount).toBe(3000000);
    expect(rows[1].is_split).toBe(true);
  });

  it('Debe registrar un toast de error en el servicio si el pago falla', () => {
    registerPaymentResult = throwError(() => ({
      status: 422,
      error: { errors: { amount: ['El monto es insuficiente'] } },
    }));
    component.contractId = 1;
    component.selectedFees = [{ ...cuota3 }];

    component.procesarPago({
      amount: 1000000,
      payment_method: 'transfer',
      transaction_date: '2026-08-30',
      receipt: new Blob(),
    });

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].title).toBe('No se pudo registrar el pago');
    expect(toasts[0].description).toBe('El monto es insuficiente');
  });

  it('Debe sugerir la suma de cuotas vencidas en flujo de pago general', () => {
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    component.openGeneralPaymentDrawer();

    expect(component.isDrawerOpen).toBeTruthy();
    expect(component.selectedFees).toEqual([]);
    expect(component.drawerSuggestedAmount).toBe(1000000);
  });

  it('en preventa el banner separa inicial y regulares sin lenguaje de cartera vencida', () => {
    component.contractData = {
      ...component.contractData,
      status: 'preventa_inactiva',
      lot: { status: 'preventa' },
      down_payment_pactada: 2000000,
      transactions: [],
    };
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    expect(component.isPreventaLot).toBe(true);
    expect(component.pendingInitialAmount).toBe(2000000);
    expect(component.overdueRegularAmount).toBe(0);
    expect(component.overdueRegularCount).toBe(0);
    expect(component.tieneCarteraVencida).toBe(true);
    expect(component.getFeeStatus({ ...cuota1, status: 'overdue' })).toBe('pending');
  });

  it('en preventa con inicial pendiente precarga solo la inicial y muestra el total vencido', () => {
    component.contractData = {
      ...component.contractData,
      status: 'preventa_inactiva',
      lot: { status: 'preventa' },
      down_payment_pactada: 2000000,
      transactions: [],
    };
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    component.openGeneralPaymentDrawer();

    expect(component.drawerSuggestedAmount).toBe(2000000);
    expect(component.drawerOverdueTotal).toBe(2000000);
    expect(component.selectedFees).toEqual([]);
  });

  it('en preventa no fusiona regulares vencidas al abrir el drawer de una cuota futura', () => {
    component.contractData = {
      ...component.contractData,
      status: 'preventa_inactiva',
      lot: { status: 'preventa' },
      down_payment_pactada: 2000000,
      transactions: [],
    };
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];
    component.selectedFees = [{ ...cuota3 }];

    component.openDrawer();

    const selectedIds = component.selectedFees.map((fee: any) => fee.id);
    expect(selectedIds).toEqual([3]);
    expect(selectedIds).not.toContain(1);
  });

  it('habilita Pagar en preventa si solo queda la inicial pendiente', () => {
    component.contractData = {
      ...component.contractData,
      status: 'preventa_inactiva',
      lot: { status: 'preventa' },
      down_payment_pactada: 2000000,
      transactions: [],
    };
    component.amortizationPlan = [cuotaInicial];

    expect(component.hasPendingPaymentsForGeneralFlow).toBe(true);
    expect((component as any).computeAmortizationSuggestedAmount()).toBe(2000000);
  });

  it('en preventa con inicial saldada precarga regulares vencidas', () => {
    component.contractData = {
      ...component.contractData,
      status: 'preventa_inactiva',
      lot: { status: 'preventa' },
      down_payment_pactada: 2000000,
      transactions: [{ transaction_type: 'down_payment', amount: 2000000 }],
    };
    component.amortizationPlan = [
      { ...cuotaInicial, status: 'paid', quota_debt: 0 },
      cuota1,
      cuota2,
      cuota3,
    ];

    component.openGeneralPaymentDrawer();

    expect(component.drawerSuggestedAmount).toBe(1000000);
    expect(component.drawerOverdueTotal).toBe(1000000);
  });

  it('en lote que no es preventa no cambia la precarga aunque la inicial tenga saldo', () => {
    component.contractData = {
      ...component.contractData,
      status: 'activo',
      lot: { status: 'vendido' },
      down_payment_pactada: 2000000,
      transactions: [],
    };
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    component.openGeneralPaymentDrawer();

    expect(component.drawerSuggestedAmount).toBe(1000000);
  });

  it('Debe sugerir la siguiente cuota pendiente si no hay vencidas', () => {
    const cuotaFuturaA = {
      ...cuota1,
      id: 11,
      installment_number: 11,
      due_date: isoWithOffset(5),
      quota_debt: 250000,
      status: 'pending',
    };
    const cuotaFuturaB = {
      ...cuota3,
      id: 12,
      installment_number: 12,
      due_date: isoWithOffset(20),
      quota_debt: 750000,
      status: 'pending',
    };

    component.amortizationPlan = [cuotaInicial, cuotaFuturaB, cuotaFuturaA];

    component.openGeneralPaymentDrawer();

    expect(component.drawerSuggestedAmount).toBe(250000);
  });

  it('en plan personalizado precarga la próxima promesa y deja la amortización como referencia', () => {
    component.contractData = {
      ...component.contractData,
      is_custom_plan: true,
    };
    component.paymentPromises = [
      {
        id: 21,
        contract_id: 1,
        payment_number: 1,
        expected_date: isoWithOffset(3),
        expected_amount: 180000,
        remaining_amount: 180000,
        description: 'Cuota pactada',
        is_paid: false,
        status: 'pendiente',
      },
    ];
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    component.openGeneralPaymentDrawer();

    expect(component.drawerSuggestedAmount).toBe(180000);
    expect(component.drawerAmountHint).toBe('schedule');
    expect(component.drawerAmortizationReferenceAmount).toBe(1000000);
  });

  it('oculta la pestaña de cronograma en contratos estándar', () => {
    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      is_custom_plan: false,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.canShowPromiseTab).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Cronograma Pactado en Promesa Comercial');
  });

  it('Debe omitir selected_installments e installment_numbers en flujo de pago general', () => {
    component.contractId = 1;
    component.amortizationPlan = [cuotaInicial, cuota1, cuota2, cuota3];

    component.openGeneralPaymentDrawer();
    component.procesarPago({
      amount: component.drawerSuggestedAmount,
      payment_method: 'cash',
      transaction_date: '2026-08-30',
      receipt: new Blob(),
    });

    expect(lastRegisterPaymentArgs).not.toBeNull();

    const formData = lastRegisterPaymentArgs?.formData as FormData;
    expect(formData.getAll('installment_numbers[]').length).toBe(0);
    expect(formData.getAll('selected_installments[]').length).toBe(0);
  });

  it('oculta Pagar y muestra las pestañas de bitácora para socio_gerencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.SOCIO_GERENCIA);

    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.canRegisterPayments).toBe(false);
    expect(fixture.componentInstance.canViewBitacora).toBe(true);
    expect(fixture.nativeElement.querySelector('.top-nav-action-btn--pay')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ver Historial de Pagos');
    expect(fixture.nativeElement.textContent).toContain('Venta');
    expect(fixture.nativeElement.textContent).toContain('Preventa');
    expect(fixture.nativeElement.textContent).toContain('Bitácora del contrato');
    expect(fixture.nativeElement.textContent).toContain('Bitácora del cliente');
  });

  it('muestra al administrador solo la pestaña de refinanciaciones', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);

    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.canViewBitacora).toBe(true);
    expect(fixture.componentInstance.canViewFullBitacora).toBe(false);
    expect(fixture.componentInstance.bitacoraContratoLabel).toBe('Refinanciaciones');
    expect(fixture.nativeElement.textContent).toContain('Refinanciaciones');
    expect(fixture.nativeElement.textContent).not.toContain('Bitácora del cliente');
  });

  it('activa Refinanciar para administrador y llama el endpoint al confirmar', () => {
    const refinanceSpy = vi.spyOn(component['amortizationService'], 'refinanceContract').mockReturnValue(of({}));
    const toastSpy = vi.spyOn(toastService, 'show');
    component.contractId = 11;

    component.openRefinanceModal();
    expect(component.isRefinanceModalOpen).toBe(true);

    component.confirmRefinance({
      tipo: 'tiempo_gracia',
      params: { months: 2 },
    });

    expect(refinanceSpy).toHaveBeenCalledWith(11, 'tiempo_gracia', { months: 2 });
    expect(component.isRefinanceModalOpen).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith(
      'Contrato refinanciado',
      'success',
      expect.stringContaining('aplicó'),
    );
  });

  it('muestra Refinanciar como próximamente para socio_gerencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.SOCIO_GERENCIA);

    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.canRefinance).toBe(false);
    expect(fixture.nativeElement.querySelector('.btn-refinance')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Próximamente');
  });

  it('en lote especial oculta Refinanciar, el toggle y el pagar de la barra', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);

    const fixture = TestBed.createComponent(AmortizationComponent);
    const instance = fixture.componentInstance;
    instance.contractData = {
      is_special_lot: true,
      status: 'preventa_inactiva',
      sale_price: 90000000,
      down_payment_pactada: 90000000,
      transactions: [],
      lot: { number: '59' },
    };
    instance.isLoading = false;
    instance.setDefaultView();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(instance.isSpecialLot).toBe(true);
    expect(instance.currentView).toBe('preventa');
    expect(instance.showAmortizationTabBar).toBe(true);
    expect(text).not.toContain('Refinanciar');
    expect(text).toContain('Desistimiento');
    expect(fixture.nativeElement.querySelector('.view-switch')).toBeNull();
    expect(fixture.nativeElement.querySelector('.top-nav-action-btn--pay')).toBeNull();
    expect(text).toContain('Seguimiento de Abonos');
    expect(text).toContain('Hoja de vida');
    expect(text).not.toContain('Amortización Financiera');
    expect(text).toContain('Lote Especial · Preventa');
    expect(text).toContain('+ Registrar abono');
  });

  it('en contrato normal mantiene Refinanciar, toggle Venta/Preventa y Amortización Financiera', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);

    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      is_special_lot: false,
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.componentInstance.isLoading = false;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.componentInstance.isSpecialLot).toBe(false);
    expect(text).toContain('Refinanciar');
    expect(text).toContain('Venta');
    expect(text).toContain('Preventa');
    expect(text).toContain('Amortización Financiera');
    expect(text).toContain('Hoja de vida');
    expect(text).not.toContain('Seguimiento de Abonos');
    expect(text).not.toContain('Lote Especial ·');
    expect(fixture.nativeElement.querySelector('.view-switch')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.top-nav-action-btn--pay')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.btn-refinance')).toBeTruthy();
  });

  it('en la pestaña de amortización muestra la brecha entre criterios', () => {
    const fixture = TestBed.createComponent(AmortizationComponent);
    const instance = fixture.componentInstance;
    instance.isLoading = false;
    instance.activeTab = 'amortizacion';
    instance.lifeSheet = {
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
        document_number: null,
        address: null,
        email: null,
        phone: null,
        term_months: 60,
        seller_name: null,
        is_special_lot: false,
        is_custom_plan: false,
        note: 'Saldo calculado sobre el valor total del plan.',
      },
      rows: [],
      summary: {
        collected: '0.00',
        interest_paid: '0.00',
        principal_paid: '0.00',
        unimputed: '0.00',
        life_sheet_balance: '157938999.00',
        outstanding_capital: '121148000.00',
        criteria_gap: '36790999.00',
        criteria_gap_label: 'Brecha entre criterios',
        criteria_gap_hint: 'Saldo de la hoja de vida − capital insoluto.',
        amortization_note: 'Saldo de capital del plan francés.',
        life_sheet_note: 'Saldo calculado sobre el valor total del plan.',
      },
    };
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Saldo de capital del plan francés.');
    expect(text).toContain('Brecha entre criterios');
    expect(text).toContain('capital insoluto');
  });

  it('con plan vacío muestra el aviso y no genera automáticamente', () => {
    const getPlanSpy = vi.spyOn(component['amortizationService'], 'getPlan').mockReturnValue(of({ data: [] }));
    const getLifeSheetSpy = vi.spyOn(component['amortizationService'], 'getLifeSheet').mockReturnValue(of({ data: undefined }));
    const generatePlanSpy = vi.spyOn(component['amortizationService'], 'generatePlan').mockReturnValue(of({}));

    component.contractId = 42;
    component.loadAmortizationPlan();

    expect(getPlanSpy).toHaveBeenCalledTimes(1);
    expect(getLifeSheetSpy).toHaveBeenCalledTimes(1);
    expect(generatePlanSpy).not.toHaveBeenCalled();
    expect(component.amortizationPlan).toEqual([]);
    expect(component.isLoading).toBe(false);
  });

  it('el socio ve el aviso sin botón de generar tabla', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.SOCIO_GERENCIA);

    const fixture = TestBed.createComponent(AmortizationComponent);
    const instance = fixture.componentInstance;
    instance.isLoading = false;
    instance.isGenerating = false;
    instance.amortizationPlan = [];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Este contrato aún no tiene tabla de amortización');
    expect(text).not.toContain('Generar Tabla Definitiva');
    expect(fixture.nativeElement.querySelector('button.btn-primary')).toBeNull();
  });

  it('el administrador ve el botón de generar tabla cuando no hay plan', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);

    const fixture = TestBed.createComponent(AmortizationComponent);
    const instance = fixture.componentInstance;
    instance.isLoading = false;
    instance.isGenerating = false;
    instance.amortizationPlan = [];
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Este contrato aún no tiene tabla de amortización');
    expect(text).toContain('Generar Tabla Definitiva');
  });

  it('respeta el orden guardado y oculta pestañas que no aplican', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === AppRoles.ADMINISTRADOR);
    vi.spyOn(auth, 'contractTabOrder').mockReturnValue([
      'hoja-vida',
      'bitacora-contrato',
      'promesa',
      'amortizacion',
      'bitacora-cliente',
    ]);

    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.componentInstance.isLoading = false;
    fixture.detectChanges();

    expect(fixture.componentInstance.orderedTabs.map((tab) => tab.id)).toEqual([
      'hoja-vida',
      'bitacora-contrato',
      'amortizacion',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Restablecer orden');
    expect(fixture.nativeElement.textContent).not.toContain('Bitácora del cliente');
  });

  it('con Alt y flecha reordena la pestaña enfocada', () => {
    const auth = TestBed.inject(AuthService);
    const update = vi.spyOn(auth, 'updateContractTabs').mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(AmortizationComponent);
    fixture.componentInstance.contractData = {
      status: 'activo',
      customer_id: 7,
      transactions: [],
      down_payment_pactada: 2000000,
    };
    fixture.componentInstance.isLoading = false;
    fixture.detectChanges();

    fixture.componentInstance.onTabKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }),
      0,
    );

    expect(update).toHaveBeenCalledWith([
      'hoja-vida',
      'amortizacion',
      'promesa',
      'bitacora-contrato',
      'bitacora-cliente',
    ]);
  });

  it('arranca el arrastre al primer pixel para que la pestaña siga el cursor', () => {
    const fixture = TestBed.createComponent(AmortizationComponent);
    const config = fixture.debugElement.injector.get(CDK_DRAG_CONFIG);

    expect(config.dragStartThreshold).toBe(1);
    expect(config.zIndex).toBe(40);
    expect(config.previewClass).toBe('contract-tab-preview');
  });

  it('el botón volver sigue el penúltimo segmento de la miga', () => {
    const fixture = TestBed.createComponent(AmortizationComponent);
    const trail = TestBed.inject(NavigationTrailService);
    TestBed.inject(PageTitleService).set('SM-LOTE-49');
    trail.capture(trail.state([lotsHub(), lotContractsHub(12, 'Lote 49')]));
    fixture.detectChanges();

    expect(fixture.componentInstance.backCrumb()).toEqual({
      label: 'Lote 49',
      url: '/contracts',
      queryParams: { lotId: 12 },
    });
    expect(fixture.nativeElement.textContent).toContain('Volver a Lote 49');
  });
});
