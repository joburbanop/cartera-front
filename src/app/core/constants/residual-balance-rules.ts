/**
 * Regla 2: residuales menores acumulados.
 * Independiente de FinancialRules.quotaCompletionResidual ($500 de cierre de cuota).
 */
export const ResidualBalanceRules = {
  /** Techo inclusive para clasificar un faltante como residual menor. */
  minorResidualCap: 5000,
  /** Habilita cobrar el acumulado como ítem aparte. No oculta el SUM. */
  collectibleThreshold: 500,
} as const;
