import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-drawer-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './drawer-pago.component.html',
  styleUrl: './drawer-pago.component.scss'
})
export class DrawerPagoComponent {
  
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() confirmPayment = new EventEmitter<any>();
  @Input() isProcessing = false;

  private fb = inject(FormBuilder);
  totalSelectedAmount = 0;

  paymentForm: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.min(1)]],
    payment_method: ['transfer', Validators.required],
    transaction_date: [new Date().toISOString().substring(0, 10), Validators.required],
    surplus_action: ['']
  });

  // ==========================================
  // 1. SETTER PARA isOpen
  // Se ejecuta exactamente cuando se abre o cierra el modal
  // ==========================================
  private _isOpen = false;
  @Input() set isOpen(value: boolean) {
    this._isOpen = value;
    if (value) {
      this.updateFormAmount(); // Cuando se abre, cargamos los datos de inmediato
    }
  }
  get isOpen(): boolean { return this._isOpen; }

  // ==========================================
  // 2. SETTER PARA selectedFees
  // Detecta cada vez que seleccionas/deseleccionas una cuota en la tabla
  // ==========================================
  private _selectedFees: any[] = [];
  @Input() set selectedFees(value: any[]) {
    this._selectedFees = value;
    this.calculateDebt(); 
  }
  get selectedFees(): any[] { return this._selectedFees; }


  // Getter en tiempo real del input de dinero
  get currentPaymentAmount(): number {
    return Number(this.paymentForm.get('amount')?.value) || 0;
  }

calculateDebt() {
    
    this.totalSelectedAmount = this._selectedFees.reduce((sum, fee) => sum + Number(fee.installment_value), 0);
  }
updateFormAmount() {
    this.calculateDebt();
    setTimeout(() => {
      this.paymentForm.patchValue({
        amount: this.totalSelectedAmount,
        surplus_action: ''
      });
    });
  }

  close() {
    this.closeDrawer.emit();
  }

  submit() {
    if (this.paymentForm.valid) {
      this.confirmPayment.emit(this.paymentForm.value);
    }
  }
}