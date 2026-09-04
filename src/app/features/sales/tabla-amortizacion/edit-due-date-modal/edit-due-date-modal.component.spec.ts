import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AmortizationService } from '../../../../core/services/amortization.service';
import { EditDueDateModalComponent } from './edit-due-date-modal.component';

describe('EditDueDateModalComponent', () => {
  let component: EditDueDateModalComponent;
  let fixture: ComponentFixture<EditDueDateModalComponent>;
  let previewCalls: Array<{ mode: string; cadence: string }>;

  beforeEach(async () => {
    previewCalls = [];

    await TestBed.configureTestingModule({
      imports: [EditDueDateModalComponent],
      providers: [
        {
          provide: AmortizationService,
          useValue: {
            previewInstallmentDueDate: (
              _contractId: number,
              _installmentId: number,
              _dueDate: string,
              mode: string,
              cadence: string,
            ) => {
              previewCalls.push({ mode, cadence });
              return of({
                data: {
                  mode,
                  cadence,
                  installment_number: 1,
                  is_custom_plan: false,
                  shifts_promises: false,
                  updates_contract_anchor: true,
                  min_due_date: null,
                  max_due_date: null,
                  affected_count: 3,
                  promises_affected_count: 0,
                  preview: [
                    { installment_number: 1, due_date_before: '2025-04-30', due_date_after: '2025-04-30' },
                    { installment_number: 2, due_date_before: '2025-05-30', due_date_after: cadence === 'month_end' ? '2025-05-31' : '2025-05-30' },
                  ],
                },
              });
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDueDateModalComponent);
    component = fixture.componentInstance;
    component.contractId = 114;
    component.installment = { id: 1, installment_number: 1, due_date: '2025-04-30' } as any;
    component.installments = [
      { id: 1, installment_number: 1, due_date: '2025-04-30' } as any,
      { id: 2, installment_number: 2, due_date: '2025-05-30' } as any,
    ];
  });

  it('no muestra cadencia en modo una sola cuota', () => {
    component.isOpen = true;
    component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Fin de mes');
    expect(previewCalls.at(-1)).toEqual({ mode: 'single', cadence: 'same_day' });
  });

  it('en cascada muestra fin de mes y refresca la previsualización', () => {
    component.isOpen = true;
    component.ngOnChanges({ isOpen: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true } });
    component.mode = 'cascade';
    component.onModeOrDateChange();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fin de mes');
    expect(fixture.nativeElement.textContent).toContain('Mismo día del mes');
    expect(previewCalls.at(-1)?.cadence).toBe('same_day');

    component.cadence = 'month_end';
    component.onModeOrDateChange();
    fixture.detectChanges();

    expect(previewCalls.at(-1)).toEqual({ mode: 'cascade', cadence: 'month_end' });
    expect(fixture.nativeElement.textContent).toContain('31/05/2025');
  });
});
