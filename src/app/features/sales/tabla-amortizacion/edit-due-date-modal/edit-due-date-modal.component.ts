import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmortizationInstallment } from '../../../../core/models/amortization-installment.model';

@Component({
  selector: 'app-edit-due-date-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-due-date-modal.component.html',
  styleUrl: './edit-due-date-modal.component.scss',
})
export class EditDueDateModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() installment: AmortizationInstallment | null = null;
  @Input() isSaving = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveDueDate = new EventEmitter<string>();

  dueDate = '';

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['installment'] || changes['isOpen']) && this.isOpen) {
      this.dueDate = this.normalizeDateInput(this.installment?.due_date ?? null);
    }
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.closeModal.emit();
  }

  save(): void {
    if (this.isSaving || !this.dueDate) {
      return;
    }

    this.saveDueDate.emit(this.dueDate);
  }

  private normalizeDateInput(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
  }
}
