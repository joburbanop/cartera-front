export interface LifeSheetHeader {
  lot_number: string | null;
  sale_price: string;
  financed_value: string;
  financed_value_basis: 'sale_price' | 'commercial_promises' | 'french_pmt';
  area_m2: string | null;
  price_m2: string | null;
  down_payment: string;
  monthly_quota: string | null;
  customer_name: string;
  document_number: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  term_months: number;
  seller_name: string | null;
  is_special_lot: boolean;
  is_custom_plan: boolean;
  note: string;
}

export interface LifeSheetRow {
  transaction_id: number;
  date: string | null;
  concept: string;
  receipt_number: string | null;
  efectivo: string;
  bancolombia: string;
  occidente: string;
  amount: string;
  payment_method: string | null;
  /** Acumulado pagado hasta esta fila, inclusive. */
  total_paid: string;
  balance: string;
  /** false en cobros revertidos y en la fila de reversa: no mueven Total Pagado/Saldo. */
  affects_running_total?: boolean;
  notes: string | null;
  amortization_application: Array<{
    installment_number: number;
    principal_paid: string;
    interest_paid: string;
    extra_payment: string;
  }>;
  /**
   * Reparto de un pago que cubrió a la vez cuota inicial y cuota regular.
   * Vacío en los pagos de un solo destino.
   */
  allocations?: Array<{
    target: 'down_payment' | 'installment' | 'capital';
    target_label: string;
    installment_number: number | null;
    amount: string;
    principal: string;
    interest: string;
  }>;
}

export interface LifeSheetSummary {
  collected: string;
  /** Parte del total pagado que cubrió intereses. */
  interest_paid: string;
  /** Parte del total pagado que abonó capital, incluida la cuota inicial. */
  principal_paid: string;
  /** Recaudado que aún no está imputado a interés ni capital. */
  unimputed: string;
  life_sheet_balance: string;
  outstanding_capital: string;
  criteria_gap: string;
  criteria_gap_label: string;
  criteria_gap_hint: string;
  amortization_note: string;
  life_sheet_note: string;
}

export interface LifeSheet {
  header: LifeSheetHeader;
  rows: LifeSheetRow[];
  summary: LifeSheetSummary;
}
