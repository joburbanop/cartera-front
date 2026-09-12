import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WithdrawalCalculation } from '../../../../core/services/Financial/withdrawal.service';

@Component({
  selector: 'app-withdrawal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './withdrawal-modal.html',
  styleUrl: './withdrawal-modal.scss',
})
export class WithdrawalModal {
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() contractId: number | null = null;
  @Input() calculation: WithdrawalCalculation | null = null;
  @Input() isCalculating = false;

  @Output() closeModal = new EventEmitter<void>();

  @Output() calculateWithdrawal = new EventEmitter<{
  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario';
  retentionPercentage: number | null;
  requestDate: string;
  observations: string | null;
  modificationJustification: string | null;
}>();


@Output() confirmWithdrawal = new EventEmitter<{
  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario';
  retentionPercentage: number | null;
  requestDate: string;
  observations: string | null;
  modificationJustification: string | null;
}>();

  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario' =
    'voluntario';

  retentionPercentage: number | null = 10;

  requestDate = '';

  observations = '';

  modificationJustification = '';

  readonly causes = [
    {
      value: 'retracto_de_ley' as const,
      label: 'Retracto de ley',
    },
    {
      value: 'fuerza_mayor' as const,
      label: 'Fuerza mayor',
    },
    {
      value: 'voluntario' as const,
      label: 'Voluntario',
    },
  ];

  close(): void {
    this.closeModal.emit();
  }

  calculate(): void {
    if (!this.requestDate) {
      return;
    }

    this.calculateWithdrawal.emit({
      cause: this.cause,
      retentionPercentage: this.retentionPercentage,
      requestDate: this.requestDate,
      observations: this.observations || null,
      modificationJustification:
        this.modificationJustification || null,
    });
  }

  confirm(): void {
    if (!this.requestDate) {
      return;
    }

    this.confirmWithdrawal.emit({
      cause: this.cause,
      retentionPercentage: this.retentionPercentage,
      requestDate: this.requestDate,
      observations: this.observations || null,
      modificationJustification:
        this.modificationJustification || null,
    });
}
}