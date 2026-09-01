import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ContractService } from '../../core/services/contract.service';
import { CustomerService } from '../../core/services/customer.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { LotService } from '../../core/services/lot.service';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private lotService = inject(LotService);
  private contractService = inject(ContractService);
  private customerService = inject(CustomerService);
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  proyectosActivos = 0;
  totalLots = 0;
  totalAvailableLots = 0;
  contratosActivos = 0;
  totalClientes = 0;
  totalVencido = '0';
  totalRecaudado = '0';
  totalPorVencer = '0';
  cantidadPorVencer = 0;
  lotsByStatus: Record<string, number> = {
    disponible: 0,
    reservado: 0,
    preventa: 0,
    vendido: 0,
  };
  actividadReciente: Array<{
    tipo?: string;
    fecha?: string;
    monto?: string;
    referencia?: string;
    cliente?: string;
    contrato?: string;
  }> = [];

  readonly lotStatusPills = [
    { key: 'disponible', label: 'Disponible', modifier: 'badge-pill--success' },
    { key: 'reservado', label: 'Reservado', modifier: 'badge-pill--warning' },
    { key: 'preventa', label: 'Preventa', modifier: 'badge-pill--warning' },
    { key: 'vendido', label: 'Vendido', modifier: 'badge-pill--neutral' },
  ];

  get userName(): string {
    return this.authService.getUserName() ?? '';
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadLots();
    this.loadContracts();
    this.loadCustomers();
    this.loadCarteraEnMora();
    this.loadRecaudoReciente();
    this.loadProximosVencimientos();
    this.loadActividadReciente();
  }

  relativeDate(iso?: string | null): string {
    if (!iso) {
      return '';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - target.getTime()) / 86400000);

    if (diff === 0) {
      return 'Hoy';
    }
    if (diff === 1) {
      return 'Ayer';
    }
    if (diff > 1 && diff < 7) {
      return `Hace ${diff} días`;
    }
    if (diff === -1) {
      return 'Mañana';
    }
    if (diff < 0 && diff > -7) {
      return `En ${Math.abs(diff)} días`;
    }

    return target.toLocaleDateString('es-CO');
  }

  private loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        const projects = this.unwrapList(response);
        this.proyectosActivos = projects.filter((project) => {
          const status = String(project?.status ?? 'active').toLowerCase();
          return status === 'active' || status === 'activo';
        }).length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectosActivos = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private loadLots(): void {
    this.lotService.getAllLots().subscribe({
      next: (response) => {
        const lots = this.unwrapList(response);
        this.totalLots = lots.length;
        this.lotsByStatus = {
          disponible: 0,
          reservado: 0,
          preventa: 0,
          vendido: 0,
        };

        lots.forEach((lot) => {
          const status = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
          const normalized = String(status ?? '').toLowerCase().trim();
          const key = normalized === 'available' ? 'disponible' : normalized;

          if (key in this.lotsByStatus) {
            this.lotsByStatus[key] += 1;
          }
        });

        this.totalAvailableLots = this.lotsByStatus['disponible'];
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalLots = 0;
        this.totalAvailableLots = 0;
        this.lotsByStatus = { disponible: 0, reservado: 0, preventa: 0, vendido: 0 };
        this.cdr.detectChanges();
      },
    });
  }

  private loadContracts(): void {
    this.contractService.getContracts().subscribe({
      next: (response) => {
        const contracts = this.unwrapList(response);
        this.contratosActivos = contracts.filter((contract) => {
          return String(contract?.status ?? '').toLowerCase() === 'activo';
        }).length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.contratosActivos = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (response) => {
        this.totalClientes = this.unwrapList(response).length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalClientes = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCarteraEnMora(): void {
    this.dashboardService.getCarteraEnMora().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, any>;
        this.totalVencido = payload['total_vencido'] ?? '0';
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalVencido = '0';
        this.cdr.detectChanges();
      },
    });
  }

  private loadRecaudoReciente(): void {
    this.dashboardService.getRecaudoReciente().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, any>;
        this.totalRecaudado = payload['total_recaudado'] ?? '0';
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalRecaudado = '0';
        this.cdr.detectChanges();
      },
    });
  }

  private loadProximosVencimientos(): void {
    this.dashboardService.getProximosVencimientos().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, any>;
        this.totalPorVencer = payload['total_por_vencer'] ?? '0';
        this.cantidadPorVencer = Number(payload['cantidad_cuotas'] ?? 0);
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalPorVencer = '0';
        this.cantidadPorVencer = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private loadActividadReciente(): void {
    this.dashboardService.getActividadReciente().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as any[];
        this.actividadReciente = Array.isArray(payload) ? payload : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.actividadReciente = [];
        this.cdr.detectChanges();
      },
    });
  }

  private unwrapPayload(response: any): unknown {
    const payload = response && typeof response === 'object' && 'data' in response ? response.data : response;

    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
      return (payload as { data: unknown }).data;
    }

    return payload ?? {};
  }

  private unwrapList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const payload = response && typeof response === 'object' && 'data' in response ? response.data : response;

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
      return (payload as { data: any[] }).data;
    }

    return [];
  }
}
