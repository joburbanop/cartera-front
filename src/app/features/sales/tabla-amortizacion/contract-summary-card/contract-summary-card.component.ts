import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractStatusLabelPipe } from '../../../../shared/pipes/contract-status-label.pipe';
import { Contract } from '../../../../core/models/contract.model';
import { Customer } from '../../../../core/models/customer.model';
import { ResidualBalanceRules } from '../../../../core/constants/residual-balance-rules';

@Component({
  selector: 'app-contract-summary-card',
  standalone: true,
  imports: [CommonModule, ContractStatusLabelPipe],
  templateUrl: './contract-summary-card.component.html',
  styleUrl: './contract-summary-card.component.scss',
})
export class ContractSummaryCardComponent {
  @Input() contractData: Contract | null = null;
  @Input() totalWithInterest = 0;

  get holders(): Customer[] {
    const contract = this.contractData;
    if (!contract) {
      return [];
    }
    const list = contract.customers?.length
      ? [...contract.customers]
      : (contract.customer ? [contract.customer] : []);

    return list.sort((a, b) => {
      const left = a.name || a.first_name || '';
      const right = b.name || b.first_name || '';
      return left.localeCompare(right, 'es');
    });
  }

  get isSpecialLot(): boolean {
    const value = this.contractData?.is_special_lot;
    return value === true || value === 1 || value === '1';
  }

  get deferredInterestBalance(): number {
    return Number(this.contractData?.deferred_interest_balance || 0);
  }

  get pendingResidualBalance(): number {
    return Number(this.contractData?.pending_residual_balance || 0);
  }

  get residualBalanceCollectible(): boolean {
    if (this.contractData?.residual_balance_collectible === true) {
      return true;
    }

    return this.pendingResidualBalance >= ResidualBalanceRules.collectibleThreshold;
  }

  get residualCollectibleThreshold(): number {
    const fromApi = Number(this.contractData?.residual_collectible_threshold);
    return Number.isFinite(fromApi) && fromApi > 0
      ? fromApi
      : ResidualBalanceRules.collectibleThreshold;
  }
}
