import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmortizationInstallment } from '../../../../core/models/amortization-installment.model';
import { AmortizationService } from '../../../../core/services/amortization.service';

export type DueDateAdjustMode = 'single' | 'cascade';
export type DueDateCadence = 'same_day' | 'month_end';

export interface DueDatePreviewRow {
  installment_number: number;
  due_date_before: string;
  due_date_after: string;
}

export interface DueDatePreviewPlan {
  mode: DueDateAdjustMode;
  cadence?: DueDateCadence;
  installment_number: number;
  is_custom_plan: boolean;
  shifts_promises: boolean;
  updates_contract_anchor: boolean;
  min_due_date: string | null;
  max_due_date: string | null;
  affected_count: number;
  promises_affected_count: number;
  preview: DueDatePreviewRow[];
}

@Component({
  selector: 'app-edit-due-date-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-due-date-modal.component.html',
  styleUrl: './edit-due-date-modal.component.scss',
})
export class EditDueDateModalComponent implements OnChanges {
  private amortizationService = inject(AmortizationService);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() contractId: number | null = null;
  @Input() installment: AmortizationInstallment | null = null;
  @Input() installments: AmortizationInstallment[] = [];
  @Input() isCustomPlan = false;
  @Input() isSaving = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveDueDate = new EventEmitter<{ dueDate: string; mode: DueDateAdjustMode; cadence: DueDateCadence }>();

  mode: DueDateAdjustMode = 'single';
  cadence: DueDateCadence = 'same_day';
  dueDate = '';
  confirmed = false;
  preview: DueDatePreviewPlan | null = null;
  previewError = '';
  isLoadingPreview = false;

  private previewSeq = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['installment'] || changes['isOpen']) && this.isOpen) {
      this.mode = 'single';
      this.cadence = 'same_day';
      this.confirmed = false;
      this.preview = null;
      this.previewError = '';
      this.dueDate = this.normalizeDateInput(this.installment?.due_date ?? null);
      this.refreshPreview();
    }
  }

  get installmentNumber(): number {
    return Number(this.installment?.installment_number ?? 0);
  }

  get previousDueDate(): string | null {
    return this.neighbor(-1);
  }

  get nextDueDate(): string | null {
    return this.neighbor(1);
  }

  get rangeHelper(): string {
    const previous = this.formatDisplayDate(this.previousDueDate);
    const next = this.formatDisplayDate(this.nextDueDate);

    if (this.mode === 'cascade') {
      return previous
        ? `Debe ser posterior a ${previous}. Las cuotas siguientes se recadencian según la cadencia elegida.`
        : 'Las cuotas siguientes se recadencian según la cadencia elegida.';
    }

    if (previous && next) {
      return `Debe estar estrictamente entre ${previous} y ${next}.`;
    }
    if (previous) {
      return `Debe ser posterior a ${previous}.`;
    }
    if (next) {
      return `Debe ser anterior a ${next}.`;
    }

    return 'Elija la nueva fecha de vencimiento.';
  }

  get dateMin(): string | null {
    return this.addDays(this.previousDueDate, 1);
  }

  get dateMax(): string | null {
    if (this.mode === 'cascade') {
      return null;
    }

    return this.addDays(this.nextDueDate, -1);
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.closeModal.emit();
  }

  onModeOrDateChange(): void {
    this.confirmed = false;
    this.refreshPreview();
  }

  save(): void {
    if (this.isSaving || !this.dueDate || !this.confirmed || this.previewError) {
      return;
    }

    this.saveDueDate.emit({ dueDate: this.dueDate, mode: this.mode, cadence: this.effectiveCadence() });
  }

  formatDisplayDate(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  private refreshPreview(): void {
    if (!this.isOpen || !this.contractId || !this.installment?.id || !this.dueDate) {
      this.preview = null;
      return;
    }

    this.isLoadingPreview = true;
    this.previewError = '';
    const seq = ++this.previewSeq;
    this.cdr.detectChanges();

    this.amortizationService
      .previewInstallmentDueDate(
        this.contractId,
        Number(this.installment.id),
        this.dueDate,
        this.mode,
        this.effectiveCadence(),
      )
      .subscribe({
        next: (response) => {
          if (seq !== this.previewSeq) {
            return;
          }
          this.preview = (response?.data ?? response) as DueDatePreviewPlan;
          this.isLoadingPreview = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (seq !== this.previewSeq) {
            return;
          }
          this.preview = null;
          this.isLoadingPreview = false;
          const errors = err?.error?.errors ?? {};
          this.previewError = errors.due_date?.[0] || errors.installment?.[0] || err?.error?.message || 'No se pudo previsualizar.';
          this.cdr.detectChanges();
        },
      });
  }

  private effectiveCadence(): DueDateCadence {
    return this.mode === 'cascade' ? this.cadence : 'same_day';
  }

  private neighbor(direction: -1 | 1): string | null {
    const current = this.installmentNumber;
    const ordered = [...(this.installments ?? [])]
      .map((row) => ({
        number: Number(row.installment_number),
        due: this.normalizeDateInput(row.due_date ?? null),
      }))
      .filter((row) => Number.isFinite(row.number) && row.due)
      .sort((left, right) => left.number - right.number);

    if (direction < 0) {
      const previous = [...ordered].reverse().find((row) => row.number < current);
      return previous?.due ?? null;
    }

    const next = ordered.find((row) => row.number > current);
    return next?.due ?? null;
  }

  private addDays(value: string | null, days: number): string | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private normalizeDateInput(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return String(value).slice(0, 10);
  }
}
