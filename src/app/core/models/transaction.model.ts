/** Etiquetas legibles de los tipos de transacción que expone el API. */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  down_payment: 'Cuota inicial',
  regular_payment: 'Cuota regular',
  extraordinary_payment: 'Abono extraordinario',
  interes_diferido: 'Interés diferido',
  pago_mixto: 'Inicial + cuota',
  refund: 'Devolución',
};

/**
 * Una porción de un pago repartido. La suma de las porciones es igual al
 * `amount` de la transacción, que es lo que vio el banco.
 */
export interface TransactionAllocation {
  target: 'down_payment' | 'installment' | 'capital';
  target_label: string;
  installment_number: number | null;
  amount: number | string;
  principal: number | string;
  interest: number | string;
}

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
  /** Vacío en los pagos de un solo destino. */
  allocations?: TransactionAllocation[];
}
