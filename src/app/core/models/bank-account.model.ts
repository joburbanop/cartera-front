export interface BankAccount {
  id?: number;
  bank_name?: string;
  account_number?: string;
  account_type?: string | { value?: string };
  holder_name?: string;
  is_active?: boolean;
}
