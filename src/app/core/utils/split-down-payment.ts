export interface DownPaymentSplit {
  to_down_payment: number;
  to_installments: number;
}

/**
 * Auto-reparto de un solo movimiento: la inicial hasta su pendiente,
 * el resto a cuotas. Null si no hay las dos partes (no hay mixto).
 */
export function autoSplitDownPayment(
  amount: number,
  pendingInitial: number,
): DownPaymentSplit | null {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safePending = Math.max(0, Number(pendingInitial) || 0);
  const toDown = Math.min(safePending, safeAmount);
  const toRegulars = Math.max(0, safeAmount - toDown);

  if (toDown <= 0 || toRegulars <= 0) {
    return null;
  }

  return {
    to_down_payment: toDown,
    to_installments: toRegulars,
  };
}
