import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AmortizationFinancialsService {
  private isPastDueFee(fee: any): boolean {
    const status = String(fee?.status ?? '').toLowerCase();
    if (status === 'pagada' || status === 'paid') {
      return false;
    }

    const dueDateValue = fee?.due_date ?? fee?.fecha_vencimiento ?? null;
    if (!dueDateValue) {
      return false;
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
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

    const status = String(fee.status ?? '').toLowerCase();
    if (status === 'pagada' || status === 'paid') {
      return this.initialFeeTotal(plan, contractData);
    }

    if (status === 'parcial') {
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

  getFeeStatus(fee: any, plan: any[] = [], contractData: any = null): string {
    if (Number(fee?.installment_number) === 0) {
      const paid = this.initialFeePaid(plan, contractData);
      const threshold = this.activationThreshold(contractData);

      if (paid >= threshold) return 'pagada';
      if (paid > 0) return 'parcial';
      return 'sin_pagar';
    }

    return String(fee?.status || 'sin_pagar');
  }

  isFeeSelectable(fee: any, plan: any[] = [], contractData: any = null): boolean {
    const status = this.getFeeStatus(fee, plan, contractData).toLowerCase();
    const rawStatus = String(fee?.status ?? '').toLowerCase();
    return status !== 'pagada' && rawStatus !== 'paid';
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
      if (status === 'pagada' || status === 'parcial') {
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
