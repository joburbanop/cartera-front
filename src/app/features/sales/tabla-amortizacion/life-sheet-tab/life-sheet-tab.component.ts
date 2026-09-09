import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LifeSheet, LifeSheetRow } from '../../../../core/models/life-sheet.model';

@Component({
  selector: 'app-life-sheet-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './life-sheet-tab.component.html',
  styleUrl: './life-sheet-tab.component.scss',
})
export class LifeSheetTabComponent {
  @Input() sheet: LifeSheet | null = null;
  @Input() isLoading = false;
  @Output() downloadPdf = new EventEmitter<void>();

  money(value: string | null | undefined): number {
    return Number(value || 0);
  }

  hasAmount(value: string | null | undefined): boolean {
    return Number(value || 0) > 0.005;
  }

  /** Peso de una parte del consolidado sobre el total pagado. */
  share(value: string | null | undefined): string {
    const total = this.money(this.sheet?.summary.collected);
    if (total <= 0) {
      return '—';
    }

    return `${((this.money(value) / total) * 100).toFixed(1)} % del total`;
  }

  /** Filas cuyo reparto está desplegado. */
  private expandedRows = new Set<number>();

  /** Un pago repartido entre cuota inicial y cuota regular. */
  isSplit(row: LifeSheetRow): boolean {
    return (row.allocations?.length ?? 0) > 0;
  }

  isExpanded(row: LifeSheetRow): boolean {
    return this.expandedRows.has(row.transaction_id);
  }

  toggleDetails(row: LifeSheetRow): void {
    if (this.expandedRows.has(row.transaction_id)) {
      this.expandedRows.delete(row.transaction_id);
    } else {
      this.expandedRows.add(row.transaction_id);
    }
  }
}
