import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  TrailHub,
  createNavSessionId,
  navTrailState,
  parseNavTrailState,
} from '../utils/navigation-trail';

@Injectable({
  providedIn: 'root',
})
export class NavigationTrailService {
  private readonly router = inject(Router);
  readonly sessionId = createNavSessionId();
  private readonly hubsState = signal<TrailHub[] | null>(null);
  readonly hubs = this.hubsState.asReadonly();

  constructor() {
    this.capture(this.pickState());
    const events = this.router.events;
    if (events && typeof events.pipe === 'function') {
      events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.capture(this.pickState());
      });
    }
  }

  state(hubs: readonly TrailHub[]): Record<string, unknown> {
    return navTrailState(this.sessionId, hubs);
  }

  extras(hubs: readonly TrailHub[]): { state: Record<string, unknown> } {
    return { state: this.state(hubs) };
  }

  capture(raw: unknown): void {
    this.hubsState.set(parseNavTrailState(raw, this.sessionId));
  }

  captureFromRouter(): void {
    this.capture(this.pickState());
  }

  private pickState(): unknown {
    try {
      return this.router.currentNavigation?.()?.extras.state
        ?? this.router.lastSuccessfulNavigation?.()?.extras.state
        ?? this.router.getCurrentNavigation?.()?.extras.state
        ?? (typeof history !== 'undefined' ? history.state : null);
    } catch {
      return null;
    }
  }
}
