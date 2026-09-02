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

export function unwrapListItems<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  const payload = response && typeof response === 'object' && 'data' in response
    ? (response as { data: unknown }).data
    : response;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

export function unwrapPaginator(response: unknown): { items: unknown[]; total: number; currentPage: number; lastPage: number; perPage: number } {
  const payload = response && typeof response === 'object' && 'data' in response
    ? (response as { data: unknown }).data
    : response;

  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, currentPage: 1, lastPage: 1, perPage: payload.length || 20 };
  }

  if (payload && typeof payload === 'object') {
    const nested = payload as { data?: unknown[]; total?: number; current_page?: number; last_page?: number; per_page?: number };
    const items = Array.isArray(nested.data) ? nested.data : [];
    return {
      items,
      total: Number(nested.total ?? items.length),
      currentPage: Number(nested.current_page ?? 1),
      lastPage: Number(nested.last_page ?? 1),
      perPage: Number(nested.per_page ?? 20),
    };
  }

  return { items: [], total: 0, currentPage: 1, lastPage: 1, perPage: 20 };
}

