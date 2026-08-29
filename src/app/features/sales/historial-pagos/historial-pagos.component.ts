import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecaudoService } from '../../../core/services/recaudo.service';

@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-pagos.component.html',
})
export class HistorialPagosComponent implements OnInit {
  transactions: any[] = [];
  customerId: string = '';
  lotId: string = '';
  isLoading = false;

  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  constructor(private recaudoService: RecaudoService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading = true;

    const filters: any = {};

    if (this.customerId) {
      filters.customer_id = this.customerId;
    }

    if (this.lotId) {
      filters.lot_id = this.lotId;
    }

    this.recaudoService.getAllTransactions(filters).subscribe({
      next: (res: any) => {
        this.transactions = res.data ? res.data : res;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando historial', err);
        this.transactions = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters(): void {
    this.loadTransactions();
  }

verComprobante(url: string): void {
  if (!url) {
    return;
  }

  this.http.get(url, {
    responseType: 'blob',
    observe: 'response'
  }).subscribe({
    next: (response) => {
      const blob = response.body;

      if (!blob) {
        console.error('El recibo llegó vacío');
        return;
      }

      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, '_blank');

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    },
    error: (err) => {
      console.error('Error al abrir el recibo', err);
    }
  });
}
}
