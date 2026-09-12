export interface Withdrawal {
  id: number;
  contract_id: number;
  type: 'preventa' | 'venta';
  request_date: string;
  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario';

  observations: string | null;

  sale_price: string;
  contributions: string;
  standard_retention_percentage: string;
  authorized_retention_percentage: string;
  penalty_amount: string;
  refund_balance: string;

  modification_justification: string | null;

  status: 'pending' | 'completed';

  created_by: number | null;
  created_at: string;
  updated_at: string;
}