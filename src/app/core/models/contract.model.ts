import { Customer } from './customer.model';
import { Lot } from './lot.model';
import { Project } from './project.model';
import { Transaction } from './transaction.model';

export interface Contract {
  id?: number;
  contract_number?: string;
  customer_id?: number;
  lot_id?: number;
  seller_name?: string | null;
  sale_price?: number | string;
  down_payment_pactada?: number | string;
  term_months?: number;
  interest_rate?: number | string;
  start_date?: string | null;
  initial_payment_date?: string | null;
  first_installment_date?: string | null;
  regular_payment_start_date?: string | null;
  preventa_installments_count?: number;
  status?: string;
  customer?: Customer;
  customer_name?: string;
  lot?: Lot;
  project?: Project;
  transactions?: Transaction[];
}
