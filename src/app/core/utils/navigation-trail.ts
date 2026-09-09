export const NAV_TRAIL_STATE_KEY = 'sgciTrail';
export const MAX_BREADCRUMB_SEGMENTS = 4;
export const MAX_TRAIL_HUBS = MAX_BREADCRUMB_SEGMENTS - 2;

export interface TrailHub {
  label: string;
  url: string;
  queryParams?: Record<string, string | number>;
}

export interface NavTrailState {
  session: string;
  hubs: TrailHub[];
}

export function createNavSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `nav-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function contractsHub(): TrailHub {
  return { label: 'Contratos', url: '/contracts' };
}

export function lotsHub(): TrailHub {
  return { label: 'Lotes', url: '/lots' };
}

export function lotContractsHub(lotId: number, lotLabel: string): TrailHub {
  return {
    label: lotLabel.trim() || `Lote ${lotId}`,
    url: '/contracts',
    queryParams: { lotId },
  };
}

export function clientesHub(): TrailHub {
  return { label: 'Clientes', url: '/clientes' };
}

export function clientHub(id: number, name: string): TrailHub {
  return {
    label: name.trim() || 'Cliente',
    url: `/clientes/${id}`,
  };
}

export function hubKey(hub: TrailHub): string {
  const params = hub.queryParams ?? {};
  const query = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return query ? `${hub.url}?${query}` : hub.url;
}

export function appendTrailHubs(existing: readonly TrailHub[], incoming: readonly TrailHub[]): TrailHub[] {
  let next = existing.map(cloneHub);

  for (const hub of incoming) {
    const parsed = parseHub(hub);
    if (!parsed) {
      continue;
    }

    const index = next.findIndex((item) => hubKey(item) === hubKey(parsed));
    if (index >= 0) {
      next = next.slice(0, index);
    }

    next.push(parsed);
  }

  return next;
}

export function limitTrailHubs(hubs: readonly TrailHub[]): TrailHub[] {
  return hubs.slice(-MAX_TRAIL_HUBS).map(cloneHub);
}

export function parseNavTrailState(raw: unknown, sessionId: string): TrailHub[] | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = (raw as Record<string, unknown>)[NAV_TRAIL_STATE_KEY];
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (record['session'] !== sessionId || !Array.isArray(record['hubs'])) {
    return null;
  }

  const hubs = limitTrailHubs(appendTrailHubs([], record['hubs'] as TrailHub[]));
  return hubs.length > 0 ? hubs : null;
}

export function navTrailState(sessionId: string, hubs: readonly TrailHub[]): Record<string, NavTrailState> {
  return {
    [NAV_TRAIL_STATE_KEY]: {
      session: sessionId,
      hubs: limitTrailHubs(appendTrailHubs([], hubs)),
    },
  };
}

function parseHub(value: unknown): TrailHub | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record['label'] !== 'string' || typeof record['url'] !== 'string') {
    return null;
  }

  const url = record['url'].trim();
  const label = record['label'].trim();
  if (!label || !url.startsWith('/')) {
    return null;
  }

  const hub: TrailHub = { label, url };
  const query = parseQueryParams(record['queryParams']);
  if (query) {
    hub.queryParams = query;
  }

  return hub;
}

function parseQueryParams(value: unknown): Record<string, string | number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const next: Record<string, string | number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' || typeof raw === 'number') {
      next[key] = raw;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function cloneHub(hub: TrailHub): TrailHub {
  return hub.queryParams ? { ...hub, queryParams: { ...hub.queryParams } } : { ...hub };
}
