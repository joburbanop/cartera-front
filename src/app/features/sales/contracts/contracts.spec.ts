import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ContractsComponent } from './contracts.component';
import { NavigationTrailService } from '../../../core/services/navigation-trail.service';
import { PageTitleService } from '../../../core/services/page-title.service';

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
    expect(fixture.nativeElement.querySelector('.app-modal-backdrop')).toBeTruthy();

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

  it('envía cada filtro y la combinación al backend', () => {
    httpMock.match(() => true).forEach((req) => req.flush({
      data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 },
    }));

    const cases: Array<{ patch: Record<string, string>; param: string; value: string }> = [
      { patch: { contract_number: 'SM-1' }, param: 'contract_number', value: 'SM-1' },
      { patch: { customer: 'Ana' }, param: 'customer', value: 'Ana' },
      { patch: { project_id: '3' }, param: 'project_id', value: '3' },
      { patch: { lot_number: '6' }, param: 'lot_number', value: '6' },
      { patch: { status: 'activo' }, param: 'status', value: 'activo' },
      { patch: { cartera: 'mora' }, param: 'cartera', value: 'mora' },
      { patch: { start_date_from: '2026-01-01' }, param: 'start_date_from', value: '2026-01-01' },
      { patch: { start_date_to: '2026-03-31' }, param: 'start_date_to', value: '2026-03-31' },
    ];

    for (const item of cases) {
      component.filterForm.reset({
        contract_number: '',
        customer: '',
        project_id: '',
        lot_number: '',
        status: '',
        cartera: '',
        start_date_from: '',
        start_date_to: '',
      }, { emitEvent: false });
      component.filterForm.patchValue(item.patch, { emitEvent: false });
      component.loadContracts(1);

      const req = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
      expect(req.request.params.get(item.param)).toBe(item.value);
      req.flush({ data: { data: [], total: 4, current_page: 1, last_page: 1, per_page: 10 } });
    }

    component.filterForm.patchValue({
      contract_number: 'SM-1',
      customer: 'Ana',
      project_id: '3',
      lot_number: '6',
      status: 'activo',
      cartera: 'al_dia',
      start_date_from: '2026-01-01',
      start_date_to: '2026-03-31',
    }, { emitEvent: false });
    component.loadContracts(1);

    const combined = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
    expect(combined.request.params.get('contract_number')).toBe('SM-1');
    expect(combined.request.params.get('customer')).toBe('Ana');
    expect(combined.request.params.get('project_id')).toBe('3');
    expect(combined.request.params.get('lot_number')).toBe('6');
    expect(combined.request.params.get('status')).toBe('activo');
    expect(combined.request.params.get('cartera')).toBe('al_dia');
    expect(combined.request.params.get('start_date_from')).toBe('2026-01-01');
    expect(combined.request.params.get('start_date_to')).toBe('2026-03-31');
    combined.flush({ data: { data: [], total: 12, current_page: 1, last_page: 1, per_page: 10 } });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12 contratos encontrados');
  });

  it('limpia query params y vuelve a la página 1', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.filterForm.patchValue({ contract_number: 'SM-1', status: 'activo' });
    component.currentPage = 3;
    component.clearFilters();

    expect(component.filterForm.value.contract_number).toBe('');
    expect(component.filterForm.value.status).toBe('');
    expect(component.currentPage).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/contracts'], { queryParams: {} });
  });

  it('no envía filtros de listado cuando está la hoja de vida del lote', () => {
    httpMock.match(() => true).forEach((req) => req.flush({
      data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 },
    }));

    component.selectedLotId = 9;
    component.filterForm.patchValue({ status: 'activo', customer: 'Ana' }, { emitEvent: false });
    component.loadContracts(1);

    const req = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
    expect(req.request.params.get('lot_id')).toBe('9');
    expect(req.request.params.get('status')).toBeNull();
    expect(req.request.params.get('customer')).toBeNull();
    req.flush({ data: { data: [], total: 1, current_page: 1, last_page: 1, per_page: 100 } });
  });

  it('la sección Contratos excluye los rescindidos con exclude_status', () => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));

    component.loadContracts(1);

    const req = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
    expect(req.request.params.get('exclude_status')).toBe('rescindido');
    expect(req.request.params.get('status')).toBeNull();
    req.flush({ data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 } });
  });

  it('la sección Rescindidos pide status=rescindido y limpia la lista anterior', () => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));

    component.contracts = [{ id: 1, contract_number: 'SM-LOTE-1', status: 'rescindido' }];
    component.selectContractSection('rescindidos');

    expect(component.showRescinded).toBe(true);
    expect(component.contracts).toEqual([]);
    expect(component.currentPage).toBe(1);

    const req = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
    expect(req.request.params.get('status')).toBe('rescindido');
    expect(req.request.params.get('exclude_status')).toBeNull();
    req.flush({
      data: {
        data: [
          { id: 1, contract_number: 'SM-LOTE-1', status: 'rescindido' },
          { id: 59, contract_number: 'SM-LOTE-60', status: 'rescindido' },
        ],
        total: 2,
        current_page: 1,
        last_page: 1,
        per_page: 10,
      },
    });

    expect(component.contracts.map((contract) => contract.contract_number)).toEqual([
      'SM-LOTE-1',
      'SM-LOTE-60',
    ]);
    expect(component.totalContracts).toBe(2);
  });

  it('al volver a Contratos descarta el status rescindido del filtro manual', () => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));

    component.selectContractSection('rescindidos');
    httpMock.match(() => true).forEach((req) =>
      req.flush({ data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 } }),
    );

    component.filterForm.patchValue({ status: 'rescindido' }, { emitEvent: false });
    component.selectContractSection('contratos');

    expect(component.filterForm.get('status')?.value).toBe('');
    const req = httpMock.expectOne((request) => request.url.includes('/contracts') && request.method === 'GET');
    expect(req.request.params.get('exclude_status')).toBe('rescindido');
    expect(req.request.params.get('status')).toBeNull();
    req.flush({ data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 } });
  });

  it('la paginación de Archivados llama a loadArchivedContracts', () => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));

    component.showArchived = true;
    component.onPageChange(2);

    const req = httpMock.expectOne((request) =>
      request.url.endsWith('/contracts/archived') && request.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: { data: [], total: 0, current_page: 2, last_page: 2, per_page: 10 } });
  });

  it('muestra las pestañas Contratos y Rescindidos en la vista general', () => {
    httpMock.match(() => true).forEach((req) =>
      req.flush({ data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 } }),
    );
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('.view-tabs button');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Contratos');
    expect(tabs[1].textContent).toContain('Rescindidos');
  });

  it('al abrir amortización desde el lote lleva el rastro de cuatro niveles', () => {
    component.selectedLotId = 12;
    component.selectedLot = { number: '49' };
    TestBed.inject(PageTitleService).set('Lote 49');

    expect(component.amortizationNavState()).toEqual(
      TestBed.inject(NavigationTrailService).state([
        { label: 'Lotes', url: '/lots' },
        { label: 'Lote 49', url: '/contracts', queryParams: { lotId: 12 } },
      ]),
    );

    component.selectedLotId = null;
    expect(component.amortizationNavState()).toEqual(
      TestBed.inject(NavigationTrailService).state([{ label: 'Contratos', url: '/contracts' }]),
    );
  });

  it('con plazo de 6 meses deja la tasa en 0 en el formulario, preview y POST', () => {
    component.openModal();
    fixture.detectChanges();
    component.contractForm.controls.sale_price.setValue(8000000 as never);
    component.contractForm.controls.down_payment_pactada.setValue(2000000 as never);
    component.contractForm.controls.interest_rate.setValue(1);
    component.contractForm.controls.term_months.setValue(6 as never);
    fixture.detectChanges();

    expect(component.contractForm.controls.interest_rate.value).toBe(0);
    expect(component.effectiveInterestRate(6, 1)).toBe(0);
    expect(component.projectedQuota).toBe(1000000);
  });

  it('con plazo de 13 meses conserva la tasa del formulario', () => {
    component.openModal();
    fixture.detectChanges();
    component.contractForm.controls.interest_rate.setValue(1);
    component.contractForm.controls.term_months.setValue(13 as never);
    fixture.detectChanges();

    expect(component.contractForm.controls.interest_rate.value).toBe(1);
    expect(component.effectiveInterestRate(13, 1)).toBe(1);
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
    expect(fixture.nativeElement.querySelector('tr.clickable-row')).toBeTruthy();
  });
});

