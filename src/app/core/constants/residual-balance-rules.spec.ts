import { ResidualBalanceRules } from './residual-balance-rules';

describe('ResidualBalanceRules', () => {
  it('no comparte umbrales con FinancialRules y usa techo 5000', () => {
    expect(ResidualBalanceRules.minorResidualCap).toBe(5000);
    expect(ResidualBalanceRules.collectibleThreshold).toBe(500);
  });
});
