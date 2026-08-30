import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentPromise } from '../../../../core/models/payment-promise.model';

@Component({
  selector: 'app-payment-promise-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-promise-tab.component.html',
  styleUrl: './payment-promise-tab.component.scss',
})
export class PaymentPromiseTabComponent {
  @Input() paymentPromises: PaymentPromise[] = [];
  @Input() currentView: 'venta' | 'preventa' = 'venta';
  @Input() canRegisterPayments = false;
  @Input() initialFeePaid = 0;
  @Input() activationThreshold = 0;
  @Input() initialFeeProgress = 0;
  @Input() initialFeeBalance = 0;

  @Output() registerAbono = new EventEmitter<void>();
}
