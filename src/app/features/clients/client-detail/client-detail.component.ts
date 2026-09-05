import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ActivityEntry } from '../../../core/models/activity-entry.model';
import { AppRoles } from '../../../core/models/app-roles';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerDetail, CustomerService } from '../../../core/services/customer.service';
import { unwrapPaginator } from '../../../core/models/api-response';
import { Contract } from '../../../core/models/contract.model';
import { BitacoraComponent } from '../../../shared/components/bitacora/bitacora.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ContractStatusLabelPipe } from '../../../shared/pipes/contract-status-label.pipe';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ContractStatusLabelPipe, BitacoraComponent, PaginationComponent],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss',
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  customer: CustomerDetail | null = null;
  isLoading = false;
  errorMessage = '';
  activityEntries: ActivityEntry[] = [];
  isLoadingActivity = false;
  activityPage = 1;
  activityTotal = 0;
  readonly activityPageSize = 20;

  get canViewBitacora(): boolean {
    return this.authService.hasRole(AppRoles.SOCIO_GERENCIA);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Cliente no encontrado.';
      return;
    }

    this.isLoading = true;
    this.customerService.getCustomerById(id).subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;

        this.customer = (payload ?? null) as CustomerDetail | null;
        this.isLoading = false;
        this.loadActivity();
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

  loadActivity(): void {
    if (!this.canViewBitacora || !this.customer?.id) {
      this.activityEntries = [];
      return;
    }

    this.isLoadingActivity = true;
    this.activityService.getActivity('customer', Number(this.customer.id), this.activityPage, this.activityPageSize).subscribe({
      next: (response) => {
        const page = unwrapPaginator(response);
        this.activityEntries = page.items as ActivityEntry[];
        this.activityTotal = page.total;
        this.activityPage = page.currentPage;
        this.isLoadingActivity = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activityEntries = [];
        this.isLoadingActivity = false;
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
