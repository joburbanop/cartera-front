import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmortizationInstallment } from '../../../../core/models/amortization-installment.model';
import { isPaidStatus } from '../../../../core/models/amortization-status';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

export type RefinanceTipo =
  | 'acuerdo_pago'
  | 'tiempo_gracia'
  | 'refinanciar_saldo'
  | 'exoneracion_intereses';

export interface RefinanceConfirmPayload {
  tipo: RefinanceTipo;
  params: Record<string, unknown>;
}

@Component({
  selector: 'app-refinance-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyMaskDirective],
  templateUrl: './refinance-modal.component.html',
  styleUrl: './refinance-modal.component.scss',
})
export class RefinanceModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() installments: AmortizationInstallment[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmRefinance = new EventEmitter<RefinanceConfirmPayload>();

  readonly options: Array<{ tipo: RefinanceTipo; title: string; description: string }> = [
    {
      tipo: 'acuerdo_pago',
      title: 'Acuerdo de pago',
      description: 'Cuota normal + abono fijo mensual',
    },
    {
      tipo: 'tiempo_gracia',
      title: 'Tiempo de gracia / Prórroga',
      description: 'Correr fechas sin cobrar mora',
    },
    {
      tipo: 'refinanciar_saldo',
      title: 'Refinanciar saldo',
      description: 'Cambiar plazo/tasa del saldo',
    },
    {
      tipo: 'exoneracion_intereses',
      title: 'Exoneración de intereses',
      description: 'Perdonar intereses en cuotas específicas',
    },
  ];

  tipo: RefinanceTipo = 'acuerdo_pago';
  extraAmount: number | null = null;
  months: number | null = null;
  newTermMonths: number | null = null;
  newInterestRate: string = '';
  reductionPercent: string = '';
  selectedInstallmentIds = new Set<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  get futureInstallments(): AmortizationInstallment[] {
    return (this.installments ?? []).filter((installment) => {
      if (Number(installment.installment_number) <= 0) {
        return false;
      }

      return !isPaidStatus(installment.status);
    });
  }

  get canSubmit(): boolean {
    if (this.isSaving) {
      return false;
    }

    switch (this.tipo) {
      case 'acuerdo_pago':
        return (this.extraAmount ?? 0) > 0 && (this.months ?? 0) > 0;
      case 'tiempo_gracia':
        return (this.months ?? 0) > 0;
      case 'refinanciar_saldo':
        return (this.newTermMonths ?? 0) > 0 && this.newInterestRate !== '';
      case 'exoneracion_intereses':
        return this.selectedInstallmentIds.size > 0 && this.reductionPercent !== '';
      default:
        return false;
    }
  }

  close(): void {
    if (this.isSaving) {
      return;
    }

    this.closeModal.emit();
  }

  toggleInstallment(id: number, checked: boolean): void {
    if (checked) {
      this.selectedInstallmentIds.add(id);
    } else {
      this.selectedInstallmentIds.delete(id);
    }

    this.selectedInstallmentIds = new Set(this.selectedInstallmentIds);
  }

  isSelected(id: number): boolean {
    return this.selectedInstallmentIds.has(id);
  }

  installmentId(fee: AmortizationInstallment): number {
    return Number(fee.id);
  }

  confirm(): void {
    if (!this.canSubmit) {
      return;
    }

    this.confirmRefinance.emit({
      tipo: this.tipo,
      params: this.buildParams(),
    });
  }

  private buildParams(): Record<string, unknown> {
    switch (this.tipo) {
      case 'acuerdo_pago':
        return {
          extra_amount: this.toMoneyString(this.extraAmount),
          months: Number(this.months),
        };
      case 'tiempo_gracia':
        return {
          months: Number(this.months),
        };
      case 'refinanciar_saldo':
        return {
          new_term_months: Number(this.newTermMonths),
          new_interest_rate: this.toDecimalString(this.newInterestRate),
        };
      case 'exoneracion_intereses':
        return {
          installment_ids: Array.from(this.selectedInstallmentIds),
          reduction_percent: this.toDecimalString(this.reductionPercent),
        };
      default:
        return {};
    }
  }

  private resetForm(): void {
    this.tipo = 'acuerdo_pago';
    this.extraAmount = null;
    this.months = null;
    this.newTermMonths = null;
    this.newInterestRate = '';
    this.reductionPercent = '';
    this.selectedInstallmentIds = new Set();
  }

  private toMoneyString(value: number | null): string {
    return Number(value ?? 0).toFixed(2);
  }

  private toDecimalString(value: string): string {
    const normalized = String(value).replace(',', '.').trim();
    const numeric = Number(normalized);

    return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
  }
}
