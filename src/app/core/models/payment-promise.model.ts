export type PaymentPromiseStatus = 'pagada' | 'parcial' | 'vencida' | 'pendiente';

export interface PaymentPromise {
  id: number;
  contract_id: number;
  payment_number: number;
  expected_date: string;
  expected_amount: number | string;
  description: string | null;
  is_paid: boolean;
  status?: PaymentPromiseStatus | string;
  remaining_amount?: number | string;
}
