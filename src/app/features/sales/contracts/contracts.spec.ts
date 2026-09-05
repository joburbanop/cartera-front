import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ContractsComponent } from './contracts.component';

describe('ContractsComponent', () => {
  let component: ContractsComponent;
  let fixture: ComponentFixture<ContractsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContractsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));
    httpMock.verify();
  });

  function applyFinancials(): void {
    component.contractForm.controls.sale_price.setValue(100000000 as never);
    component.contractForm.controls.down_payment_pactada.setValue(20000000 as never);
    component.contractForm.controls.term_months.setValue(12 as never);
    component.contractForm.controls.interest_rate.setValue(1);
  }

  function openCustomPlanModal(): void {
    component.openModal();
    fixture.detectChanges();
    applyFinancials();
    component.contractForm.patchValue({ is_custom_plan: true });
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra saldo a financiar y valor futuro como cifras distintas', () => {
    openCustomPlanModal();

    expect(component.isModalOpen).toBe(true);
    expect(component.valorFuturoDeuda).toBeGreaterThan(component.saldoAFinanciar);
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeTruthy();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Saldo a financiar');
    expect(text).toContain('Valor futuro');
  });

  it('marca distribución válida solo cuando el total coincide con el valor futuro', () => {
    openCustomPlanModal();

    if (component.paymentPromises.length === 0) {
      component.addPaymentPromise();
    }

    const valorFuturo = component.valorFuturoDeuda;
    expect(valorFuturo).toBeGreaterThan(component.saldoAFinanciar);

    component.paymentPromises.at(0).patchValue({
      expected_date: '2026-01-15',
      expected_amount: valorFuturo as never,
      description: 'Cuota única',
    });
    fixture.detectChanges();

    expect(component.hasFinancialDifference).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Distribución válida');

    component.paymentPromises.at(0).patchValue({
      expected_amount: (valorFuturo + 5000) as never,
    });
    fixture.detectChanges();

    expect(component.hasFinancialDifference).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Distribución válida');
  });

  it('marca visualmente el campo obligatorio vacío al guardar un contrato estándar', () => {
    component.openModal();
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    const contractNumber = component.contractForm.get('contract_number');
    expect(contractNumber?.touched).toBe(true);
    expect(contractNumber?.invalid).toBe(true);
    expect(component.contractForm.get('first_installment_date')?.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('El número de contrato es obligatorio');

    const input = fixture.nativeElement.querySelector('input[formControlName="contract_number"]') as HTMLInputElement;
    expect(input.classList.contains('ng-invalid')).toBe(true);
    expect(input.classList.contains('ng-touched')).toBe(true);
  });

  it('al guardar un contrato personalizado marca las cuotas vacías y no exige primera cuota ordinaria', () => {
    component.openModal();
    fixture.detectChanges();
    component.contractForm.patchValue({ is_custom_plan: true });
    fixture.detectChanges();

    expect(component.contractForm.get('first_installment_date')?.hasValidator(Validators.required)).toBe(false);

    component.onSubmit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('La fecha es obligatorio');
    expect(text).toContain('El monto es obligatorio');
    expect(text).toContain('La descripción es obligatorio');
    expect(component.contractForm.get('first_installment_date')?.hasError('required')).toBeFalsy();
  });

  it('deja en blanco una fila nueva de cuota personalizada', () => {
    component.openModal();
    fixture.detectChanges();
    component.contractForm.patchValue({ is_custom_plan: true });
    fixture.detectChanges();

    if (component.paymentPromises.length === 0) {
      component.addPaymentPromise();
    }

    component.paymentPromises.at(0).patchValue({
      expected_date: '2026-02-01',
      expected_amount: 1500000 as never,
      description: 'Prima',
    });

    component.addPaymentPromise();

    const nueva = component.paymentPromises.at(1).getRawValue();
    expect(nueva.expected_date).toBe('');
    expect(nueva.expected_amount).toBeNull();
    expect(nueva.description).toBe('');
  });

  it('advierte cuántas cuotas faltan cuando hay menos que el plazo', () => {
    openCustomPlanModal();
    component.contractForm.controls.term_months.setValue(10 as never);

    while (component.paymentPromises.length < 3) {
      component.addPaymentPromise();
    }
    while (component.paymentPromises.length > 3) {
      component.paymentPromises.removeAt(component.paymentPromises.length - 1);
    }
    fixture.detectChanges();

    expect(component.missingTermInstallments).toBe(7);
    expect(component.missingTermInstallmentsMessage).toBe(
      'Faltan 7 cuotas para completar el plazo de 10 meses',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Faltan 7 cuotas para completar el plazo de 10 meses',
    );
  });

  it('no muestra advertencia de conteo cuando las cuotas coinciden con el plazo', () => {
    openCustomPlanModal();
    component.contractForm.controls.term_months.setValue(3 as never);

    while (component.paymentPromises.length < 3) {
      component.addPaymentPromise();
    }
    while (component.paymentPromises.length > 3) {
      component.paymentPromises.removeAt(component.paymentPromises.length - 1);
    }
    fixture.detectChanges();

    expect(component.missingTermInstallments).toBe(0);
    expect(component.missingTermInstallmentsMessage).toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('para completar el plazo');
  });

  it('pide contratos por lot_id y muestra recaudo, saldo y avance del contrato del lote', async () => {
    component.selectedLotId = 1;
    component.selectedLot = {
      id: 1,
      number: '1',
      area_m2: '0.00',
      list_price: '160779700.00',
      status: 'preventa',
      project_id: 4,
    };
    component.contracts = [{
      id: 1,
      lot_id: 1,
      contract_number: 'SM-LOTE-1',
      sale_price: '160779700.00',
      status: 'preventa_inactiva',
      transactions: [{ amount: '10500000.00' }],
      lot: component.selectedLot,
    }];
    component.calculateKPIs();
    fixture.detectChanges();

    expect(component.totalCollected).toBe(10500000);
    expect(component.outstandingBalance).toBe(150279700);
    expect(component.paymentProgressPercent).toBeCloseTo((10500000 / 160779700) * 100, 4);
  });

  it('usa el contrato activo más reciente para los KPI si hay historial', () => {
    component.selectedLotId = 9;
    component.contracts = [
      {
        id: 1,
        lot_id: 9,
        status: 'rescindido',
        sale_price: '1000000',
        start_date: '2024-01-01',
        transactions: [{ amount: '100000' }],
      },
      {
        id: 2,
        lot_id: 9,
        status: 'activo',
        sale_price: '2000000',
        start_date: '2026-01-01',
        transactions: [{ amount: '500000' }],
      },
    ];
    component.calculateKPIs();

    expect(component.totalCollected).toBe(500000);
    expect(component.outstandingBalance).toBe(1500000);
  });

  it('en modalidad lote especial oculta plazo y cuota inicial y muestra la pestaña', () => {
    component.openModal();
    fixture.detectChanges();
    component.selectPlanMode('special');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(component.isSpecialLot).toBe(true);
    expect(component.isStandardPlan).toBe(false);
    expect(text).toContain('Lote Especial');
    expect(fixture.nativeElement.querySelector('input[formControlName="term_months"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formControlName="down_payment_pactada"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formControlName="sale_price"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[formControlName="start_date"]')).toBeTruthy();
  });
});

describe('ContractsComponent hoja de vida', () => {
  it('consulta GET /contracts?lot_id= y GET /lots/:id', async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ lotId: '1' }),
            queryParamMap: of(convertToParamMap({ lotId: '1' })),
          },
        },
      ],
    }).compileComponents();

    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ContractsComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const lotReq = httpMock.expectOne((req) => req.url.endsWith('/lots/1') && req.method === 'GET');
    lotReq.flush({
      data: {
        id: 1,
        number: '1',
        area_m2: '0.00',
        list_price: '160779700.00',
        status: 'preventa',
        project_id: 4,
      },
    });

    const contractsReq = httpMock.expectOne((req) =>
      req.url.includes('/contracts') && req.params.get('lot_id') === '1',
    );
    expect(contractsReq.request.params.get('per_page')).toBe('100');
    contractsReq.flush({
      data: {
        data: [{
          id: 1,
          lot_id: 1,
          contract_number: 'SM-LOTE-1',
          sale_price: '160779700.00',
          status: 'preventa_inactiva',
          customer: { name: 'Rafael Cruz' },
          transactions: [{ amount: '10500000.00' }],
          lot: { id: 1, number: '1' },
        }],
      },
    });

    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.contracts).toHaveLength(1);
    expect(component.contracts[0].contract_number).toBe('SM-LOTE-1');
    expect(component.totalCollected).toBe(10500000);
    expect(fixture.nativeElement.textContent).toContain('SM-LOTE-1');
    expect(fixture.nativeElement.textContent).toContain('Precio de lista');
    expect(fixture.nativeElement.textContent).toContain('Total recaudado');
    expect(fixture.nativeElement.textContent).toContain('Saldo pendiente');
  });
});

