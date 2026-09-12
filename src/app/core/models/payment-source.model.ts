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
  /** Cuota (u origen) de la que llegó este aporte como sobrante. Vacío en el origen del recibo. */
  came_from?: PaymentSourceAlsoApplied[];
  /** Imputaciones del mismo recibo, en orden. Para leer el recorrido, no para sumar. */
  route?: PaymentSourceAlsoApplied[];
}
