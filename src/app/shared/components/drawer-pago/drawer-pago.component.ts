import { Component, Input, Output, EventEmitter, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';

@Component({
  selector: 'app-drawer-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskDirective],
  templateUrl: './drawer-pago.component.html',
  styleUrl: './drawer-pago.component.scss'
})
export class DrawerPagoComponent implements OnInit {
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
  @Output() confirmPayment = new EventEmitter<any>();

  private _isProcessing = false;
  @Input() set isProcessing(value: boolean) {
    this._isProcessing = value;

    if (!value) {
      this.resetState();
    }
  }
  get isProcessing(): boolean { return this._isProcessing; }
  
  // NUEVO: Lista de cuentas bancarias del proyecto
  @Input() bankAccounts: any[] = []; 

  private fb = inject(FormBuilder);
  selectedFile: File | null = null;
  totalSelectedAmount = 0;
  montoSugeridoTotal = 0;

  paymentForm: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.min(1)]],
    payment_method: ['transfer', Validators.required],
    bank_account_id: ['', Validators.required], // Inicia requerido porque por defecto es 'transfer'
    transaction_date: [this.todayIsoDate(), Validators.required],
    surplus_action: ['']
  });

  private todayIsoDate(): string {
    return new Date().toISOString().substring(0, 10);
  }

  private normalizeSelectedDate(value: unknown): string {
    if (!value) {
      return this.todayIsoDate();
    }

    if (value instanceof Date) {
      return value.toISOString().substring(0, 10);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) {
        return this.todayIsoDate();
      }

      if (trimmed.includes('/')) {
        const [day, month, year] = trimmed.split('/');
        if (day && month && year) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      return trimmed.substring(0, 10);
    }

    return String(value).substring(0, 10);
  }

  get excessAmount(): number {
    return Math.max(0, (Number(this.paymentForm.get('amount')?.value) || 0) - this.montoSugeridoTotal);
  }

  get excedenteCalculado(): number {
    const montoIngresado = Number(this.paymentForm.get('amount')?.value) || 0;
    const diferencia = montoIngresado - this.montoSugeridoTotal;
    return diferencia > 0 ? diferencia : 0;
  }

  get hasSurplus(): boolean {
    return this.excessAmount > 0;
  }

  private syncSurplusValidation(): void {
    const surplusControl = this.paymentForm.get('surplus_action');

    if (this.hasSurplus) {
      surplusControl?.setValidators([Validators.required]);
    } else {
      surplusControl?.clearValidators();
      surplusControl?.setValue('');
    }

    surplusControl?.updateValueAndValidity();
  }

  ngOnInit() {
    // MAGIA DE ANGULAR: Escuchar cuando cambie el método de pago
    this.paymentForm.get('payment_method')?.valueChanges.subscribe(method => {
      const accountControl = this.paymentForm.get('bank_account_id');
      
      if (method === 'transfer') {
        accountControl?.setValidators([Validators.required]);
      } else {
        accountControl?.clearValidators(); // Si es efectivo/permuta, quitamos la obligación
        accountControl?.setValue('');      // Limpiamos el valor por si había algo
      }
      accountControl?.updateValueAndValidity(); // Aplicamos el cambio
    });

    this.paymentForm.get('amount')?.valueChanges.subscribe(() => {
      this.syncSurplusValidation();
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // ==========================================
  // SETTER PARA isOpen
  // ==========================================
  private _isOpen = false;
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.updateFormAmount();
      return;
    }

    this.resetState();
  }
  get isOpen(): boolean { return this._isOpen; }

  // ==========================================
  // SETTER PARA selectedFees
  // ==========================================
  private _selectedFees: any[] = [];
  @Input() set selectedFees(value: any[]) {
    this._selectedFees = value;
    this.calculateDebt(); 
  }
  get selectedFees(): any[] { return this._selectedFees; }

  get currentPaymentAmount(): number {
    return Number(this.paymentForm.get('amount')?.value) || 0;
  }

  getFeeDebtValue(fee: any): number {
    const status = String(fee?.status ?? '').toLowerCase();

    if (status === 'pagada' || status === 'paid') {
      return 0;
    }

    const quotaDebt = Number(fee?.quota_debt ?? 0);
    const installmentValue = Number(fee.installment_value ?? 0);
    const overdueBalance = Number(fee.overdue_balance ?? 0);
    const remainingBalance = Number(fee.remaining_balance ?? 0);

    if (quotaDebt > 0) {
      return Math.max(0, quotaDebt);
    }

    if (overdueBalance > 0) {
      return Math.max(0, Math.min(overdueBalance, installmentValue || overdueBalance));
    }

    if (remainingBalance > 0 && remainingBalance < installmentValue) {
      return Math.max(0, remainingBalance);
    }

    return Math.max(0, installmentValue);
  }

  calculateDebt() {
    const deudaBruta = this._selectedFees.reduce((sum, fee) => sum + this.getFeeDebtValue(fee), 0);
    this.totalSelectedAmount = Math.round(deudaBruta);
    this.montoSugeridoTotal = this.totalSelectedAmount;
  }

  updateFormAmount() {
    this.calculateDebt();
    setTimeout(() => {
      this.paymentForm.patchValue({
        amount: this.montoSugeridoTotal,
        payment_method: 'transfer',
        bank_account_id: '',
        surplus_action: ''
      });
    });
  }

  private resetState() {
    this.selectedFile = null;
    this.paymentForm.reset({
      amount: this.montoSugeridoTotal,
      payment_method: 'transfer',
      bank_account_id: '',
      transaction_date: this.todayIsoDate(),
      surplus_action: ''
    });
    this.paymentForm.markAsPristine();
    this.paymentForm.markAsUntouched();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event): void {
    if (!this.isOpen) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.close();
  }

  close() {
    this._isProcessing = false;
    this.resetState();
    this.closeDrawer.emit();
    this.onClose.emit();
  }

  submit() {
    if (this.isProcessing || this._isProcessing) {
      return;
    }

    if (this.hasSurplus && !this.paymentForm.get('surplus_action')?.value) {
      this.paymentForm.get('surplus_action')?.markAsTouched();
      return;
    }

    if (this.paymentForm.valid && this.selectedFile) {
      this._isProcessing = true;

      const selectedDate = this.paymentForm.get('transaction_date')?.value;
      const normalizedDate = this.normalizeSelectedDate(selectedDate);

      const paymentData = {
        ...this.paymentForm.value,
        transaction_date: normalizedDate,
        payment_date: normalizedDate,
        receipt: this.selectedFile,
        payment_option: this.paymentForm.get('surplus_action')?.value || ''
      };

      this.confirmPayment.emit(paymentData);
      return;
    }

    this.paymentForm.markAllAsTouched();
  }
}