import { autoSplitDownPayment } from './split-down-payment';

describe('autoSplitDownPayment', () => {
  it('parte inicial primero y el resto a cuotas', () => {
    expect(autoSplitDownPayment(2500000, 2000000)).toEqual({
      to_down_payment: 2000000,
      to_installments: 500000,
    });
  });

  it('devuelve null si el monto no alcanza para las dos partes', () => {
    expect(autoSplitDownPayment(2000000, 2000000)).toBeNull();
    expect(autoSplitDownPayment(500000, 2000000)).toBeNull();
    expect(autoSplitDownPayment(1000, 0)).toBeNull();
    expect(autoSplitDownPayment(0, 1000)).toBeNull();
  });
});
