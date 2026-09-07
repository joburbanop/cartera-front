export type AmortizationStatus = 'pending' | 'paid' | 'partial' | 'overdue';

export const AmortizationStatusLabels: Record<AmortizationStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  partial: 'Parcial',
  overdue: 'Vencida',
};

export const AmortizationStatusBadgeClass: Record<AmortizationStatus, string> = {
  pending: 'badge-pending',
  paid: 'badge-paid',
  partial: 'badge-partial',
  overdue: 'badge-overdue',
};

const LEGACY_STATUS_MAP: Record<string, AmortizationStatus> = {
  pending: 'pending',
  paid: 'paid',
  partial: 'partial',
  overdue: 'overdue',
  sin_pagar: 'pending',
  pagada: 'paid',
  parcial: 'partial',
  vencida: 'overdue',
};

export function toAmortizationStatus(
  value: unknown,
  fallback: AmortizationStatus = 'pending',
): AmortizationStatus {
  const normalized = String(value ?? '').trim().toLowerCase();
  return LEGACY_STATUS_MAP[normalized] ?? fallback;
}

export function isPaidStatus(value: unknown): boolean {
  return toAmortizationStatus(value) === 'paid';
}

export function isPartialStatus(value: unknown): boolean {
  return toAmortizationStatus(value) === 'partial';
}

export function isOverdueStatus(value: unknown): boolean {
  return toAmortizationStatus(value) === 'overdue';
}

export function amortizationStatusLabel(value: unknown): string {
  return AmortizationStatusLabels[toAmortizationStatus(value)];
}

/**
 * True si la fecha de vencimiento es anterior a hoy
 * (comparación por día calendario local). El día de vencimiento no es mora.
 */
export function isVencida(dueDate: string | Date | null | undefined): boolean {
  const due = startOfLocalDay(dueDate);
  if (!due) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

function startOfLocalDay(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  fallback.setHours(0, 0, 0, 0);
  return fallback;
}
