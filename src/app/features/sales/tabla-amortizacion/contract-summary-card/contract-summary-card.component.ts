import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContractStatusLabelPipe } from '../../../../shared/pipes/contract-status-label.pipe';
import { Contract } from '../../../../core/models/contract.model';

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
}
