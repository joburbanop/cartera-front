/**
 * Envoltorios del JSON que realmente llega hoy.
 *
 * `successResponse()` siempre pone el payload en `data`. Los listados paginados
 * de Laravel anidan otra vez (`data.data`). CustomerResource::collection y
 * algunos GET (transacciones) entregan el array directo en `data`.
 * Los componentes siguen unwrappeando con `response.data?.data || response.data || []`.
 *
 * `data` se declara como intersección para que ese unwrap compile tanto si `data`
 * es un array plano como si es un paginator `{ data: T[] }`.
 */
export interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[] & { data?: T[] };
}

export interface ApiResourceResponse<T> {
  status?: string;
  message?: string;
  data?: T;
}
