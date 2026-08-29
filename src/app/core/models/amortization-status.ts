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
 * True si la fecha de vencimiento es estrictamente anterior a hoy
 * (comparación por día, sin horas).
 */
export function isVencida(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limitDate = new Date(dueDate);
  limitDate.setHours(0, 0, 0, 0);

  return limitDate < today;
}
