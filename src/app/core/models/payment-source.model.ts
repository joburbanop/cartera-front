export interface PaymentSourceAlsoApplied {
  target_label: string;
  installment_number: number | null;
  amount: number | string;
}

export interface PaymentSource {
  transaction_id: number;
  transaction_date: string | null;
  receipt_number: string | null;
  amount: number | string;
  principal?: number | string;
  interest?: number | string;
  also_applied_to?: PaymentSourceAlsoApplied[];
}
