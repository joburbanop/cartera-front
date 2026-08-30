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

  getFeeDebtValue(fee: AmortizationInstallment): number {
    if (isPaidStatus(fee?.status)) {
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

  initialFee(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment | null {
    return (plan ?? []).find((fee) => Number(fee.installment_number) === 0) ?? null;
  }

  initialFeeTotal(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    const fee = this.initialFee(plan, contractData);
    return Number(fee?.installment_value ?? contractData?.down_payment_pactada ?? 0);
  }

  initialFeePaid(plan: AmortizationInstallment[] = [], contractData?: Contract | null): number {
    const transactions = contractData?.transactions ?? [];

    const downPaymentTotal = (Array.isArray(transactions) ? transactions : [])
      .filter((tx: Transaction) => {
        const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
        return type === 'down_payment' || type === 'down-payment';
      })
      .reduce((sum: number, tx: Transaction) => sum + Number(tx.amount || 0), 0);

    if (downPaymentTotal > 0) {
      return downPaymentTotal;
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

    return toAmortizationStatus(fee?.status);
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
        return sum + Number(fee.interest_value || 0);
      }
      return sum;
    }, 0);
  }

  overdueFees(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment[] {
    return (plan ?? [])
      .filter((fee) => {
        if (contractData?.status === 'preventa_inactiva') {
          return false;
        }

        return this.isPastDueFee(fee);
      })
      .map((fee) => {
        const installmentValue = Number(fee.installment_value || 0);
        const remainingBalance = Number(fee.remaining_balance ?? installmentValue ?? 0);

        return {
          ...fee,
          overdue_balance: Math.max(0, Math.min(installmentValue, Math.max(0, remainingBalance))),
        };
      })
      .filter((fee) => Number(fee.installment_value || 0) > 0);
  }

  activeMoraFees(plan: AmortizationInstallment[] = [], contractData?: Contract | null): AmortizationInstallment[] {
    if (contractData?.status === 'preventa_inactiva') {
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
