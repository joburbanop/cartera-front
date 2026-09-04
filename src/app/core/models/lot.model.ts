import { Project } from './project.model';

export interface Lot {
  id?: number;
  project_id?: number;
  number?: string;
  name?: string;
  area_m2?: number | string;
  price_m2?: number | string;
  list_price?: number | string;
  status?: string | { value?: string; name?: string };
  type?: string;
  folio_matricula?: string | null;
  ficha_catastral?: string | null;
  contracts_count?: number;
  contracts?: { id?: number }[];
  project?: Project;
}
