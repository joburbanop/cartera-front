import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  @Input() variant: 'line' | 'kpi' | 'table' | 'chart' | 'activity' = 'line';
  @Input() rows = 6;
  @Input() columns = 4;
  @Input() width = '100%';
  @Input() height = '0.85rem';

  get rowIndexes(): number[] {
    return Array.from({ length: Math.max(1, this.rows) }, (_, index) => index);
  }

  get colIndexes(): number[] {
    return Array.from({ length: Math.max(1, this.columns) }, (_, index) => index);
  }

  colWidth(index: number): string {
    const widths = ['72%', '58%', '46%', '64%', '40%'];
    return widths[index % widths.length];
  }
}
