import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmortizationInstallment } from '../../../../core/models/amortization-installment.model';

@Component({
  selector: 'app-edit-payment-date-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-payment-date-modal.component.html',
  styleUrl: '../edit-due-date-modal/edit-due-date-modal.component.scss',
})
export class EditPaymentDateModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() installment: AmortizationInstallment | null = null;
  @Input() hasLinkedTransactions = false;
  @Input() isSaving = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() savePaymentDate = new EventEmitter<string>();

  paymentDate = '';
  confirmed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['installment'] || changes['isOpen']) && this.isOpen) {
      this.confirmed = false;
      this.paymentDate = this.normalizeDateInput(this.installment?.payment_date ?? null);
    }
  }

  get showTraceabilityWarning(): boolean {
    return this.hasLinkedTransactions || !!this.installment?.receipt_number;
  }

  get installmentNumberLabel(): string {
    const number = Number(this.installment?.installment_number);
    return number === 0 ? 'Inicial' : `#${number}`;
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.closeModal.emit();
  }

  save(): void {
    if (this.isSaving || !this.paymentDate || !this.confirmed) {
      return;
    }

    this.savePaymentDate.emit(this.paymentDate);
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
