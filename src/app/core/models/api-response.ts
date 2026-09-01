/**
 * Envoltorios del JSON que realmente llega hoy.
 *
 * `successResponse()` siempre pone el payload en `data`. Los listados paginados
 * de Laravel anidan otra vez (`data.data`). CustomerResource::collection y
 * algunos GET (transacciones) entregan el array directo en `data`.
 *
 * La forma real del payload es una unión: puede ser un array plano o un paginator
 * con `data: T[]`. Por eso los componentes deben unwrappear explícitamente antes
 * de leer `response.data` o `response.data.data`.
 */
export interface ApiListResponse<T> {
  status?: string;
  message?: string;
  data?: T[] | { data: T[] };
}

export interface ApiResourceResponse<T> {
  status?: string;
  message?: string;
  data?: T;
}
