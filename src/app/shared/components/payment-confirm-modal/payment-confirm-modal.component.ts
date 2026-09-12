import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentMethodNamePipe } from '../../pipes/payment-method-name.pipe';

export const SURPLUS_ACTION_LABELS: Record<string, string> = {
  reducir_plazo: 'Reducir Plazo',
  reducir_cuota: 'Reducir Cuota',
  adelantar_cuotas: 'Pagar cuotas futuras',
  abono_capital: 'Abono a capital',
};

export type PaymentConfirmKind = 'payment' | 'residual';

export interface PaymentConfirmSplit {
  toDownPayment: number;
  toInstallments: number;
}

export interface PaymentConfirmSummary {
  kind: PaymentConfirmKind;
  contractLabel: string;
  amount: number;
  transactionDate: string;
  paymentMethod: string;
  receiptNumber: string;
  installmentsLabel: string;
  split: PaymentConfirmSplit | null;
  surplusActionLabel: string | null;
  residualPending: number | null;
}

@Component({
  selector: 'app-payment-confirm-modal',
  standalone: true,
  imports: [CommonModule, PaymentMethodNamePipe],
  templateUrl: './payment-confirm-modal.component.html',
  styleUrl: './payment-confirm-modal.component.scss',
})
export class PaymentConfirmModalComponent {
  @Input() isOpen = false;
  @Input() summary: PaymentConfirmSummary | null = null;
  @Input() isProcessing = false;

  @Output() goBack = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  get confirmLabel(): string {
    if (this.isProcessing) {
      return 'Registrando...';
    }

    return this.summary?.kind === 'residual' ? 'Confirmar cobro' : 'Confirmar pago';
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.isOpen || this.isProcessing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.goBack.emit();
  }
}
