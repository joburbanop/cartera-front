import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentPromise, PaymentPromiseStatus } from '../../../../core/models/payment-promise.model';

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
  @Input() canReorder = false;
  @Input() isReordering = false;
  @Input() initialFeePaid = 0;
  @Input() activationThreshold = 0;
  @Input() initialFeeProgress = 0;
  @Input() initialFeeBalance = 0;

  @Output() registerAbono = new EventEmitter<void>();
  @Output() reorderPromises = new EventEmitter<Array<{ id: number; expected_date: string }>>();

  private dragIndex: number | null = null;

  statusLabel(promise: PaymentPromise): string {
    const status = this.statusOf(promise);
    return {
      pagada: 'Pagada',
      parcial: 'Parcial',
      vencida: 'Vencida',
      pendiente: 'Pendiente',
    }[status];
  }

  statusTone(promise: PaymentPromise): { background: string; color: string; border: string } {
    const status = this.statusOf(promise);

    if (status === 'pagada') {
      return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    }
    if (status === 'parcial') {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    }
    if (status === 'vencida') {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }

    return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  }

  isPaid(promise: PaymentPromise): boolean {
    return this.statusOf(promise) === 'pagada';
  }

  canDrag(promise: PaymentPromise): boolean {
    return this.canReorder && !this.isReordering && !this.isPaid(promise);
  }

  onDragStart(event: DragEvent, index: number): void {
    const promise = this.paymentPromises[index];
    if (!promise || !this.canDrag(promise)) {
      event.preventDefault();
      return;
    }

    this.dragIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    const target = this.paymentPromises[index];
    if (!target || this.isPaid(target) || this.dragIndex === null) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const from = this.dragIndex;
    this.dragIndex = null;

    const target = this.paymentPromises[dropIndex];
    if (from === null || from === dropIndex || !target || this.isPaid(target)) {
      return;
    }

    const next = [...this.paymentPromises];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);

    const firstDate = this.normalizeDate(next[0]?.expected_date);
    const originalDates = new Map(this.paymentPromises.map((item) => [item.id, this.normalizeDate(item.expected_date)]));

    const payload = next.map((promise, index) => {
      const cadenceDate = this.addMonthsNoOverflow(firstDate, index);
      const expectedDate = this.isPaid(promise) ? (originalDates.get(promise.id) ?? cadenceDate) : cadenceDate;

      return {
        id: promise.id,
        expected_date: expectedDate,
      };
    });

    this.reorderPromises.emit(payload);
  }

  onDragEnd(): void {
    this.dragIndex = null;
  }

  private statusOf(promise: PaymentPromise): PaymentPromiseStatus {
    const raw = String(promise.status ?? (promise.is_paid ? 'pagada' : 'pendiente')).toLowerCase();
    if (raw === 'pagada' || raw === 'paid') {
      return 'pagada';
    }
    if (raw === 'parcial' || raw === 'partial') {
      return 'parcial';
    }
    if (raw === 'vencida' || raw === 'overdue') {
      return 'vencida';
    }

    return 'pendiente';
  }

  private normalizeDate(value: string | Date | null | undefined): string {
    if (!value) {
      return new Date().toISOString().slice(0, 10);
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
  }

  private addMonthsNoOverflow(dateValue: string, months: number): string {
    const [year, month, day] = this.normalizeDate(dateValue).split('-').map(Number);
    const target = new Date(year, (month - 1) + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));

    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }
}
