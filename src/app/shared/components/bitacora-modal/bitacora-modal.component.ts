import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ActivityEntry, ActivitySubjectType } from '../../../core/models/activity-entry.model';
import { ActivityService } from '../../../core/services/activity.service';
import { BitacoraComponent } from '../bitacora/bitacora.component';

@Component({
  selector: 'app-bitacora-modal',
  standalone: true,
  imports: [CommonModule, BitacoraComponent],
  templateUrl: './bitacora-modal.component.html',
  styleUrl: './bitacora-modal.component.scss',
})
export class BitacoraModalComponent implements OnChanges {
  private activityService = inject(ActivityService);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() title = 'Bitácora';
  @Input() subjectType: ActivitySubjectType | null = null;
  @Input() subjectId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  entries: ActivityEntry[] = [];
  isLoading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen || !this.subjectType || !this.subjectId) {
      return;
    }

    if (changes['isOpen'] || changes['subjectType'] || changes['subjectId']) {
      this.load();
    }
  }

  close(): void {
    this.closed.emit();
  }

  private load(): void {
    if (!this.subjectType || !this.subjectId) {
      return;
    }

    this.isLoading = true;
    this.activityService.getActivity(this.subjectType, this.subjectId).subscribe({
      next: (response) => {
        this.entries = this.unwrap(response);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.entries = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private unwrap(response: unknown): ActivityEntry[] {
    if (Array.isArray(response)) {
      return response as ActivityEntry[];
    }

    const payload = response && typeof response === 'object' && 'data' in response
      ? (response as { data: unknown }).data
      : [];

    return Array.isArray(payload) ? (payload as ActivityEntry[]) : [];
  }
}
