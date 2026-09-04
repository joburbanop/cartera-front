import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';

export function createPaymentPromiseGroup(fb: FormBuilder): FormGroup {
  const group = fb.group({
    expected_date: ['', Validators.required],
    expected_amount: [null as number | null, [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
  });

  group.reset({
    expected_date: '',
    expected_amount: null,
    description: '',
  });

  return group;
}

@Component({
  selector: 'app-contract-payment-promises',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CurrencyMaskDirective, FieldErrorComponent],
  templateUrl: './contract-payment-promises.component.html',
})
export class ContractPaymentPromisesComponent {
  private fb = inject(FormBuilder);

  @Input({ required: true }) paymentPromises!: FormArray<FormGroup>;
  @Input() isCustomPlan = false;
  @Input() cuotaFijaEstimada = 0;
  @Input() termMonths = 0;
  @Input() saldoAFinanciar = 0;
  @Input() totalCustomPromises = 0;
  @Input() diferenciaFinanciera = 0;
  @Input() hasFinancialDifference = false;
  @Input() valorFuturoDeuda = 0;
  @Input() missingTermInstallmentsMessage = '';
  @Input() batchErrorMessage = '';

  @Input() showBatchAssistant = false;
  @Output() showBatchAssistantChange = new EventEmitter<boolean>();

  @Input() batchCount = 1;
  @Output() batchCountChange = new EventEmitter<number>();

  @Input() batchAmount: any = 0;
  @Output() batchAmountChange = new EventEmitter<any>();

  @Input() batchStartDate = '';
  @Output() batchStartDateChange = new EventEmitter<string>();

  @Input() batchDescription = 'Cuota ordinaria';
  @Output() batchDescriptionChange = new EventEmitter<string>();

  @Input() showGeneratedPromises = true;
  @Output() showGeneratedPromisesChange = new EventEmitter<boolean>();

  @Output() generateBatch = new EventEmitter<void>();
  @Output() errorMessageChange = new EventEmitter<string>();

  trackByPromise(_index: number, control: FormGroup): FormGroup {
    return control;
  }

  addPaymentPromise(): void {
    this.paymentPromises.push(createPaymentPromiseGroup(this.fb));
    this.showGeneratedPromisesChange.emit(true);
  }

  removePaymentPromise(index: number): void {
    this.paymentPromises.removeAt(index);
  }

  autoCuadrarUltimaCuota(): void {
    if (!this.isCustomPlan || this.paymentPromises.length === 0) {
      return;
    }

    const termMonths = Number(this.termMonths ?? 0) || 0;
    const valorFuturoDeuda = Math.round(this.cuotaFijaEstimada * termMonths);

    if (!Number.isFinite(valorFuturoDeuda) || valorFuturoDeuda <= 0) {
      this.errorMessageChange.emit('No se pudo calcular el valor futuro de la deuda. Verifica precio, inicial, plazo y tasa.');
      return;
    }

    const lastIndex = this.paymentPromises.length - 1;
    const sumaParcial = this.paymentPromises.controls.slice(0, lastIndex).reduce((sum, control) => {
      const rawValue = (control as FormGroup).get('expected_amount')?.value;

      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return sum;
      }

      if (typeof rawValue === 'number') {
        return sum + (Number.isFinite(rawValue) ? rawValue : 0);
      }

      if (typeof rawValue === 'string') {
        const sanitized = rawValue.replace(/[\$\.,\s]/g, '');
        const parsed = Number(sanitized);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }

      return sum;
    }, 0);

    const nuevoMontoUltimaCuota = Math.round(valorFuturoDeuda - sumaParcial);

    if (nuevoMontoUltimaCuota <= 0) {
      this.errorMessageChange.emit('No se puede auto-cuadrar: la suma de las cuotas previas ya supera el valor futuro proyectado.');
      return;
    }

    this.errorMessageChange.emit('');
    (this.paymentPromises.at(lastIndex) as FormGroup).patchValue({
      expected_amount: nuevoMontoUltimaCuota,
    });
  }
}
