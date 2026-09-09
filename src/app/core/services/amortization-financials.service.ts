import { Injectable } from '@angular/core';
import {
  AmortizationStatus,
  isPaidStatus,
  isPartialStatus,
  isVencida,
  toAmortizationStatus,
} from '../models/amortization-status';
import { AmortizationInstallment } from '../models/amortization-installment.model';
import { Contract } from '../models/contract.model';
import { Transaction } from '../models/transaction.model';
import { FinancialRules } from '../constants/financial-rules';

@Injectable({
  providedIn: 'root',
})
export class AmortizationFinancialsService {
  private isPastDueFee(fee: AmortizationInstallment): boolean {
    if (isPaidStatus(fee?.status)) {
      return false;
    }

    return isVencida(fee?.due_date ?? fee?.fecha_vencimiento ?? null);
  }

  /**
   * Intereses a pintar: lo cobrado si hay, si no el teórico del plan.
   * Un 0 cobrado (p. ej. Lote 11) cae al teórico, que también puede ser 0.
   */
  displayedInterest(fee: AmortizationInstallment): number {
    const paid = Number(fee?.interest_paid ?? 0);
    if (paid > 0) {
      return paid;
    }

    return Number(fee?.interest_value ?? 0);
  }

  /**
   * Amortización (capital) a pintar: lo cobrado si hay, si no el teórico.
   * En cuota inicial, si aún no hay principal_paid, se usa pactada − quota_debt
   * para no mostrar la inicial completa cuando el abono es parcial.
   */
  displayedAmortization(fee: AmortizationInstallment): number {
    const paid = Number(fee?.principal_paid ?? 0);
    if (paid > 0) {
      return paid;
    }

    if (Number(fee?.installment_number) === 0) {
      const pactada = Number(fee?.principal_value ?? fee?.installment_value ?? 0);
      const debt = Number(fee?.quota_debt);
      if (Number.isFinite(debt)) {
        return Math.max(0, pactada - debt);
      }
    }

    return Number(fee?.principal_value ?? 0);
  }

  getFeeDebtValue(fee: AmortizationInstallment): number {
    if (isPaidStatus(fee?.status)) {
      return 0;
    }

    const quotaDebt = Number(fee?.quota_debt ?? 0);
    if (quotaDebt > 0) {
      return Math.max(0, quotaDebt);
    }

    const installmentValue = Number(fee.installment_value ?? 0);
    const alreadyPaid = Number(fee?.interest_paid ?? 0) + Number(fee?.principal_paid ?? 0);
    const remainder = installmentValue - alreadyPaid;

    return Math.max(0, remainder);
  }

  initialFee(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment | null {
    return (plan ?? []).find((fee) => Number(fee.installment_number) === 0) ?? null;
  }

  initialFeeTotal(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    const fee = this.initialFee(plan, contractData);
    return Number(fee?.installment_value ?? contractData?.down_payment_pactada ?? 0);
  }

  initialFeePaid(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    const transactions = Array.isArray(contractData?.transactions) ? contractData.transactions : [];

    const collected = transactions.reduce((sum: number, tx: Transaction) => {
      const allocated = (Array.isArray(tx.allocations) ? tx.allocations : [])
        .filter((allocation) => String(allocation.target ?? '').toLowerCase() === 'down_payment')
        .reduce((inner, allocation) => inner + Number(allocation.amount || 0), 0);

      if (allocated > 0) {
        return sum + allocated;
      }

      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      if (type === 'down_payment' || type === 'down-payment') {
        return sum + Number(tx.amount || 0);
      }

      return sum;
    }, 0);
    if (collected > 0) {
      return collected;
    }

    const fee = this.initialFee(plan, contractData);
    if (!fee) {
      return 0;
    }

    if (isPaidStatus(fee.status)) {
      return this.initialFeeTotal(plan, contractData);
    }

    if (isPartialStatus(fee.status)) {
      return Number(fee.amount_paid || 0);
    }

    return 0;
  }

  initialFeeBalance(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    return Math.max(0, this.initialFeeTotal(plan, contractData) - this.initialFeePaid(plan, contractData));
  }

  /**
   * En preventa con inicial incompleta (residual ≥ $500) las regulares
   * no cuentan como mora: ni banner, ni overdueFees, ni estado overdue.
   */
  suppressesRegularOverdue(plan: AmortizationInstallment[] = [], contractData?: Contract | null): boolean {
    const contractStatus = String(contractData?.status ?? '').toLowerCase();
    const rawLot = contractData?.lot?.status as string | { value?: string; name?: string } | undefined;
    const lotStatus = typeof rawLot === 'string'
      ? rawLot
      : String(rawLot?.value ?? rawLot?.name ?? '');
    const isPreventa = contractStatus === 'preventa_inactiva' || lotStatus.toLowerCase() === 'preventa';

    if (!isPreventa) {
      return false;
    }

    return this.initialFeeBalance(plan, contractData) >= FinancialRules.quotaCompletionResidual;
  }

  initialFeeProgress(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    const total = this.initialFeeTotal(plan, contractData);
    if (total === 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.initialFeePaid(plan, contractData) / total) * 100));
  }

  activationThreshold(contractData?: Contract | null): number {
    return Number(contractData?.down_payment_pactada || 0);
  }

  getFeeStatus(fee: AmortizationInstallment, plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationStatus {
    if (Number(fee?.installment_number) === 0) {
      const paid = this.initialFeePaid(plan, contractData);
      const threshold = this.activationThreshold(contractData);

      if (paid >= threshold) return 'paid';
      if (paid > 0) return 'partial';
      return 'pending';
    }

    const status = toAmortizationStatus(fee?.status);
    if (this.suppressesRegularOverdue(plan, contractData) && status === 'overdue') {
      const debt = Number(fee?.quota_debt ?? 0);
      const value = Number(fee?.installment_value ?? 0);
      if (debt > 0 && value > 0 && debt < value) {
        return 'partial';
      }

      return 'pending';
    }

    return status;
  }

  isFeeSelectable(fee: AmortizationInstallment, plan: AmortizationInstallment[] = [], contractData?: Contract | null): boolean {
    return this.getFeeStatus(fee, plan, contractData) !== 'paid';
  }

  totalPaidAmount(contractData?: Contract | null): number {
    return (contractData?.transactions ?? []).reduce((sum: number, tx: Transaction) => {
      return sum + Number(tx.amount || 0);
    }, 0);
  }

  totalOutstandingAmount(totalWithInterest: number, contractData?: Contract | null): number {
    return Math.max(0, totalWithInterest - this.totalPaidAmount(contractData));
  }

  totalInterestPaid(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    return (plan ?? []).reduce((sum: number, fee) => {
      const status = this.getFeeStatus(fee, plan, contractData);
      if (status === 'paid' || status === 'partial') {
        return sum + Number(fee.interest_paid || 0);
      }
      return sum;
    }, 0);
  }

  overdueFees(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment[] {
    return (plan ?? [])
      .filter((fee) => {
        if (this.suppressesRegularOverdue(plan, contractData)) {
          return false;
        }

        return this.isPastDueFee(fee);
      })
      .map((fee) => ({
        ...fee,
        overdue_balance: this.getFeeDebtValue(fee),
      }))
      .filter((fee) => Number(fee.overdue_balance || 0) >= FinancialRules.quotaCompletionResidual);
  }

  activeMoraFees(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment[] {
    if (this.suppressesRegularOverdue(plan, contractData)) {
      return [];
    }

    return this.overdueFees(plan, contractData);
  }

  activeMoraDebt(
    plan: AmortizationInstallment[] = [],
    contractData?: Contract | null,
    feeDebtValue: (fee: AmortizationInstallment) => number = (fee) => this.getFeeDebtValue(fee),
  ): number {
    return this.activeMoraFees(plan, contractData).reduce((sum, fee) => sum + feeDebtValue(fee), 0);
  }

  hasActiveMora(plan: AmortizationInstallment[] = [], contractData?: Contract | null): boolean {
    return this.activeMoraFees(plan, contractData).length > 0;
  }
}
