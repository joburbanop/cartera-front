export interface AmortizationInstallment {
  id?: number;
  contract_id?: number;
  installment_number?: number;
  due_date?: string | Date | null;
  fecha_vencimiento?: string | Date | null;
  payment_date?: string | null;
  receipt_number?: string | null;
  installment_value?: number | string;
  extra_payment?: number | string;
  interest_value?: number | string;
  principal_value?: number | string;
  interest_paid?: number | string;
  principal_paid?: number | string;
  quota_debt?: number | string;
  remaining_balance?: number | string;
  projected_balance?: number | string;
  status?: string;
  overdue_balance?: number;
  amount_paid?: number;
}
