import { Injectable } from '@angular/core';
import {
  AmortizationStatus,
  isPaidStatus,
  isPartialStatus,
  isVencida,
  toAmortizationStatus,
} from '../models/amortization-status';

@Injectable({
  providedIn: 'root',
})
export class AmortizationFinancialsService {
  private isPastDueFee(fee: any): boolean {
    if (isPaidStatus(fee?.status)) {
      return false;
    }

    return isVencida(fee?.due_date ?? fee?.fecha_vencimiento ?? null);
  }

  getFeeDebtValue(fee: any): number {
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

  initialFee(plan: any[] = [], contractData: any = null): any {
    return (plan ?? []).find((fee: any) => Number(fee.installment_number) === 0) ?? null;
  }

  initialFeeTotal(plan: any[] = [], contractData: any = null): number {
    const fee = this.initialFee(plan, contractData);
    return Number(fee?.installment_value ?? contractData?.down_payment_pactada ?? 0);
  }

  initialFeePaid(plan: any[] = [], contractData: any = null): number {
    const transactions = contractData?.transactions ?? [];

    const downPaymentTotal = (Array.isArray(transactions) ? transactions : [])
      .filter((tx: any) => {
        const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
        return type === 'down_payment' || type === 'down-payment';
      })
      .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

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

  initialFeeBalance(plan: any[] = [], contractData: any = null): number {
    return Math.max(0, this.initialFeeTotal(plan, contractData) - this.initialFeePaid(plan, contractData));
  }

  initialFeeProgress(plan: any[] = [], contractData: any = null): number {
    const total = this.initialFeeTotal(plan, contractData);
    if (total === 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (this.initialFeePaid(plan, contractData) / total) * 100));
  }

  activationThreshold(contractData: any = null): number {
    return Number(contractData?.down_payment_pactada || 0);
  }

  getFeeStatus(fee: any, plan: any[] = [], contractData: any = null): AmortizationStatus {
    if (Number(fee?.installment_number) === 0) {
      const paid = this.initialFeePaid(plan, contractData);
      const threshold = this.activationThreshold(contractData);

      if (paid >= threshold) return 'paid';
      if (paid > 0) return 'partial';
      return 'pending';
    }

    return toAmortizationStatus(fee?.status);
  }

  isFeeSelectable(fee: any, plan: any[] = [], contractData: any = null): boolean {
    return this.getFeeStatus(fee, plan, contractData) !== 'paid';
  }

  totalPaidAmount(contractData: any = null): number {
    return (contractData?.transactions ?? []).reduce((sum: number, tx: any) => {
      return sum + Number(tx.amount || 0);
    }, 0);
  }

  totalOutstandingAmount(totalWithInterest: number, contractData: any = null): number {
    return Math.max(0, totalWithInterest - this.totalPaidAmount(contractData));
  }

  totalInterestPaid(plan: any[] = [], contractData: any = null): number {
    return (plan ?? []).reduce((sum: number, fee: any) => {
      const status = this.getFeeStatus(fee, plan, contractData);
      if (status === 'paid' || status === 'partial') {
        return sum + Number(fee.interest_value || 0);
      }
      return sum;
    }, 0);
  }

  overdueFees(plan: any[] = [], contractData: any = null): any[] {
    return (plan ?? [])
      .filter((fee: any) => {
        if (contractData?.status === 'preventa_inactiva') {
          return false;
        }

        return this.isPastDueFee(fee);
      })
      .map((fee: any) => {
        const installmentValue = Number(fee.installment_value || 0);
        const remainingBalance = Number(fee.remaining_balance ?? installmentValue ?? 0);

        return {
          ...fee,
          overdue_balance: Math.max(0, Math.min(installmentValue, Math.max(0, remainingBalance))),
        };
      })
      .filter((fee: any) => Number(fee.installment_value || 0) > 0);
  }

  activeMoraFees(plan: any[] = [], contractData: any = null): any[] {
    if (contractData?.status === 'preventa_inactiva') {
      return [];
    }

    return this.overdueFees(plan, contractData);
  }

  activeMoraDebt(plan: any[] = [], contractData: any = null, feeDebtValue: (fee: any) => number): number {
    return this.activeMoraFees(plan, contractData).reduce((sum: number, fee: any) => sum + feeDebtValue(fee), 0);
  }

  hasActiveMora(plan: any[] = [], contractData: any = null): boolean {
    return this.activeMoraFees(plan, contractData).length > 0;
  }
}
