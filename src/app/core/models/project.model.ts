import { BankAccount } from './bank-account.model';

export interface Project {
  id?: number;
  name?: string;
  description?: string | null;
  location?: string | null;
  status?: string;
  created_by?: number | null;
  updated_by?: number | null;
  bank_accounts?: BankAccount[];
  lots?: unknown[];
}
