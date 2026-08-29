import { Injectable, inject } from '@angular/core';
import { isOverdueStatus } from '../../../core/models/amortization-status';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';

@Injectable()
export class AmortizationSelectionService {
  selectedFees: any[] = [];
  private plan: any[] = [];
  private financials = inject(AmortizationFinancialsService);

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
    return this.financials.getFeeDebtValue(fee);
  }

  clearSelection(): void {
    this.selectedFees = [];
  }

  get totalSelectedAmount(): number {
    return this.selectedFees.reduce((sum: number, fee: any) => sum + this.getFeeDebtValue(fee), 0);
  }

  get totalOverdueQuotaDebt(): number {
    return (this.plan ?? []).reduce((sum: number, fee: any) => {
      if (isOverdueStatus(fee?.status)) {
        return sum + this.getFeeDebtValue(fee);
      }
      return sum;
    }, 0);
  }
}
