import { AmortizationFinancialsService } from './amortization-financials.service';
import { AmortizationInstallment } from '../models/amortization-installment.model';
import { Contract } from '../models/contract.model';
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

describe('AmortizationFinancialsService initialFeePaid', () => {
  const service = new AmortizationFinancialsService();
  const initial: AmortizationInstallment = {
    installment_number: 0,
    installment_value: 20000000,
    principal_value: 20000000,
    quota_debt: 200000,
    status: 'partial',
    amount_paid: 19800000,
  };
  const plan = [initial];

  it('suma las allocations a inicial además de las transacciones down_payment', () => {
    const contract: Contract = {
      down_payment_pactada: 20000000,
      transactions: [
        { transaction_type: 'down_payment', amount: 19800000 },
        {
          transaction_type: 'regular_payment',
          amount: 2100000,
          allocations: [
            { target: 'down_payment', target_label: 'Cuota inicial', installment_number: null, amount: 200000, principal: 200000, interest: 0 },
            { target: 'installment', target_label: 'Cuota regular', installment_number: 1, amount: 1715402.83, principal: 944242.83, interest: 771160 },
            { target: 'capital', target_label: 'Abono a capital', installment_number: null, amount: 184597.17, principal: 184597.17, interest: 0 },
          ],
        },
      ],
    };

    expect(service.initialFeePaid(plan, contract)).toBe(20000000);
    expect(service.getFeeStatus(initial, plan, contract)).toBe('paid');
    expect(service.initialFeeBalance(plan, contract)).toBe(0);
  });

  it('sin allocations sigue contando solo las transacciones de cuota inicial', () => {
    const contract: Contract = {
      down_payment_pactada: 20000000,
      transactions: [{ transaction_type: 'down_payment', amount: 19800000 }],
    };

    expect(service.initialFeePaid(plan, contract)).toBe(19800000);
    expect(service.getFeeStatus(initial, plan, contract)).toBe('partial');
  });

  it('no duplica un down_payment que ya trae allocation a inicial', () => {
    const contract: Contract = {
      down_payment_pactada: 20000000,
      transactions: [
        {
          transaction_type: 'down_payment',
          amount: 19800000,
          allocations: [
            { target: 'down_payment', target_label: 'Cuota inicial', installment_number: 0, amount: 19800000, principal: 19800000, interest: 0 },
          ],
        },
      ],
    };

    expect(service.initialFeePaid(plan, contract)).toBe(19800000);
  });
});
