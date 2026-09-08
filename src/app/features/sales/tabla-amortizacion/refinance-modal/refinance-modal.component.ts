import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmortizationInstallment } from '../../../../core/models/amortization-installment.model';
import { isPaidStatus } from '../../../../core/models/amortization-status';
import { FinancialService } from '../../../../core/services/financial.service';
import { CurrencyMaskDirective } from '../../../../shared/directives/currency-mask.directive';

export type RefinanceTipo =
  | 'acuerdo_pago'
  | 'tiempo_gracia'
  | 'refinanciar_saldo'
  | 'exoneracion_intereses'
  | 'liquidacion_contado';

export type DeferredInterestAction = 'cobrar_aparte' | 'condonar';

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
  private readonly financials = inject(FinancialService);

  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() installments: AmortizationInstallment[] = [];
  /** Precio de lista del lote: solo referencia visible, nunca se precarga. */
  @Input() listPrice: number | null = null;
  @Input() deferredInterestBalance = 0;

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
      description: 'Actualizar precio del lote y re-amortizar la diferencia',
    },
    {
      tipo: 'exoneracion_intereses',
      title: 'Exoneración de intereses en cuotas puntuales',
      description: 'Perdona el interés de las cuotas que elijas. El contrato sigue a cuotas; no cierra el saldo.',
    },
    {
      tipo: 'liquidacion_contado',
      title: 'Liquidación de contado del saldo',
      description: 'Cierra el plan: se cobra el capital insoluto más el interés ya causado hasta hoy. No se cobran intereses de cuotas futuras.',
    },
  ];

  readonly motivoMinLength = 10;

  tipo: RefinanceTipo = 'acuerdo_pago';
  motivo = '';
  extraAmount: number | null = null;
  months: number | null = null;
  newSalePrice: number | null = null;
  newTermMonths: number | null = null;
  newInterestRate: string = '';
  deferredInterestAction: DeferredInterestAction | null = null;
  reductionPercent: string = '';
  selectedInstallmentIds = new Set<number>();

  /** Protege contra doble envío: el API descarta la segunda petición con la misma clave. */
  private idempotencyKey = '';

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

  /** Capital neto ya entregado: solo principal_paid (sin interés). */
  get capitalPaidTotal(): number {
    return (this.installments ?? []).reduce((sum, row) => {
      return sum + Number(row.principal_paid || 0);
    }, 0);
  }

  get newPrincipal(): number {
    const price = Number(this.newSalePrice ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      return 0;
    }

    return Math.max(0, price - this.capitalPaidTotal);
  }

  /**
   * Interés corriente causado no pagado de las cuotas que se reemplazan.
   * Nunca entra al capital del plan nuevo.
   */
  get accruedUnpaidInterest(): number {
    return this.futureInstallments.reduce((sum, row) => {
      const unpaid = Number(row.interest_value || 0) - Number(row.interest_paid || 0);
      return sum + Math.max(0, unpaid);
    }, 0);
  }

  get hasAccruedUnpaidInterest(): boolean {
    return this.accruedUnpaidInterest > 0.005;
  }

  /**
   * Capital que queda por pagar según el cronograma, no según sale_price: en los
   * contratos con abonos extra incorporados a la cuota ambas cifras no coinciden.
   */
  get outstandingCapital(): number {
    return (this.installments ?? []).reduce((sum, row) => {
      const pending = Number(row.principal_value || 0) - Number(row.principal_paid || 0);
      return sum + Math.max(0, pending);
    }, 0);
  }

  get causedUnpaidInterest(): number {
    return this.sumUnpaidInterest((row) => this.isDueOnOrBeforeToday(row));
  }

  get unaccruedUnpaidInterest(): number {
    return this.sumUnpaidInterest((row) => !this.isDueOnOrBeforeToday(row));
  }

  get amountToClose(): number {
    return this.outstandingCapital + this.causedUnpaidInterest;
  }

  get hasSettlementWork(): boolean {
    return this.amountToClose > 0.005 || this.unaccruedUnpaidInterest > 0.005;
  }

  /** Misma PMT del front alineada con el API (vectores dorados). */
  get resultingMonthlyQuota(): number | null {
    const term = Number(this.newTermMonths ?? 0);
    const rateRaw = String(this.newInterestRate ?? '').replace(',', '.').trim();
    const rate = Number(rateRaw);
    const principal = this.newPrincipal;

    if (principal <= 0 || term <= 0 || !Number.isFinite(rate) || rate < 0 || rateRaw === '') {
      return null;
    }

    return this.financials.calculateFrenchQuota(principal, term, rate);
  }

  get isMotivoValid(): boolean {
    return this.motivo.trim().length >= this.motivoMinLength;
  }

  get canSubmit(): boolean {
    if (this.isSaving || !this.isMotivoValid) {
      return false;
    }

    switch (this.tipo) {
      case 'acuerdo_pago':
        return (this.extraAmount ?? 0) > 0 && (this.months ?? 0) > 0;
      case 'tiempo_gracia':
        return (this.months ?? 0) > 0;
      case 'refinanciar_saldo':
        return (
          (this.newSalePrice ?? 0) > 0
          && (this.newTermMonths ?? 0) > 0
          && this.newInterestRate !== ''
          && this.newPrincipal > 0
          && (!this.hasAccruedUnpaidInterest || this.deferredInterestAction !== null)
        );
      case 'exoneracion_intereses':
        return this.selectedInstallmentIds.size > 0 && this.reductionPercent !== '';
      case 'liquidacion_contado':
        return this.hasSettlementWork;
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
    return {
      motivo: this.motivo.trim(),
      idempotency_key: this.idempotencyKey,
      ...this.buildStrategyParams(),
    };
  }

  private buildStrategyParams(): Record<string, unknown> {
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
      case 'refinanciar_saldo': {
        const params: Record<string, unknown> = {
          new_sale_price: this.toMoneyString(this.newSalePrice),
          new_term_months: Number(this.newTermMonths),
          new_interest_rate: this.toDecimalString(this.newInterestRate),
        };

        if (this.hasAccruedUnpaidInterest && this.deferredInterestAction) {
          params['deferred_interest_action'] = this.deferredInterestAction;
        }

        return params;
      }
      case 'exoneracion_intereses':
        return {
          installment_ids: Array.from(this.selectedInstallmentIds),
          reduction_percent: this.toDecimalString(this.reductionPercent),
        };
      case 'liquidacion_contado':
        return {};
      default:
        return {};
    }
  }

  private resetForm(): void {
    this.tipo = 'acuerdo_pago';
    this.motivo = '';
    this.extraAmount = null;
    this.months = null;
    this.newSalePrice = null;
    this.newTermMonths = null;
    this.newInterestRate = '';
    this.deferredInterestAction = null;
    this.reductionPercent = '';
    this.selectedInstallmentIds = new Set();
    this.idempotencyKey = crypto.randomUUID();
  }

  private sumUnpaidInterest(predicate: (row: AmortizationInstallment) => boolean): number {
    return (this.installments ?? []).reduce((sum, row) => {
      if (isPaidStatus(row.status) || !predicate(row)) {
        return sum;
      }

      const unpaid = Number(row.interest_value || 0) - Number(row.interest_paid || 0);
      return sum + Math.max(0, unpaid);
    }, 0);
  }

  private isDueOnOrBeforeToday(row: AmortizationInstallment): boolean {
    const raw = row.due_date ?? row.fecha_vencimiento;
    if (!raw) {
      return false;
    }

    const match = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return false;
    }

    const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    due.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return due.getTime() <= today.getTime();
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
