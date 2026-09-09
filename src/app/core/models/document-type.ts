/**
 * Tipos de documento que acepta el API (enum `DocumentType` del backend).
 * Se comparten entre el alta de cliente y la creación rápida desde contrato
 * para que las dos ofrezcan exactamente las mismas opciones.
 */
export type DocumentTypeCode = 'CC' | 'CE' | 'NIT' | 'PASSPORT';

export interface DocumentTypeOption {
  code: DocumentTypeCode;
  label: string;
}

export const DOCUMENT_TYPES: readonly DocumentTypeOption[] = [
  { code: 'CC', label: 'CC — Cédula de ciudadanía' },
  { code: 'CE', label: 'CE — Cédula de extranjería' },
  { code: 'NIT', label: 'NIT — Empresa' },
  { code: 'PASSPORT', label: 'Pasaporte' },
] as const;

export const DEFAULT_DOCUMENT_TYPE: DocumentTypeCode = 'CC';

/** El NIT identifica a una empresa, no a una persona. */
export function isCompanyDocument(code: string | null | undefined): boolean {
  return code === 'NIT';
}
