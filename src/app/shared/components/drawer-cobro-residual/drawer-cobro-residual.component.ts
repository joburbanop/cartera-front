import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { FieldErrorComponent } from '../field-error/field-error.component';
import { ToastService } from '../../services/toast.service';
import { markAllAsTouched, scrollToFirstInvalid } from '../../utils/form-utils';

export interface ResidualCollectionPayload {
  amount: number;
  payment_method: string;
  bank_account_id?: string;
  transaction_date: string;
  payment_date: string;
  receipt: File;
  receipt_number?: string;
}

@Component({
  selector: 'app-drawer-cobro-residual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskDirective, FieldErrorComponent],
  templateUrl: './drawer-cobro-residual.component.html',
  styleUrl: './drawer-cobro-residual.component.scss',
})
export class DrawerCobroResidualComponent {
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() confirmCollection = new EventEmitter<ResidualCollectionPayload>();

  private _isOpen = false;
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.resetAndPrefill();
    }
  }
  get isOpen(): boolean {
    return this._isOpen;
  }

  private _isProcessing = false;
  @Input() set isProcessing(value: boolean) {
    this._isProcessing = value;
  }
  get isProcessing(): boolean {
    return this._isProcessing;
  }

  @Input() pendingAmount = 0;
  @Input() bankAccounts: Array<{ id: number | string; bank_name?: string; account_number?: string }> = [];

  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  selectedFile: File | null = null;
  receiptMissing = false;
  amountExceedsPending = false;

  paymentForm: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    payment_method: ['transfer', Validators.required],
    bank_account_id: ['', Validators.required],
    transaction_date: [this.todayIsoDate(), Validators.required],
    receipt_number: [''],
  });

  constructor() {
    this.paymentForm.get('payment_method')?.valueChanges.subscribe((method) => {
      const bank = this.paymentForm.get('bank_account_id');
      if (method === 'transfer') {
        bank?.setValidators([Validators.required]);
      } else {
        bank?.clearValidators();
        bank?.setValue('');
      }
      bank?.updateValueAndValidity({ emitEvent: false });
    });
  }

  get currentAmount(): number {
    return Number(this.paymentForm.get('amount')?.value) || 0;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen || this.isProcessing) {
      return;
    }
    this.close();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.receiptMissing = false;
  }

  close(): void {
    if (this.isProcessing) {
      return;
    }
    this.resetState();
    this.closeDrawer.emit();
  }

  submit(): void {
    if (this.isProcessing) {
      return;
    }

    this.receiptMissing = !this.selectedFile;
    this.amountExceedsPending = this.currentAmount > this.pendingAmount + 0.001;

    if (this.paymentForm.invalid || this.receiptMissing || this.amountExceedsPending) {
      markAllAsTouched(this.paymentForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show(
        'Formulario incompleto',
        'error',
        this.amountExceedsPending
          ? 'El monto no puede superar el residual pendiente.'
          : 'Revisa los campos marcados en rojo',
      );
      return;
    }

    const date = this.normalizeSelectedDate(this.paymentForm.get('transaction_date')?.value);
    this.confirmCollection.emit({
      amount: this.currentAmount,
      payment_method: this.paymentForm.get('payment_method')?.value,
      bank_account_id: this.paymentForm.get('bank_account_id')?.value || undefined,
      transaction_date: date,
      payment_date: date,
      receipt: this.selectedFile as File,
      receipt_number: String(this.paymentForm.get('receipt_number')?.value ?? '').trim() || undefined,
    });
  }

  private resetAndPrefill(): void {
    this.resetState();
    this.paymentForm.patchValue({
      amount: this.pendingAmount > 0 ? this.pendingAmount : '',
      payment_method: 'transfer',
      bank_account_id: '',
      transaction_date: this.todayIsoDate(),
      receipt_number: '',
    });
  }

  private resetState(): void {
    this.selectedFile = null;
    this.receiptMissing = false;
    this.amountExceedsPending = false;
    this.paymentForm.reset({
      amount: '',
      payment_method: 'transfer',
      bank_account_id: '',
      transaction_date: this.todayIsoDate(),
      receipt_number: '',
    });
  }

  private todayIsoDate(): string {
    return new Date().toISOString().substring(0, 10);
  }

  private normalizeSelectedDate(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().substring(0, 10);
    }
    return this.todayIsoDate();
  }
}
