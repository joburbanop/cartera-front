export interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_type: 'savings' | 'checking';
  is_active: boolean;
  holder_name: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
}

export interface CreateBankAccountPayload {
  bank_name: string;
  account_number: string;
  account_type: 'savings' | 'checking';
  holder_name: string;
}
export interface UpdateBankAccountPayload {
  holder_name: string;
  is_active: boolean;
}