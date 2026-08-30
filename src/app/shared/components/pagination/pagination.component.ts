import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    const size = this.pageSize > 0 ? this.pageSize : 10;
    return Math.max(1, Math.ceil(this.totalItems / size));
  }

  get isFirstPage(): boolean {
    return this.currentPage <= 1;
  }

  get isLastPage(): boolean {
    return this.currentPage >= this.totalPages;
  }

  goToPrevious(): void {
    if (this.isFirstPage) {
      return;
    }
    this.pageChange.emit(this.currentPage - 1);
  }

  goToNext(): void {
    if (this.isLastPage) {
      return;
    }
    this.pageChange.emit(this.currentPage + 1);
  }
}
