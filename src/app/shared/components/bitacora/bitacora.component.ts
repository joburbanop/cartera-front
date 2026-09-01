import { CommonModule, DatePipe, KeyValuePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivityEntry } from '../../../core/models/activity-entry.model';

export type BitacoraEventKind = 'pago' | 'fecha' | 'creacion' | 'edicion';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, DatePipe, KeyValuePipe],
  templateUrl: './bitacora.component.html',
  styleUrl: './bitacora.component.scss',
})
export class BitacoraComponent {
  @Input() title = 'Actividad reciente';
  @Input() entries: ActivityEntry[] = [];
  @Input() isLoading = false;
  @Input() emptyMessage = 'Sin movimientos registrados todavía';

  trackById(_index: number, entry: ActivityEntry): number {
    return entry.id;
  }

  eventKind(entry: ActivityEntry): BitacoraEventKind {
    const description = (entry.description ?? '').toLowerCase();
    const properties = entry.properties ?? {};

    if (properties['transaction_id'] != null || description.includes('registró un pago') || description.includes('registro un pago')) {
      return 'pago';
    }

    if (properties['installment_number'] != null || description.includes('fecha de vencimiento')) {
      return 'fecha';
    }

    if (description.startsWith('creó') || description.startsWith('creo')) {
      return 'creacion';
    }

    return 'edicion';
  }

  kindLabel(kind: BitacoraEventKind): string {
    switch (kind) {
      case 'pago':
        return 'Pago';
      case 'fecha':
        return 'Fecha';
      case 'creacion':
        return 'Alta';
      default:
        return 'Edición';
    }
  }

  kindBadge(kind: BitacoraEventKind): string {
    switch (kind) {
      case 'pago':
        return 'badge-pill--success';
      case 'fecha':
        return 'badge-pill--warning';
      case 'creacion':
        return 'badge-pill--neutral';
      default:
        return 'badge-pill';
    }
  }

  initials(name?: string | null): string {
    const parts = (name || 'Sistema').trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    return (parts[0] || 'S').slice(0, 2).toUpperCase();
  }

  relativeTime(iso?: string | null): string {
    if (!iso) {
      return '';
    }

    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return '';
    }

    const diffMs = Date.now() - then;
    const diffMin = Math.round(diffMs / 60000);

    if (Math.abs(diffMin) < 1) {
      return 'ahora';
    }

    if (diffMin > 0 && diffMin < 60) {
      return diffMin === 1 ? 'hace 1 minuto' : `hace ${diffMin} minutos`;
    }

    const diffHours = Math.round(diffMin / 60);
    if (diffMin > 0 && diffHours < 24) {
      return diffHours === 1 ? 'hace 1 hora' : `hace ${diffHours} horas`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) {
      return 'ayer';
    }

    if (diffDays > 1 && diffDays < 7) {
      return `hace ${diffDays} días`;
    }

    if (diffMin < 0 && Math.abs(diffMin) < 60) {
      return Math.abs(diffMin) === 1 ? 'en 1 minuto' : `en ${Math.abs(diffMin)} minutos`;
    }

    if (diffHours < 0 && Math.abs(diffHours) < 24) {
      return Math.abs(diffHours) === 1 ? 'en 1 hora' : `en ${Math.abs(diffHours)} horas`;
    }

    return new Date(iso).toLocaleDateString('es-CO');
  }

  hasFieldChanges(entry: ActivityEntry): boolean {
    return this.keyCount(entry.changes?.before) > 0 || this.keyCount(entry.changes?.after) > 0;
  }

  hasProperties(entry: ActivityEntry): boolean {
    return this.keyCount(entry.properties) > 0;
  }

  hasDetails(entry: ActivityEntry): boolean {
    return this.hasFieldChanges(entry) || this.hasProperties(entry);
  }

  private keyCount(value?: Record<string, unknown> | null): number {
    return Object.keys(value ?? {}).length;
  }
}
