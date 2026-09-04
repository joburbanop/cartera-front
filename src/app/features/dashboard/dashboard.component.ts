import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AppRoles } from '../../core/models/app-roles';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ChartCardComponent, ChartCardDataset } from '../../shared/components/chart-card/chart-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ChartCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
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
    { key: 'abogado', label: 'Renegociación', modifier: 'badge-pill--danger' },
    { key: 'separado', label: 'Separado', modifier: 'badge-pill--neutral' },
  ];

  recaudoLabels: string[] = [];
  recaudoDatasets: ChartCardDataset[] = [{ label: 'Recaudo', data: [] }];
  carteraLabels = ['Al día', 'Vencidas'];
  carteraDatasets: ChartCardDataset[] = [{ data: [0, 0], backgroundColor: ['#047857', '#b91c1c'] }];
  contratosLabels = ['Activo', 'Preventa', 'Terminado', 'Rescindido'];
  contratosDatasets: ChartCardDataset[] = [{ data: [0, 0, 0, 0], backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c'] }];
  lotesLabels = ['Disponible', 'Preventa', 'Vendido', 'Renegociación', 'Separado'];
  lotesDatasets: ChartCardDataset[] = [{ data: [0, 0, 0, 0, 0], backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c', '#347769'] }];

  get userName(): string {
    return this.authService.getUserName() ?? '';
  }

  canViewCharts(): boolean {
    return this.authService.hasRole(AppRoles.SOCIO_GERENCIA)
      || this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  ngOnInit(): void {
    this.loadProyectosActivos();
    this.loadContratosPorEstado();
    this.loadLotesPorEstado();
    this.loadClientesTotales();
    this.loadCarteraEnMora();
    this.loadRecaudoReciente();
    this.loadProximosVencimientos();
    this.loadActividadReciente();

    if (this.canViewCharts()) {
      this.loadRecaudoMensual();
      this.loadCarteraVencidaResumen();
    }
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

  private loadProyectosActivos(): void {
    this.dashboardService.getProyectosActivos().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, any>;
        this.proyectosActivos = Number(payload['total_proyectos_activos'] ?? 0);
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyectosActivos = 0;
        this.cdr.detectChanges();
      },
    });
  }

  private loadClientesTotales(): void {
    this.dashboardService.getClientesTotales().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, any>;
        this.totalClientes = Number(payload['total_clientes'] ?? 0);
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

  private loadRecaudoMensual(): void {
    this.dashboardService.getRecaudoMensual().subscribe({
      next: (response) => {
        const rows = this.unwrapList(response) as Array<{ mes?: string; total?: string | number }>;
        this.recaudoLabels = rows.map((row) => this.monthLabel(String(row.mes ?? '')));
        this.recaudoDatasets = [{
          label: 'Recaudo',
          data: rows.map((row) => Number(row.total ?? 0)),
        }];
        this.cdr.detectChanges();
      },
      error: () => {
        this.recaudoLabels = [];
        this.recaudoDatasets = [{ label: 'Recaudo', data: [] }];
        this.cdr.detectChanges();
      },
    });
  }

  private loadCarteraVencidaResumen(): void {
    this.dashboardService.getCarteraVencidaResumen().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, number>;
        this.carteraDatasets = [{
          data: [Number(payload['al_dia'] ?? 0), Number(payload['vencidas'] ?? 0)],
          backgroundColor: ['#047857', '#b91c1c'],
        }];
        this.cdr.detectChanges();
      },
      error: () => {
        this.carteraDatasets = [{ data: [0, 0], backgroundColor: ['#047857', '#b91c1c'] }];
        this.cdr.detectChanges();
      },
    });
  }

  private loadContratosPorEstado(): void {
    this.dashboardService.getContratosPorEstado().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, number>;
        this.contratosActivos = Number(payload['activo'] ?? 0);
        this.contratosDatasets = [{
          data: [
            Number(payload['activo'] ?? 0),
            Number(payload['preventa_inactiva'] ?? 0),
            Number(payload['terminado'] ?? 0),
            Number(payload['rescindido'] ?? 0),
          ],
          backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c'],
        }];
        this.cdr.detectChanges();
      },
      error: () => {
        this.contratosActivos = 0;
        this.contratosDatasets = [{ data: [0, 0, 0, 0], backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c'] }];
        this.cdr.detectChanges();
      },
    });
  }

  private loadLotesPorEstado(): void {
    this.dashboardService.getLotesPorEstado().subscribe({
      next: (response) => {
        const payload = this.unwrapPayload(response) as Record<string, number>;
        this.lotsByStatus = {
          disponible: Number(payload['disponible'] ?? 0),
          reservado: 0,
          preventa: Number(payload['preventa'] ?? 0),
          vendido: Number(payload['vendido'] ?? 0),
          abogado: Number(payload['abogado'] ?? 0),
          separado: Number(payload['separado'] ?? 0),
        };
        this.totalAvailableLots = this.lotsByStatus['disponible'];
        this.totalLots = Object.values(payload).reduce((sum, value) => sum + Number(value ?? 0), 0);
        this.lotesDatasets = [{
          data: [
            Number(payload['disponible'] ?? 0),
            Number(payload['preventa'] ?? 0),
            Number(payload['vendido'] ?? 0),
            Number(payload['abogado'] ?? 0),
            Number(payload['separado'] ?? 0),
          ],
          backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c', '#347769'],
        }];
        this.cdr.detectChanges();
      },
      error: () => {
        this.totalLots = 0;
        this.totalAvailableLots = 0;
        this.lotsByStatus = { disponible: 0, reservado: 0, preventa: 0, vendido: 0, abogado: 0, separado: 0 };
        this.lotesDatasets = [{ data: [0, 0, 0, 0, 0], backgroundColor: ['#047857', '#b45309', '#475569', '#b91c1c', '#347769'] }];
        this.cdr.detectChanges();
      },
    });
  }

  private monthLabel(mes: string): string {
    const [year, month] = mes.split('-').map(Number);

    if (!year || !month) {
      return mes;
    }

    return new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
      month: 'short',
      year: 'numeric',
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
