import { FinancialService } from './financial.service';
import golden from '../../../testing/golden/french-pmt.json';

describe('FinancialService', () => {
  const service = new FinancialService();

  it('declara half-up a 2 decimales en el vector dorado', () => {
    expect(golden.rounding).toBe('half_up_2');
  });

  it.each(golden.cases)('PMT $id', (c) => {
    expect(
      service.calculateFrenchQuota(
        Number(c.principal),
        c.months,
        Number(c.monthly_rate_percent),
      ),
    ).toBe(Number(c.pmt));
  });
});
