export interface Customer {
  id?: number;

  name?: string;

  nombre?: string;

  first_name?: string;

  document_number?: string;

  documento?: string;

  document?: string;

  phone?: string | null;

  telefono?: string;

  email?: string | null;

  document_type?: string;

  tipo_documento?: string;

  address?: string | null;

  direccion?: string | null;

  city?: string | null;

  ciudad?: string | null;

  lote?: string | null;

  cantidad_contratos?: number;

  estadoCartera?: 'al_dia' | 'vencida' | 'sin_contrato' | string;

  deleted_at?: string | null;

  pivot?: { role?: string };
}

export interface CreateCustomerPayload {
  document_type: string;

  document_number: string;

  name: string;

  phone: string;

  email?: string | null;

  address?: string | null;

  city?: string | null;
}