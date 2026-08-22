import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-drawer-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './drawer-pago.component.html',
  styleUrl: './drawer-pago.component.scss'
})
export class DrawerPagoComponent implements OnInit {
  
  @Output() closeDrawer = new EventEmitter<void>();
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

  paymentForm: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.min(1)]],
    payment_method: ['transfer', Validators.required],
    bank_account_id: ['', Validators.required], // Inicia requerido porque por defecto es 'transfer'
    transaction_date: [new Date().toISOString().substring(0, 10), Validators.required],
    surplus_action: ['']
  });

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
    this.totalSelectedAmount = this._selectedFees.reduce((sum, fee) => sum + this.getFeeDebtValue(fee), 0);
  }

  updateFormAmount() {
    this.calculateDebt();
    setTimeout(() => {
      this.paymentForm.patchValue({
        amount: this.totalSelectedAmount,
        payment_method: 'transfer',
        bank_account_id: '',
        surplus_action: ''
      });
    });
  }

  private resetState() {
    this.selectedFile = null;
    this.paymentForm.reset({
      amount: this.totalSelectedAmount,
      payment_method: 'transfer',
      bank_account_id: '',
      transaction_date: new Date().toISOString().substring(0, 10),
      surplus_action: ''
    });
    this.paymentForm.markAsPristine();
    this.paymentForm.markAsUntouched();
  }

  close() {
    this._isProcessing = false;
    this.resetState();
    this.closeDrawer.emit();
  }

  submit() {
    if (this.paymentForm.valid && this.selectedFile) {
      const paymentData = {
        ...this.paymentForm.value,
        receipt: this.selectedFile
      };

      this.confirmPayment.emit(paymentData);
    } else {
      this.paymentForm.markAllAsTouched();
      if (!this.selectedFile) {
        alert('Por favor, adjunte el soporte de pago (Recibo).');
      }
    }
  }
}