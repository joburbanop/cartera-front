import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractStatusLabelPipe } from '../../../../shared/pipes/contract-status-label.pipe';
import { Contract } from '../../../../core/models/contract.model';
import { Customer } from '../../../../core/models/customer.model';

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
}
