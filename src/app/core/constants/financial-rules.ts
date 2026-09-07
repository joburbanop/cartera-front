/**
 * Tolerancias de dinero del motor de cartera.
 *
 * Son TRES conceptos distintos; no los trates como el mismo umbral:
 * - quotaCompletionResidual ($500): condonación de residual para dar por
 *   cerrada la cuota inicial o una cuota regular.
 * - absorbedSurplus ($2): excedente que se absorbe sin generar abono extra
 *   ni error.
 * - imputationDust ($1): polvo de centavos al imputar interés→capital.
 *
 * Deben coincidir con cartera-api `App\Support\FinancialRules` y con
 * `tests/fixtures/golden/financial-rules.json`.
 */
export const FinancialRules = {
  quotaCompletionResidual: 500,
  absorbedSurplus: 2,
  imputationDust: 1,
  pmtRounding: 'half_up_2',
} as const;

/** Half-up a 2 decimales; misma regla que `App\Support\FinancialRules::roundHalfUp2`. */
export function roundHalfUp2(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const sign = value < 0 ? -1 : 1;
  const expanded = Math.abs(value).toFixed(10);
  const [wholeRaw, fractionRaw = ''] = expanded.split('.');
  const fraction = fractionRaw.padEnd(10, '0');
  let units = Number.parseInt(wholeRaw, 10);
  let cents = Number.parseInt(fraction.slice(0, 2), 10);

  if (fraction.charAt(2) >= '5') {
    cents += 1;
  }

  if (cents >= 100) {
    units += 1;
    cents -= 100;
  }

  return sign * Number.parseFloat(`${units}.${cents.toString().padStart(2, '0')}`);
}
