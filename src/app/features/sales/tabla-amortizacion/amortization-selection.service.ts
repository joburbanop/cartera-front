import { Injectable } from '@angular/core';

@Injectable()
export class AmortizationSelectionService {
  selectedFees: any[] = [];
  private plan: any[] = [];

  setPlan(plan: any[] = []): void {
    this.plan = plan ?? [];
  }

  toggleFeeSelection(fee: any, event: any, isSelectable: boolean = true): void {
    const checked = !!event?.target?.checked;

    if (!isSelectable) {
      if (event?.target) {
        event.target.checked = false;
      }
      this.selectedFees = this.selectedFees.filter((item) => item.installment_number !== fee.installment_number);
      return;
    }

    if (checked) {
      if (!this.selectedFees.some((item) => item.installment_number === fee.installment_number)) {
        this.selectedFees = [...this.selectedFees, fee];
      }
      return;
    }

    this.selectedFees = this.selectedFees.filter((item) => item.installment_number !== fee.installment_number);
  }

  toggleSelectAll(event: any, plan: any[] = [], isSelectable: (fee: any) => boolean): void {
    const checked = !!event?.target?.checked;

    if (checked) {
      this.selectedFees = (plan ?? []).filter((fee: any) => isSelectable(fee));
      return;
    }

    this.selectedFees = [];
  }

  isSelected(fee: any): boolean {
    return this.selectedFees.some((item) => item.installment_number === fee.installment_number);
  }

  getFeeDebtValue(fee: any): number {
    const status = String(fee?.status ?? '').toLowerCase();

    if (status === 'pagada' || status === 'paid') {
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

  clearSelection(): void {
    this.selectedFees = [];
  }

  get totalSelectedAmount(): number {
    return this.selectedFees.reduce((sum: number, fee: any) => sum + this.getFeeDebtValue(fee), 0);
  }

  get totalOverdueQuotaDebt(): number {
    return (this.plan ?? []).reduce((sum: number, fee: any) => {
      const status = String(fee?.status ?? '').toLowerCase();
      if (status === 'vencida' || status === 'overdue') {
        return sum + this.getFeeDebtValue(fee);
      }
      return sum;
    }, 0);
  }
}
