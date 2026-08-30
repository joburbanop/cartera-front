import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import {
  AmortizationStatus,
  AmortizationStatusBadgeClass,
  isPaidStatus,
  isVencida,
  toAmortizationStatus,
} from '../../../core/models/amortization-status';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { AmortizationStatusLabelPipe } from '../../pipes/amortization-status-label.pipe';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-amortization-table-presenter',
  standalone: true,
  imports: [CommonModule, AmortizationStatusLabelPipe, PaginationComponent],
  templateUrl: './amortization-table-presenter.component.html',
  styleUrl: './amortization-table-presenter.component.scss',
})
export class AmortizationTablePresenterComponent {
  private financials = inject(AmortizationFinancialsService);

  @Input() installments: any[] = [];
  @Input() selectable = false;
  @Input() currentView: 'venta' | 'preventa' = 'venta';
  @Input() resetSelection = false;

  @Output() selectionChanged = new EventEmitter<any[]>();
  @Output() downloadPdf = new EventEmitter<'internal' | 'client'>();
  @Output() paySelected = new EventEmitter<void>();

  selectedInstallments: any[] = [];
  pageSize = 10;
  currentPage = 1;

  get pagedInstallments(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.installments.slice(start, start + this.pageSize);
  }

  feeStatus(fee: any): AmortizationStatus {
    return toAmortizationStatus(fee?.status);
  }

  displayStatus(fee: any): AmortizationStatus {
    const status = this.feeStatus(fee);
    if (status === 'paid') {
      return 'paid';
    }

    if (status === 'overdue' || isVencida(fee?.due_date)) {
      return 'overdue';
    }

    return status;
  }

  statusBadgeClass(fee: any): string {
    return AmortizationStatusBadgeClass[this.displayStatus(fee)];
  }

  get allInstallmentsPaid(): boolean {
    return this.installments.length > 0 && this.installments.every((fee: any) => isPaidStatus(fee?.status));
  }

  /**
   * Una cuota está bloqueada (checkbox deshabilitado) si:
   * - ya fue pagada, O
   * - su fecha de vencimiento ya expiró (periodo contable cerrado).
   * Las cuotas FUTURAS nunca se bloquean para permitir pagos adelantados.
   */
  isBloqueada(fee: any): boolean {
    return isPaidStatus(fee?.status) || isVencida(fee?.due_date);
  }

  isFeeSelectable(fee: any): boolean {
    return this.selectable && !this.isBloqueada(fee);
  }

  isSelected(fee: any): boolean {
    return this.selectedInstallments.some((item) => item.installment_number === fee.installment_number);
  }

  toggleFeeSelection(fee: any, event: Event): void {
    if (this.isBloqueada(fee)) {
      const statusTarget = event.target as HTMLInputElement;
      if (statusTarget) {
        statusTarget.checked = false;
      }
      return;
    }

    const target = event.target as HTMLInputElement;
    const checked = !!target?.checked;

    if (!this.isFeeSelectable(fee)) {
      target.checked = false;
      this.selectedInstallments = this.selectedInstallments.filter((item) => item.installment_number !== fee.installment_number);
      this.selectionChanged.emit([...this.selectedInstallments]);
      return;
    }

    if (checked) {
      if (!this.selectedInstallments.some((item) => item.installment_number === fee.installment_number)) {
        this.selectedInstallments = [...this.selectedInstallments, fee];
      }
    } else {
      this.selectedInstallments = this.selectedInstallments.filter((item) => item.installment_number !== fee.installment_number);
    }

    this.selectionChanged.emit([...this.selectedInstallments]);
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = !!target?.checked;

    if (checked) {
      this.selectedInstallments = this.installments.filter((fee: any) => this.isFeeSelectable(fee));
    } else {
      this.selectedInstallments = [];
    }

    this.selectionChanged.emit([...this.selectedInstallments]);
  }

  get totalSelectedAmount(): number {
    return this.selectedInstallments.reduce(
      (sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee),
      0,
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['installments']) {
      this.currentPage = 1;
      const validInstallmentNumbers = new Set((this.installments ?? []).map((fee: any) => fee.installment_number));
      const nextSelection = this.selectedInstallments.filter((item: any) => {
        const stillExists = validInstallmentNumbers.has(item.installment_number);
        return stillExists && !isPaidStatus(item?.status ?? item?.estado);
      });

      if (nextSelection.length !== this.selectedInstallments.length) {
        this.selectedInstallments = nextSelection;
        this.selectionChanged.emit([...this.selectedInstallments]);
      }
    }

    if (changes['resetSelection'] && this.resetSelection) {
      this.selectedInstallments = [];
      this.selectionChanged.emit([]);
    }
  }

  emitDownload(type: 'internal' | 'client'): void {
    this.downloadPdf.emit(type);
  }

  emitPaySelected(): void {
    if (this.selectedInstallments.length === 0) {
      return;
    }

    this.paySelected.emit();
  }
}
