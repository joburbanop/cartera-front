import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LotsComponent } from './lots.component';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

describe('LotsComponent', () => {
  let component: LotsComponent;
  let fixture: ComponentFixture<LotsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotsComponent],
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
    fixture = TestBed.createComponent(LotsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.match(() => true).forEach((req) => req.flush({ data: [] }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre la bitácora del lote para socio_gerencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === 'socio_gerencia');

    expect(component.canViewBitacora).toBe(true);

    component.openBitacora({ id: 12, number: 'L-01' });
    expect(component.isBitacoraOpen).toBe(true);
    expect(component.bitacoraSubjectType).toBe('lot');
    expect(component.bitacoraSubjectId).toBe(12);
  });

  it('muestra Renegociación en el listado sin cambiar el valor almacenado abogado', () => {
    const lot = {
      id: 9,
      number: 'L-09',
      area_m2: 120,
      list_price: 80000000,
      status: 'abogado',
      project: { name: 'Bosque Real' },
    };

    fixture.detectChanges();

    httpMock.match((req) => req.url.includes('/projects')).forEach((req) => req.flush({ data: [] }));
    httpMock.match((req) => req.url.includes('/lots')).forEach((req) => req.flush({
      data: {
        data: [lot],
        total: 1,
        current_page: 1,
        last_page: 1,
        per_page: 20,
      },
    }));
    fixture.detectChanges();

    expect(component.lots[0].status).toBe('abogado');
    expect(fixture.nativeElement.textContent).toContain('Renegociación');
    expect(fixture.nativeElement.textContent).not.toContain('Abogado');
  });

  it('lleva a la ficha cuando el lote tiene un solo contrato y a la hoja de vida si no', () => {
    const withOne = {
      id: 1,
      number: '1',
      status: 'preventa',
      contracts_count: 1,
      contracts: [{ id: 54 }],
    };
    const empty = {
      id: 2,
      number: '99',
      status: 'disponible',
      contracts_count: 0,
      contracts: [],
    };
    const withHistory = {
      id: 3,
      number: '3',
      status: 'preventa',
      contracts_count: 2,
      contracts: [{ id: 10 }, { id: 11 }],
    };

    expect(component.lotResumeCommands(withOne)).toEqual(['/amortization', 54]);
    expect(component.lotResumeQueryParams(withOne)).toEqual({});
    expect(component.lotResumeCommands(empty)).toEqual(['/contracts']);
    expect(component.lotResumeQueryParams(empty)).toEqual({ lotId: 2 });
    expect(component.lotResumeCommands(withHistory)).toEqual(['/contracts']);
    expect(component.lotResumeQueryParams(withHistory)).toEqual({ lotId: 3 });
  });

  it('envía cada filtro y la combinación al backend', () => {
    httpMock.match(() => true).forEach((req) => req.flush({
      data: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 20 },
    }));

    const cases: Array<{ patch: Record<string, string>; param: string; value: string }> = [
      { patch: { number: '6' }, param: 'number', value: '6' },
      { patch: { status: 'abogado' }, param: 'status', value: 'abogado' },
      { patch: { project_id: '3' }, param: 'project_id', value: '3' },
      { patch: { plan_type: 'none' }, param: 'plan_type', value: 'none' },
      { patch: { cartera: 'mora' }, param: 'cartera', value: 'mora' },
      { patch: { customer: 'Ana' }, param: 'customer', value: 'Ana' },
    ];

    for (const item of cases) {
      component.filterForm.reset({
        number: '',
        status: '',
        project_id: '',
        plan_type: '',
        cartera: '',
        customer: '',
      }, { emitEvent: false });
      component.filterForm.patchValue(item.patch, { emitEvent: false });
      component.loadLots(1);

      const req = httpMock.expectOne((request) => request.url.includes('/lots') && request.method === 'GET');
      expect(req.request.params.get(item.param)).toBe(item.value);
      req.flush({ data: { data: [], total: 4, current_page: 1, last_page: 1, per_page: 20 } });
    }

    component.filterForm.patchValue({
      number: '6',
      status: 'preventa',
      project_id: '3',
      plan_type: 'standard',
      cartera: 'al_dia',
      customer: 'Ana',
    }, { emitEvent: false });
    component.loadLots(1);

    const combined = httpMock.expectOne((request) => request.url.includes('/lots') && request.method === 'GET');
    expect(combined.request.params.get('number')).toBe('6');
    expect(combined.request.params.get('status')).toBe('preventa');
    expect(combined.request.params.get('project_id')).toBe('3');
    expect(combined.request.params.get('plan_type')).toBe('standard');
    expect(combined.request.params.get('cartera')).toBe('al_dia');
    expect(combined.request.params.get('customer')).toBe('Ana');
    combined.flush({ data: { data: [], total: 12, current_page: 1, last_page: 1, per_page: 20 } });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('12 lotes encontrados');
  });

  it('limpia query params y vuelve a la página 1', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.filterForm.patchValue({ number: '6', status: 'preventa' });
    component.currentPage = 3;
    component.clearFilters();

    expect(component.filterForm.value.number).toBe('');
    expect(component.filterForm.value.status).toBe('');
    expect(component.currentPage).toBe(1);
    expect(navigate).toHaveBeenCalledWith(['/lots'], { queryParams: {} });
  });

  it('el alta usa Separado y Renegociación, no Reservado', () => {
    fixture.detectChanges();
    component.openModal();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Separado');
    expect(text).toContain('Renegociación');
    expect(text).not.toContain('Reservado');
    expect(component.lotForm.get('status')?.value).toBe('disponible');
  });
});
