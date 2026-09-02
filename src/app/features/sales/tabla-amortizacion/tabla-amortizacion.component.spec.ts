import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

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
import { ToastService } from '../../../shared/services/toast.service';

describe('AmortizationComponent', () => {
  let component: AmortizationComponent;
  let toastService: ToastService;
  let registerPaymentResult: Observable<unknown> = of({});
  let lastRegisterPaymentArgs: {
    contractId: number;
    formData: FormData;
    transactionType: string;
  } | null = null;

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
      downloadPdf: () => of(new Blob()),
      generatePlan: () => of({}),
      refinanceContract: () => of({}),
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
      getTransactionsByContract: () => of({ data: [] }),
      getAllTransactions: () => of({ data: [] }),
    } as Partial<RecaudoService> as RecaudoService;

    const paymentPromiseServiceMock = {
      getPromisesByContract: () => of([]),
    } as Partial<PaymentPromiseService> as PaymentPromiseService;

    const activityServiceMock = {
      getActivity: () => of({ data: [] }),
    } as Partial<ActivityService> as ActivityService;

    const authServiceMock = {
      hasRole: () => true,
      getRole: () => 'administrador',
      isLoggedIn: () => true,
    } as Partial<AuthService> as AuthService;

    const routerMock = {
      navigate: () => Promise.resolve(true),
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

  it('debe cortar la recursión si el plan sigue vacío después de intentar generarlo', () => {
    const getPlanSpy = vi.spyOn(component['amortizationService'], 'getPlan').mockReturnValue(of({ data: [] }));
    const generatePlanSpy = vi.spyOn(component['amortizationService'], 'generatePlan').mockReturnValue(of({}));
    const toastSpy = vi.spyOn(toastService, 'show');

    component.contractId = 42;
    component.loadAmortizationPlan();

    expect(getPlanSpy).toHaveBeenCalledTimes(2);
    expect(generatePlanSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledWith(
      'No se pudo cargar la tabla de amortización',
      'error',
      expect.stringContaining('no está disponible')
    );
  });
});
