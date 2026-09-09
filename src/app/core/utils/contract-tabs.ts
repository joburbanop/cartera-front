export const DEFAULT_CONTRACT_TAB_IDS = [
  'amortizacion',
  'hoja-vida',
  'promesa',
  'bitacora-contrato',
  'bitacora-cliente',
] as const;

export type ContractTabId = (typeof DEFAULT_CONTRACT_TAB_IDS)[number];

const KNOWN = new Set<string>(DEFAULT_CONTRACT_TAB_IDS);

export function isContractTabId(value: string): value is ContractTabId {
  return KNOWN.has(value);
}

export function normalizeContractTabOrder(ids: unknown): ContractTabId[] {
  const saved: ContractTabId[] = [];

  if (Array.isArray(ids)) {
    for (const id of ids) {
      if (typeof id !== 'string' || !isContractTabId(id) || saved.includes(id)) {
        continue;
      }
      saved.push(id);
    }
  }

  for (const id of DEFAULT_CONTRACT_TAB_IDS) {
    if (!saved.includes(id)) {
      saved.push(id);
    }
  }

  return saved;
}

export function visibleContractTabs(
  saved: readonly string[],
  available: readonly ContractTabId[],
): ContractTabId[] {
  const normalized = normalizeContractTabOrder(saved);
  const availableSet = new Set(available);
  const ordered = normalized.filter((id) => availableSet.has(id));

  for (const id of available) {
    if (!ordered.includes(id)) {
      ordered.push(id);
    }
  }

  return ordered;
}

export function applyVisibleReorder(
  full: readonly string[],
  newVisible: readonly ContractTabId[],
): ContractTabId[] {
  const normalized = normalizeContractTabOrder(full);
  const allowed = new Set(normalized);
  const visible: ContractTabId[] = [];

  for (const id of newVisible) {
    if (allowed.has(id) && !visible.includes(id)) {
      visible.push(id);
    }
  }

  const visibleSet = new Set(visible);
  let index = 0;
  const result: ContractTabId[] = [];

  for (const id of normalized) {
    if (visibleSet.has(id)) {
      result.push(visible[index++] ?? id);
    } else {
      result.push(id);
    }
  }

  return normalizeContractTabOrder(result);
}

export function isDefaultContractTabOrder(ids: readonly string[]): boolean {
  const normalized = normalizeContractTabOrder(ids);
  return DEFAULT_CONTRACT_TAB_IDS.every((id, index) => normalized[index] === id);
}

export function extractContractTabs(preferences: unknown): ContractTabId[] {
  if (!preferences || typeof preferences !== 'object') {
    return [...DEFAULT_CONTRACT_TAB_IDS];
  }

  return normalizeContractTabOrder((preferences as { contractTabs?: unknown }).contractTabs);
}
