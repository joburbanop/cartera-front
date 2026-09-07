import { FinancialRules, roundHalfUp2 } from './financial-rules';
import golden from '../../../testing/golden/financial-rules.json';

describe('FinancialRules', () => {
  it('coincide con el fixture dorado', () => {
    expect(FinancialRules.quotaCompletionResidual).toBe(Number(golden.quota_completion_residual));
    expect(FinancialRules.absorbedSurplus).toBe(Number(golden.absorbed_surplus));
    expect(FinancialRules.imputationDust).toBe(Number(golden.imputation_dust));
    expect(FinancialRules.pmtRounding).toBe(golden.pmt_rounding);
  });

  it('redondea half-up a 2 decimales', () => {
    expect(roundHalfUp2(33.995)).toBe(34);
    expect(roundHalfUp2(1.225)).toBe(1.23);
    expect(roundHalfUp2(-1.225)).toBe(-1.23);
  });
});
