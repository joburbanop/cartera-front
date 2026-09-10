import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import {
  AmortizationStatus,
  AmortizationStatusBadgeClass,
  isPaidStatus,
  isVencida,
  toAmortizationStatus,
} from '../../../core/models/amortization-status';
import { AmortizationInstallment } from '../../../core/models/amortization-installment.model';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { AmortizationStatusLabelPipe } from '../../pipes/amortization-status-label.pipe';
import { PaginationComponent } from '../pagination/pagination.component';
import { PaymentSource, PaymentSourceAlsoApplied } from '../../../core/models/payment-source.model';

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
  @Output() editDueDate = new EventEmitter<AmortizationInstallment>();
  @Output() editPaymentDate = new EventEmitter<AmortizationInstallment>();

  selectedInstallments: any[] = [];
  pageSize = 10;
  currentPage = 1;
  private expandedInstallmentIds = new Set<number>();

  get pagedInstallments(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.installments.slice(start, start + this.pageSize);
  }

  displayedInterest(fee: AmortizationInstallment): number {
    return this.financials.displayedInterest(fee);
  }

  displayedAmortization(fee: AmortizationInstallment): number {
    return this.financials.displayedAmortization(fee);
  }

  feeStatus(fee: any): AmortizationStatus {
    return toAmortizationStatus(fee?.status);
  }

  displayStatus(fee: any): AmortizationStatus {
    const status = this.feeStatus(fee);
    if (status === 'paid') {
      return 'paid';
    }

    if (status === 'partial' || this.hasIncompletePayment(fee)) {
      return 'partial';
    }

    if (status === 'overdue' || isVencida(fee?.due_date)) {
      return 'overdue';
    }

    return status;
  }

  private hasIncompletePayment(fee: any): boolean {
    const debt = this.financials.getFeeDebtValue(fee);
    const alreadyPaid = Number(fee?.interest_paid ?? 0) + Number(fee?.principal_paid ?? 0);

    return debt > 0 && alreadyPaid > 0;
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
   * - su fecha de vencimiento es anterior a hoy (periodo contable cerrado).
   * El día de vencimiento y las cuotas futuras no se bloquean.
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

  canEditDueDate(fee: any): boolean {
    return this.selectable && Number(fee?.installment_number) > 0;
  }

  canEditPaymentDate(fee: any): boolean {
    return this.selectable;
  }

  emitEditDueDate(fee: AmortizationInstallment, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canEditDueDate(fee)) {
      return;
    }

    this.editDueDate.emit(fee);
  }

  emitEditPaymentDate(fee: AmortizationInstallment, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canEditPaymentDate(fee)) {
      return;
    }

    this.editPaymentDate.emit(fee);
  }

  hasSources(fee: AmortizationInstallment): boolean {
    return (fee.sources?.length ?? 0) > 0;
  }

  isDetailsExpanded(fee: AmortizationInstallment): boolean {
    const id = this.sourceKey(fee);
    return id != null && this.expandedInstallmentIds.has(id);
  }

  toggleDetails(fee: AmortizationInstallment, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = this.sourceKey(fee);
    if (id == null) {
      return;
    }

    if (this.expandedInstallmentIds.has(id)) {
      this.expandedInstallmentIds.delete(id);
    } else {
      this.expandedInstallmentIds.add(id);
    }
  }

  coveredAmount(fee: AmortizationInstallment): number {
    if (fee.covered_amount != null && fee.covered_amount !== '') {
      return Number(fee.covered_amount);
    }

    return (fee.sources ?? []).reduce((sum, source) => sum + Number(source.amount || 0), 0);
  }

  remainingAmount(fee: AmortizationInstallment): number {
    return this.financials.getFeeDebtValue(fee);
  }

  alsoAppliedLabel(source: PaymentSource): string {
    if ((source.came_from?.length ?? 0) > 0) {
      return '';
    }

    const others = source.also_applied_to ?? [];
    if (others.length === 0) {
      return '';
    }

    return others
      .map((item) => `${this.peerQuotaLabel(item)} ($ ${this.peerAmount(item)})`)
      .join(', ');
  }

  cameFromLabel(source: PaymentSource): string {
    const origin = source.came_from ?? [];
    if (origin.length === 0) {
      return '';
    }

    return origin
      .map((item) => `${this.peerQuotaLabel(item)} (sobrante $ ${this.peerAmount(item)})`)
      .join(', ');
  }

  private peerQuotaLabel(item: PaymentSourceAlsoApplied): string {
    if (item.installment_number === 0) {
      return 'cuota inicial';
    }

    if (item.installment_number != null) {
      return `cuota #${item.installment_number}`;
    }

    return item.target_label;
  }

  private peerAmount(item: { amount: number | string }): string {
    return Number(item.amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  private sourceKey(fee: AmortizationInstallment): number | null {
    if (fee.id != null) {
      return Number(fee.id);
    }

    return fee.installment_number != null ? Number(fee.installment_number) : null;
  }
}
