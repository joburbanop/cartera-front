export function insertAtFront<T>(list: T[], item: T, maxLength?: number): T[] {
  const next = [item, ...list];
  if (maxLength && next.length > maxLength) {
    return next.slice(0, maxLength);
  }

  return next;
}

export function replaceById<T extends { id?: number | null }>(list: T[], item: T): T[] {
  if (item.id == null) {
    return list;
  }

  return list.map((row) => (row.id === item.id ? { ...row, ...item } : row));
}

export function removeById<T extends { id?: number | null }>(list: T[], id: number): T[] {
  return list.filter((row) => row.id !== id);
}

export function motionDurationMs(durationMs: number): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }

  return durationMs;
}

export class LeavingTracker {
  private readonly ids = new Set<number>();
  private readonly timers = new Map<number, number>();

  mark(id: number | null | undefined, onStart: () => void, onDone: () => void, durationMs = 160): void {
    if (id == null) {
      onDone();
      return;
    }

    const previous = this.timers.get(id);
    if (previous) {
      window.clearTimeout(previous);
    }

    this.ids.add(id);
    onStart();

    const timer = window.setTimeout(() => {
      this.ids.delete(id);
      this.timers.delete(id);
      onDone();
    }, motionDurationMs(durationMs));

    this.timers.set(id, timer);
  }

  has(id: number | null | undefined): boolean {
    return id != null && this.ids.has(id);
  }
}

export class JustChangedTracker {
  private readonly ids = new Set<number>();
  private readonly timers = new Map<number, number>();

  mark(id: number | null | undefined, onChange: () => void, durationMs = 1000): void {
    if (id == null) {
      return;
    }

    const previous = this.timers.get(id);
    if (previous) {
      window.clearTimeout(previous);
    }

    this.ids.add(id);
    onChange();

    const timer = window.setTimeout(() => {
      this.ids.delete(id);
      this.timers.delete(id);
      onChange();
    }, durationMs);

    this.timers.set(id, timer);
  }

  has(id: number | null | undefined): boolean {
    return id != null && this.ids.has(id);
  }
}
