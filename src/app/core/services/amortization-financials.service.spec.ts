import { AmortizationFinancialsService } from './amortization-financials.service';
import { AmortizationInstallment } from '../models/amortization-installment.model';
import golden from '../../../testing/golden/amortization-display.json';

describe('AmortizationFinancialsService display', () => {
  const service = new AmortizationFinancialsService();

  it.each(golden.cases)('$id', (c) => {
    const fee: AmortizationInstallment = {
      installment_number: c.installment_number,
      interest_paid: c.interest_paid,
      principal_paid: c.principal_paid,
      interest_value: c.interest_value,
      principal_value: c.principal_value,
      quota_debt: c.quota_debt,
    };

    expect(service.displayedInterest(fee)).toBe(c.expected_interest);
    expect(service.displayedAmortization(fee)).toBe(c.expected_amortization);
  });
});
