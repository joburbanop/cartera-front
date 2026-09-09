import {
  appendTrailHubs,
  clientHub,
  clientesHub,
  contractsHub,
  limitTrailHubs,
  lotContractsHub,
  lotsHub,
  NAV_TRAIL_STATE_KEY,
  parseNavTrailState,
} from './navigation-trail';

describe('navigation-trail', () => {
  it('recorta al volver a un hub ya presente', () => {
    expect(appendTrailHubs(
      [clientesHub(), clientHub(8, 'Ana Pérez'), lotsHub()],
      [clientesHub(), clientHub(8, 'Ana Pérez')],
    )).toEqual([clientesHub(), clientHub(8, 'Ana Pérez')]);

    expect(appendTrailHubs(
      [lotsHub(), lotContractsHub(12, 'Lote 49')],
      [lotsHub()],
    )).toEqual([lotsHub()]);
  });

  it('deja como máximo dos hubs para no pasar de cuatro segmentos', () => {
    const hubs = limitTrailHubs(appendTrailHubs([], [
      clientesHub(),
      clientHub(8, 'Ana Pérez'),
      lotsHub(),
      contractsHub(),
    ]));

    expect(hubs).toEqual([lotsHub(), contractsHub()]);
  });

  it('ignora un rastro de otra sesión o mal formado', () => {
    expect(parseNavTrailState({
      [NAV_TRAIL_STATE_KEY]: { session: 'otra', hubs: [lotsHub()] },
    }, 'actual')).toBeNull();

    expect(parseNavTrailState({
      [NAV_TRAIL_STATE_KEY]: { session: 'actual', hubs: [{ label: 'X' }] },
    }, 'actual')).toBeNull();

    expect(parseNavTrailState({
      [NAV_TRAIL_STATE_KEY]: { session: 'actual', hubs: [lotsHub()] },
    }, 'actual')).toEqual([lotsHub()]);
  });
});
