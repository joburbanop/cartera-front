export interface Transaction {
  id?: number;
  contract_id?: number;
  transaction_type?: string;
  type?: string;
  amount?: number | string;
  payment_method?: string;
  transaction_date?: string | null;
  created_at?: string | null;
  receipt?: string | null;
  customer_name?: string;
  lot_number?: string;
}
