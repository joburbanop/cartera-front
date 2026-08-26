export interface PaymentPromise {
  id: number;
  contract_id: number;
  payment_number: number;
  expected_date: string;
  expected_amount: number;
  description: string;
  is_paid: boolean;
}
