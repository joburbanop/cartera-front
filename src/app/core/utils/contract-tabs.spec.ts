import {
  applyVisibleReorder,
  DEFAULT_CONTRACT_TAB_IDS,
  extractContractTabs,
  isDefaultContractTabOrder,
  normalizeContractTabOrder,
  visibleContractTabs,
} from './contract-tabs';

describe('contract-tabs', () => {
  it('completa ids faltantes y descarta desconocidos', () => {
    expect(normalizeContractTabOrder(['hoja-vida', 'inventado', 'hoja-vida', 'amortizacion'])).toEqual([
      'hoja-vida',
      'amortizacion',
      'promesa',
      'bitacora-contrato',
      'bitacora-cliente',
    ]);
  });

  it('muestra solo las pestañas disponibles respetando el orden guardado', () => {
    const saved = [
      'hoja-vida',
      'bitacora-contrato',
      'promesa',
      'amortizacion',
      'bitacora-cliente',
    ];

    expect(visibleContractTabs(saved, ['amortizacion', 'hoja-vida', 'bitacora-contrato'])).toEqual([
      'hoja-vida',
      'bitacora-contrato',
      'amortizacion',
    ]);
  });

  it('reordena las visibles y deja las ocultas en su sitio', () => {
    expect(applyVisibleReorder(DEFAULT_CONTRACT_TAB_IDS, [
      'hoja-vida',
      'bitacora-contrato',
      'amortizacion',
    ])).toEqual([
      'hoja-vida',
      'bitacora-contrato',
      'promesa',
      'amortizacion',
      'bitacora-cliente',
    ]);
  });

  it('reconoce el orden por defecto y extrae preferencias vacías', () => {
    expect(isDefaultContractTabOrder(DEFAULT_CONTRACT_TAB_IDS)).toBe(true);
    expect(isDefaultContractTabOrder(['hoja-vida', ...DEFAULT_CONTRACT_TAB_IDS.slice(1)])).toBe(false);
    expect(extractContractTabs(null)).toEqual([...DEFAULT_CONTRACT_TAB_IDS]);
    expect(extractContractTabs({ contractTabs: ['bitacora-cliente'] })[0]).toBe('bitacora-cliente');
  });
});
