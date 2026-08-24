import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-amortization-table-presenter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './amortization-table-presenter.component.html',
  styleUrl: './amortization-table-presenter.component.scss',
})
export class AmortizationTablePresenterComponent {
  @Input() installments: any[] = [];
  @Input() selectable = false;
  @Input() currentView: 'venta' | 'preventa' = 'venta';
  @Input() resetSelection = false;

  @Output() selectionChanged = new EventEmitter<any[]>();
  @Output() downloadPdf = new EventEmitter<'internal' | 'client'>();
  @Output() paySelected = new EventEmitter<void>();

  selectedInstallments: any[] = [];

  get allInstallmentsPaid(): boolean {
    return this.installments.length > 0 && this.installments.every((fee: any) => {
      const status = String(fee?.status ?? '').toLowerCase();
      return status === 'pagada' || status === 'paid';
    });
  }

  isFeeSelectable(fee: any): boolean {
    const status = String(fee?.status ?? '').toLowerCase();
    return this.selectable && status !== 'pagada' && status !== 'paid';
  }

  isSelected(fee: any): boolean {
    return this.selectedInstallments.some((item) => item.installment_number === fee.installment_number);
  }

  toggleFeeSelection(fee: any, event: Event): void {
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
    return this.selectedInstallments.reduce((sum: number, fee: any) => sum + Number(fee.installment_value || 0), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
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
