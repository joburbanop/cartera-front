import { Component, ChangeDetectorRef, DestroyRef, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchResults, SearchService } from '../../../core/services/search.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent implements OnInit {
  private searchService = inject(SearchService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  readonly query = new FormControl('', { nonNullable: true });
  isOpen = false;
  isLoading = false;
  lastQuery = '';
  results: SearchResults = { clients: [], contracts: [], lots: [] };

  ngOnInit(): void {
    this.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap((value) => {
        if (value.trim().length < 2) {
          this.isOpen = false;
          this.isLoading = false;
          this.results = { clients: [], contracts: [], lots: [] };
          this.cdr.markForCheck();
        }
      }),
      switchMap((value) => {
        const term = value.trim();
        if (term.length < 2) {
          return of(null);
        }

        this.isLoading = true;
        this.lastQuery = term;
        this.cdr.markForCheck();
        return this.searchService.search(term).pipe(
          catchError(() => of({ clients: [], contracts: [], lots: [] } as SearchResults)),
          finalize(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((results) => {
      if (!results) {
        this.cdr.markForCheck();
        return;
      }

      this.results = results;
      this.isOpen = true;
      this.cdr.markForCheck();
    });
  }

  get hasAnyResults(): boolean {
    return this.results.clients.length > 0
      || this.results.contracts.length > 0
      || this.results.lots.length > 0;
  }

  goToClient(id: number): void {
    void this.router.navigate(['/clientes', id]);
    this.close();
  }

  goToContract(id: number): void {
    void this.router.navigate(['/amortization', id]);
    this.close();
  }

  goToLot(projectId: number | null): void {
    void this.router.navigate(['/lots'], {
      queryParams: projectId != null ? { projectId } : {},
    });
    this.close();
  }

  close(): void {
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
