import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  type: ToastType;
  durationMs: number;
  leaving: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsState = signal<Toast[]>([]);
  private readonly timers = new Map<number, number[]>();
  private nextId = 1;
  private readonly dismissMs = 4000;
  private readonly leaveMs = 220;

  readonly toasts = this.toastsState.asReadonly();

  show(title: string, type: ToastType = 'success', description?: string): void {
    const toast: Toast = {
      id: this.nextId++,
      title,
      description,
      type,
      durationMs: this.dismissMs,
      leaving: false,
    };

    this.toastsState.update((current) => [toast, ...current]);

    const autoTimer = window.setTimeout(() => this.dismiss(toast.id), toast.durationMs);
    this.timers.set(toast.id, [autoTimer]);
  }

  dismiss(id: number): void {
    const toast = this.toastsState().find((item) => item.id === id);
    if (!toast || toast.leaving) {
      return;
    }

    this.clearTimers(id);
    this.toastsState.update((current) =>
      current.map((item) => (item.id === id ? { ...item, leaving: true } : item))
    );

    const leaveTimer = window.setTimeout(() => {
      this.toastsState.update((current) => current.filter((item) => item.id !== id));
      this.timers.delete(id);
    }, this.leaveMs);

    this.timers.set(id, [leaveTimer]);
  }

  private clearTimers(id: number): void {
    const timers = this.timers.get(id) ?? [];
    timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.delete(id);
  }
}
