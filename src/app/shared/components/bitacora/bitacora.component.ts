import { CommonModule, DatePipe, KeyValuePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActivityEntry } from '../../../core/models/activity-entry.model';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, DatePipe, KeyValuePipe],
  templateUrl: './bitacora.component.html',
  styleUrl: './bitacora.component.scss',
})
export class BitacoraComponent {
  @Input() entries: ActivityEntry[] = [];
  @Input() isLoading = false;
  @Input() emptyMessage = 'No hay movimientos registrados todavía.';

  hasDetails(entry: ActivityEntry): boolean {
    const before = Object.keys(entry.changes?.before ?? {}).length > 0;
    const after = Object.keys(entry.changes?.after ?? {}).length > 0;
    const properties = Object.keys(entry.properties ?? {}).length > 0;

    return before || after || properties;
  }
}
