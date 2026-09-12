import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentPromise, PaymentPromiseStatus } from '../../../../core/models/payment-promise.model';
import { PaymentSource } from '../../../../core/models/payment-source.model';

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
  private expandedPromiseIds = new Set<number>();

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

  quotaDebt(promise: PaymentPromise): number {
    if (this.isPaid(promise)) {
      return 0;
    }

    const remaining = Number(promise.remaining_amount);
    if (Number.isFinite(remaining)) {
      return Math.max(0, remaining);
    }

    return Number(promise.expected_amount) || 0;
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

  hasSources(promise: PaymentPromise): boolean {
    return (promise.sources?.length ?? 0) > 0;
  }

  isDetailsExpanded(promise: PaymentPromise): boolean {
    return this.expandedPromiseIds.has(promise.id);
  }

  toggleDetails(promise: PaymentPromise, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.expandedPromiseIds.has(promise.id)) {
      this.expandedPromiseIds.delete(promise.id);
    } else {
      this.expandedPromiseIds.add(promise.id);
    }
  }

  coveredAmount(promise: PaymentPromise): number {
    if (promise.covered_amount != null && promise.covered_amount !== '') {
      return Number(promise.covered_amount);
    }

    return Math.max(0, Number(promise.expected_amount || 0) - this.quotaDebt(promise));
  }

  receiptRouteLabel(source: PaymentSource, currentNumber: number): string {
    const route = source.route ?? [];
    if (route.length > 0) {
      const origin = route[0];
      const path = route.map((item) => this.peerPromiseLabel(item)).join(' → ');
      if (Number(origin.installment_number) === Number(currentNumber)) {
        if (route.length === 1) {
          return 'Este recibo se aplicó solo a esta promesa.';
        }

        const rest = route
          .slice(1)
          .map((item) => `${this.peerPromiseLabel(item)} ($ ${this.peerAmount(item)})`)
          .join(', ');

        return `Empezó en esta promesa. Recorrido: ${path}. El resto fue a ${rest}.`;
      }

      return `Sobrante del mismo recibo. Empezó en ${this.peerPromiseLabel(origin)}. Recorrido: ${path}.`;
    }

    const cameFrom = source.came_from?.[0];
    if (cameFrom) {
      return `Sobrante del mismo recibo. Empezó en ${this.peerPromiseLabel(cameFrom)}.`;
    }

    const others = source.also_applied_to ?? [];
    if (others.length > 0) {
      const rest = others
        .map((item) => `${this.peerPromiseLabel(item)} ($ ${this.peerAmount(item)})`)
        .join(', ');

      return `Empezó en esta promesa. El resto fue a ${rest}.`;
    }

    return 'Este recibo se aplicó solo a esta promesa.';
  }

  private peerPromiseLabel(item: { target_label: string; installment_number?: number | null }): string {
    if (item.installment_number === 0) {
      return 'cuota inicial';
    }

    if (item.target_label) {
      return item.target_label;
    }

    return item.installment_number != null ? `Promesa #${item.installment_number}` : 'Otra promesa';
  }

  private peerAmount(item: { amount: number | string }): string {
    return Number(item.amount || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
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
