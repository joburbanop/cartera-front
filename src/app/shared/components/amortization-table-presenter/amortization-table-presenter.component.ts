import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-amortization-table-presenter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './amortization-table-presenter.component.html',
  styleUrl: './amortization-table-presenter.component.scss',
})
export class AmortizationTablePresenterComponent {
  @Input() installments: any[] = [];
  @Input() selectable = false;
  @Input() currentView: 'venta' | 'preventa' = 'venta';
  @Input() resetSelection = false;

  @Output() selectionChanged = new EventEmitter<any[]>();
  @Output() downloadPdf = new EventEmitter<'internal' | 'client'>();
  @Output() paySelected = new EventEmitter<void>();

  estadoTraduccion: { [key: string]: string } = {
    pending: 'PENDIENTE',
    paid: 'PAGADA',
    partial: 'PARCIAL',
    overdue: 'VENCIDA',
    sin_pagar: 'PENDIENTE',
    pagada: 'PAGADA',
    parcial: 'PARCIAL',
    vencida: 'VENCIDA',
  };

  selectedInstallments: any[] = [];

  obtenerEstadoEspanol(estado: string): string {
    if (!estado) {
      return '';
    }

    const clave = String(estado).trim().toLowerCase();
    return this.estadoTraduccion[clave] || clave.toUpperCase();
  }

  get allInstallmentsPaid(): boolean {
    return this.installments.length > 0 && this.installments.every((fee: any) => {
      const status = String(fee?.status ?? '').toLowerCase();
      return status === 'pagada' || status === 'paid';
    });
  }

  /**
   * Retorna true si la fecha de vencimiento de la cuota es estrictamente
   * anterior a hoy (comparación por día, sin horas).
   */
  isVencida(dueDate: string | Date | null | undefined): boolean {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limitDate = new Date(dueDate);
    limitDate.setHours(0, 0, 0, 0);
    return limitDate < today;
  }

  /**
   * Una cuota está bloqueada (checkbox deshabilitado) si:
   * - ya fue pagada, O
   * - su fecha de vencimiento ya expiró (periodo contable cerrado).
   * Las cuotas FUTURAS nunca se bloquean para permitir pagos adelantados.
   */
  isBloqueada(fee: any): boolean {
    const status = String(fee?.status ?? '').toLowerCase();
    const isPagada = status === 'pagada' || status === 'paid';
    const isPasada = this.isVencida(fee?.due_date);
    return isPagada || isPasada;
  }

  isFeeSelectable(fee: any): boolean {
    return this.selectable && !this.isBloqueada(fee);
  }

  isSelected(fee: any): boolean {
    return this.selectedInstallments.some((item) => item.installment_number === fee.installment_number);
  }

  toggleFeeSelection(fee: any, event: Event): void {
    if (this.isBloqueada(fee)) {
      const statusTarget = event.target as HTMLInputElement;
      if (statusTarget) {
        statusTarget.checked = false;
      }
      return;
    }

    const target = event.target as HTMLInputElement;
    const checked = !!target?.checked;

    if (!this.isFeeSelectable(fee)) {
      target.checked = false;
      this.selectedInstallments = this.selectedInstallments.filter((item) => item.installment_number !== fee.installment_number);
      this.selectionChanged.emit([...this.selectedInstallments]);
      return;
    }

    if (checked) {
      if (!this.selectedInstallments.some((item) => item.installment_number === fee.installment_number)) {
        this.selectedInstallments = [...this.selectedInstallments, fee];
      }
    } else {
      this.selectedInstallments = this.selectedInstallments.filter((item) => item.installment_number !== fee.installment_number);
    }

    this.selectionChanged.emit([...this.selectedInstallments]);
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = !!target?.checked;

    if (checked) {
      this.selectedInstallments = this.installments.filter((fee: any) => this.isFeeSelectable(fee));
    } else {
      this.selectedInstallments = [];
    }

    this.selectionChanged.emit([...this.selectedInstallments]);
  }

  get totalSelectedAmount(): number {
    return this.selectedInstallments.reduce((sum: number, fee: any) => sum + Number(fee.installment_value || 0), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['installments']) {
      const validInstallmentNumbers = new Set((this.installments ?? []).map((fee: any) => fee.installment_number));
      const nextSelection = this.selectedInstallments.filter((item: any) => {
        const stillExists = validInstallmentNumbers.has(item.installment_number);
        const status = String(item?.status ?? item?.estado ?? '').toLowerCase();
        const isPaid = status === 'pagada' || status === 'paid';
        return stillExists && !isPaid;
      });

      if (nextSelection.length !== this.selectedInstallments.length) {
        this.selectedInstallments = nextSelection;
        this.selectionChanged.emit([...this.selectedInstallments]);
      }
    }

    if (changes['resetSelection'] && this.resetSelection) {
      this.selectedInstallments = [];
      this.selectionChanged.emit([]);
    }
  }

  emitDownload(type: 'internal' | 'client'): void {
    this.downloadPdf.emit(type);
  }

  emitPaySelected(): void {
    if (this.selectedInstallments.length === 0) {
      return;
    }

    this.paySelected.emit();
  }
}
