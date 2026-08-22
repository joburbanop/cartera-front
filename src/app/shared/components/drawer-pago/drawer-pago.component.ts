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
  @Input() isProcessing = false;
  
  // NUEVO: Lista de cuentas bancarias del proyecto
  @Input() bankAccounts: any[] = []; 

  private fb = inject(FormBuilder);
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

  // ==========================================
  // SETTER PARA isOpen
  // ==========================================
  private _isOpen = false;
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.updateFormAmount();
    }
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

  calculateDebt() {
    this.totalSelectedAmount = this._selectedFees.reduce((sum, fee) => sum + Number(fee.installment_value || 0), 0);
  }

  updateFormAmount() {
    this.calculateDebt();
    setTimeout(() => {
      // Al abrir, restauramos a 'transfer' por defecto
      this.paymentForm.patchValue({
        amount: this.totalSelectedAmount,
        payment_method: 'transfer',
        bank_account_id: '',
        surplus_action: ''
      });
    });
  }

  close() {
    this.closeDrawer.emit();
  }

  submit() {
    // Si el formulario es válido (es decir, llenó la cuenta si era transferencia)
    if (this.paymentForm.valid) {
      this.confirmPayment.emit(this.paymentForm.value);
    } else {
      // Si intentan trampear, marcamos todos los campos como "tocados" para mostrar errores
      this.paymentForm.markAllAsTouched();
    }
  }
}