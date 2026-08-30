import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  private readonly titleState = signal<string | null>(null);
  readonly title = this.titleState.asReadonly();

  set(title: string | null): void {
    this.titleState.set(title);
  }

  clear(): void {
    this.titleState.set(null);
  }
}
