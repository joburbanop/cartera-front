import { Component, Input, Output, EventEmitter, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CurrencyMaskDirective } from '../../directives/currency-mask.directive';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { FinancialRules } from '../../../core/constants/financial-rules';
import { ToastService } from '../../services/toast.service';
import { FieldErrorComponent } from '../field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../utils/form-utils';
import { autoSplitDownPayment } from '../../../core/utils/split-down-payment';

export interface DrawerTargetInstallment {
  isInitial: boolean;
  installmentNumber: number;
  dueDateLabel: string;
  statusLabel: string;
  amount: number;
}

@Component({
  selector: 'app-drawer-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskDirective, FieldErrorComponent],
  templateUrl: './drawer-pago.component.html',
  styleUrl: './drawer-pago.component.scss'
})
export class DrawerPagoComponent implements OnInit {
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
  @Output() confirmPayment = new EventEmitter<any>();
  @Output() paymentDateChange = new EventEmitter<string>();

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
  @Input() confirmPending = false; 

  private fb = inject(FormBuilder);
  private financials = inject(AmortizationFinancialsService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);
  selectedFile: File | null = null;
  receiptMissing = false;
  totalSelectedAmount = 0;
  montoSugeridoTotal = 0;

  paymentForm: FormGroup = this.fb.group({
    amount: ['', [Validators.required, Validators.min(1)]],
    payment_method: ['transfer', Validators.required],
    bank_account_id: ['', Validators.required], // Inicia requerido porque por defecto es 'transfer'
    transaction_date: [this.todayIsoDate(), Validators.required],
    receipt_number: ['', [Validators.required, Validators.maxLength(80)]],
    surplus_action: [''],
    to_down_payment: ['']
  });

  private todayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  /**
   * Excedente contra la deuda objetivo (lista precargada). El split sigue
   * midiendo el resto regular; no se toca ese carril.
   */
  private get surplusReference(): number {
    if (this.splitEnabled && this.regularDueAmount > 0) {
      return this.regularDueAmount;
    }

    return this.montoSugeridoTotal;
  }

  get excessAmount(): number {
    // Con reparto, lo que puede sobrar es la parte destinada a cuotas: lo que
    // va a la inicial nunca es excedente.
    const available = this.splitEnabled
      ? this.splitToInstallments
      : (Number(this.paymentForm.get('amount')?.value) || 0);

    return Math.max(0, available - this.surplusReference);
  }

  get excedenteCalculado(): number {
    return this.excessAmount;
  }

  pendingDefaultCapitalConfirm = false;
  readonly defaultSurplusAction = 'abono_capital';

  get hasSurplus(): boolean {
    return this.excessAmount > FinancialRules.absorbedSurplus;
  }

  /**
   * Al día: inicial saldada y ninguna regular vencida.
   */
  get isContractCurrent(): boolean {
    return this.pendingInitialAmount <= 0 && Number(this.overdueTotalAmount ?? 0) <= 0;
  }

  get chosenSurplusAction(): string {
    return String(this.paymentForm.get('surplus_action')?.value || '').trim();
  }

  private syncSurplusValidation(): void {
    const surplusControl = this.paymentForm.get('surplus_action');

    if (!this.hasSurplus) {
      surplusControl?.setValue('');
      this.pendingDefaultCapitalConfirm = false;
    }

    surplusControl?.clearValidators();
    surplusControl?.updateValueAndValidity({ emitEvent: false });
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
      this.pendingDefaultCapitalConfirm = false;
      this.syncSurplusValidation();
    });

    this.paymentForm.get('to_down_payment')?.valueChanges.subscribe(() => {
      this.pendingDefaultCapitalConfirm = false;
      this.syncSurplusValidation();
    });

    this.paymentForm.get('surplus_action')?.valueChanges.subscribe(() => {
      this.pendingDefaultCapitalConfirm = false;
    });

    this.paymentForm.get('transaction_date')?.valueChanges.subscribe((value) => {
      this.emitPaymentDate(value);
    });
  }

  private emitPaymentDate(value: unknown = this.paymentForm.get('transaction_date')?.value): void {
    if (!this.isOpen) {
      return;
    }

    this.paymentDateChange.emit(this.normalizeSelectedDate(value));
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.receiptMissing = false;
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
    this.syncSuggestedAmountToForm();
  }
  get selectedFees(): any[] { return this._selectedFees; }

  private _prefilledAmount: number | null = null;
  @Input() set prefilledAmount(value: number | null) {
    this._prefilledAmount = this.normalizePrefilledAmount(value);
    this.calculateDebt();
    this.syncSuggestedAmountToForm();
  }
  get prefilledAmount(): number | null { return this._prefilledAmount; }

  @Input() targetInstallments: DrawerTargetInstallment[] = [];
  @Input() scheduleNextAmount: number | null = null;
  @Input() scheduleOpenTotal: number | null = null;
  @Input() lifeSheetBalance: number | null = null;
  @Input() outstandingCapital: number | null = null;
  @Input() overdueTotalAmount: number | null = null;
  @Input() overdueTotalIsPreventa = false;

  get targetListTotal(): number {
    return (this.targetInstallments ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  /** Mora que no está toda en la lista (p. ej. desfase de fecha). */
  get showOverdueOutsideList(): boolean {
    const overdue = Number(this.overdueTotalAmount ?? 0);
    if (overdue <= FinancialRules.absorbedSurplus) {
      return false;
    }

    return overdue > this.targetListTotal + FinancialRules.absorbedSurplus;
  }

  /**
   * Saldo pendiente de la cuota inicial. Cuando hay saldo, el pago se puede
   * repartir entre la inicial y la cuota del mes: es lo que pasa cuando el
   * cliente manda una sola consignación para cubrir las dos cosas.
   */
  private _pendingInitialAmount = 0;
  @Input() set pendingInitialAmount(value: number | null) {
    this._pendingInitialAmount = Math.max(0, Math.round(Number(value) || 0));

    if (!this.canSplit) {
      this.splitEnabled = false;
      this.syncSplitValidation();
    }
  }
  get pendingInitialAmount(): number { return this._pendingInitialAmount; }

  /**
   * Deuda de cuotas regulares a la fecha. Solo se usa como referencia del
   * excedente cuando el pago se reparte.
   */
  private _regularDueAmount = 0;
  @Input() set regularDueAmount(value: number) {
    this._regularDueAmount = Math.max(0, Math.round(Number(value) || 0));

    if (this.isOpen) {
      this.syncSurplusValidation();
    }
  }
  get regularDueAmount(): number { return this._regularDueAmount; }

  private _planRemainingAmount = 0;
  @Input() set planRemainingAmount(value: number | null) {
    this._planRemainingAmount = Math.max(0, Math.round(Number(value) || 0));

    if (this.isOpen) {
      this.syncSurplusValidation();
    }
  }
  get planRemainingAmount(): number { return this._planRemainingAmount; }

  /**
   * El reparto aplica si la inicial debe algo y este cobro no es solo la #0.
   * #0 + regulares sí se puede (y se debe) partir: un solo movimiento bancario.
   */
  get canSplit(): boolean {
    if (this._pendingInitialAmount <= 0) {
      return false;
    }

    return !this.isInicialOnlySelection();
  }

  private isInicialOnlySelection(): boolean {
    const fees = this._selectedFees ?? [];
    if (fees.length === 0) {
      return false;
    }

    return fees.every((fee: any) => Number(fee?.installment_number) === 0);
  }

  private hasMixedInicialAndRegularSelection(): boolean {
    const fees = this._selectedFees ?? [];
    const hasInicial = fees.some((fee: any) => Number(fee?.installment_number) === 0);
    const hasRegular = fees.some((fee: any) => Number(fee?.installment_number) > 0);

    return hasInicial && hasRegular;
  }

  /**
   * Si el cobrador no tocó “Dividir este pago” pero tildó #0 y regulares,
   * el sistema parte solo: faltante de inicial primero, resto a cuotas.
   */
  private resolveSplitPayload(): { to_down_payment: number; to_installments: number } | null {
    if (this.splitEnabled) {
      return {
        to_down_payment: this.splitToDownPayment,
        to_installments: this.splitToInstallments,
      };
    }

    if (!this.hasMixedInicialAndRegularSelection() || this._pendingInitialAmount <= 0) {
      return null;
    }

    return autoSplitDownPayment(this.currentPaymentAmount, this._pendingInitialAmount);
  }

  splitEnabled = false;

  toggleSplit(): void {
    if (!this.canSplit) {
      return;
    }

    this.splitEnabled = !this.splitEnabled;

    if (this.splitEnabled) {
      // Arranca con el faltante exacto de la inicial, que es el reparto que el
      // cobrador quiere el 90% de las veces.
      const suggested = Math.min(this._pendingInitialAmount, this.currentPaymentAmount);
      this.paymentForm.patchValue({ to_down_payment: suggested });
    } else {
      this.paymentForm.patchValue({ to_down_payment: '' });
    }

    this.syncSplitValidation();
  }

  /** Lo que queda para las cuotas regulares después de apartar la inicial. */
  get splitToInstallments(): number {
    return Math.max(0, this.currentPaymentAmount - this.splitToDownPayment);
  }

  get splitToDownPayment(): number {
    return Math.max(0, Number(this.paymentForm.get('to_down_payment')?.value) || 0);
  }

  get splitExceedsPayment(): boolean {
    return this.splitEnabled && this.splitToDownPayment > this.currentPaymentAmount;
  }

  get splitExceedsPendingInitial(): boolean {
    return this.splitEnabled && this.splitToDownPayment > this._pendingInitialAmount;
  }

  get splitLeavesNothingForInstallments(): boolean {
    return this.splitEnabled
      && this.currentPaymentAmount > 0
      && this.splitToInstallments <= 0;
  }

  get splitError(): string | null {
    if (this.splitExceedsPendingInitial) {
      return 'La parte de la cuota inicial no puede superar su saldo pendiente.';
    }

    if (this.splitExceedsPayment) {
      return 'La parte de la cuota inicial no puede superar el monto recibido.';
    }

    if (this.splitLeavesNothingForInstallments) {
      return 'No queda nada para la cuota regular. Si todo el pago va a la inicial, regístralo como abono a cuota inicial.';
    }

    return null;
  }

  private syncSplitValidation(): void {
    const control = this.paymentForm.get('to_down_payment');

    if (this.splitEnabled) {
      control?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      control?.clearValidators();
      control?.setValue('');
    }

    control?.updateValueAndValidity();
  }

  get currentPaymentAmount(): number {
    return Number(this.paymentForm.get('amount')?.value) || 0;
  }

  getFeeDebtValue(fee: any): number {
    return this.financials.getFeeDebtValue(fee);
  }

  private normalizePrefilledAmount(value: number | null): number | null {
    if (value == null) {
      return null;
    }

    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return null;
    }

    return Math.max(0, Math.round(amount));
  }

  calculateDebt() {
    const deudaBruta = this._selectedFees.reduce((sum, fee) => sum + this.getFeeDebtValue(fee), 0);
    const suggestedFromSelection = Math.round(deudaBruta);
    this.totalSelectedAmount = this._selectedFees.length > 0
      ? suggestedFromSelection
      : (this._prefilledAmount ?? 0);
    this.montoSugeridoTotal = this.totalSelectedAmount;
  }

  private syncSuggestedAmountToForm(): void {
    if (!this.isOpen) {
      return;
    }

    this.paymentForm.patchValue({ amount: this.montoSugeridoTotal });
    this.syncSurplusValidation();
  }

  updateFormAmount() {
    this.calculateDebt();
    setTimeout(() => {
      this.splitEnabled = false;
      this.syncSplitValidation();
      this.paymentForm.patchValue({
        amount: this.montoSugeridoTotal,
        payment_method: 'transfer',
        bank_account_id: '',
        receipt_number: '',
        surplus_action: '',
        to_down_payment: ''
      });
      this.syncSurplusValidation();
    });
  }

  private resetState() {
    this.selectedFile = null;
    this.receiptMissing = false;
    this.splitEnabled = false;
    this.pendingDefaultCapitalConfirm = false;
    this.paymentForm.reset({
      amount: this.montoSugeridoTotal,
      payment_method: 'transfer',
      bank_account_id: '',
      transaction_date: this.todayIsoDate(),
      receipt_number: '',
      surplus_action: '',
      to_down_payment: ''
    });
    this.syncSplitValidation();
    this.syncSurplusValidation();
    this.paymentForm.markAsPristine();
    this.paymentForm.markAsUntouched();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event): void {
    if (!this.isOpen || this.confirmPending) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();

    if (this.pendingDefaultCapitalConfirm) {
      this.cancelDefaultCapitalConfirm();
      return;
    }

    this.close();
  }

  close() {
    if (this.isProcessing || this.confirmPending) {
      return;
    }

    this._isProcessing = false;
    this.resetState();
    this.closeDrawer.emit();
    this.onClose.emit();
  }

  submit() {
    if (this.isProcessing || this.confirmPending) {
      return;
    }

    this.receiptMissing = !this.selectedFile;

    if (this.paymentForm.invalid || this.receiptMissing) {
      markAllAsTouched(this.paymentForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    const splitError = this.splitError;
    if (splitError) {
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Reparto inválido', 'error', splitError);
      return;
    }

    if (this.hasSurplus && !this.chosenSurplusAction && !this.pendingDefaultCapitalConfirm) {
      this.pendingDefaultCapitalConfirm = true;
      return;
    }

    const selectedDate = this.paymentForm.get('transaction_date')?.value;
    const normalizedDate = this.normalizeSelectedDate(selectedDate);
    const paymentOption = this.hasSurplus
      ? (this.chosenSurplusAction || this.defaultSurplusAction)
      : '';

    const paymentData = {
      ...this.paymentForm.value,
      transaction_date: normalizedDate,
      payment_date: normalizedDate,
      receipt: this.selectedFile,
      surplus_action: paymentOption,
      payment_option: paymentOption,
      split: this.resolveSplitPayload(),
    };

    this.confirmPayment.emit(paymentData);
  }

  cancelDefaultCapitalConfirm(): void {
    this.pendingDefaultCapitalConfirm = false;
  }
}