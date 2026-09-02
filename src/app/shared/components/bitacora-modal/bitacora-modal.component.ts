import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ActivityEntry, ActivitySubjectType } from '../../../core/models/activity-entry.model';
import { ActivityService } from '../../../core/services/activity.service';
import { unwrapPaginator } from '../../../core/models/api-response';
import { BitacoraComponent } from '../bitacora/bitacora.component';
import { PaginationComponent } from '../pagination/pagination.component';

@Component({
  selector: 'app-bitacora-modal',
  standalone: true,
  imports: [CommonModule, BitacoraComponent, PaginationComponent],
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
  currentPage = 1;
  totalItems = 0;
  readonly pageSize = 20;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen || !this.subjectType || !this.subjectId) {
      return;
    }

    if (changes['isOpen'] || changes['subjectType'] || changes['subjectId']) {
      this.currentPage = 1;
      this.load();
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.load();
  }

  close(): void {
    this.closed.emit();
  }

  private load(): void {
    if (!this.subjectType || !this.subjectId) {
      return;
    }

    this.isLoading = true;
    this.activityService.getActivity(this.subjectType, this.subjectId, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        const page = unwrapPaginator(response);
        this.entries = page.items as ActivityEntry[];
        this.totalItems = page.total;
        this.currentPage = page.currentPage;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.entries = [];
        this.totalItems = 0;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
