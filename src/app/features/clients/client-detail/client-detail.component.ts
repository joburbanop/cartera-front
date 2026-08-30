import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerDetail, CustomerService } from '../../../core/services/customer.service';
import { Contract } from '../../../core/models/contract.model';
import { ContractStatusLabelPipe } from '../../../shared/pipes/contract-status-label.pipe';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ContractStatusLabelPipe],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss',
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private cdr = inject(ChangeDetectorRef);

  customer: CustomerDetail | null = null;
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Cliente no encontrado.';
      return;
    }

    this.isLoading = true;
    this.customerService.getCustomerById(id).subscribe({
      next: (response) => {
        this.customer = (response.data ?? response) as CustomerDetail;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.status === 404
          ? 'Cliente no encontrado.'
          : 'No se pudo cargar la ficha del cliente.';
        this.customer = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get contracts(): Contract[] {
    return this.customer?.contracts ?? [];
  }

  get displayName(): string {
    return this.customer?.nombre || this.customer?.name || 'Cliente';
  }

  get documentLabel(): string {
    const type = this.customer?.tipo_documento || this.customer?.document_type || 'CC';
    const number = this.customer?.documento || this.customer?.document_number || '--';
    return `${type} ${number}`;
  }

  lotLabel(contract: Contract): string {
    return contract.lot?.number || contract.lot?.name || (contract.lot_id ? `Lote ${contract.lot_id}` : 'Sin lote');
  }

  projectLabel(contract: Contract): string {
    return contract.project?.name || contract.lot?.project?.name || 'Sin proyecto';
  }
}
