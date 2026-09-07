import { lotStatusBadgeClass, lotStatusLabel } from './lot-status-label.pipe';

describe('lotStatusLabel', () => {
  it('muestra Renegociación para el valor interno abogado', () => {
    expect(lotStatusLabel('abogado')).toBe('Renegociación');
    expect(lotStatusLabel({ value: 'abogado' })).toBe('Renegociación');
  });

  it('muestra Separado para separado y para el valor inválido legado reservado', () => {
    expect(lotStatusLabel('separado')).toBe('Separado');
    expect(lotStatusLabel('reservado')).toBe('Separado');
  });
});

describe('lotStatusBadgeClass', () => {
  it('asigna un modifier distinto a cada estado de lote', () => {
    expect(lotStatusBadgeClass('disponible')).toBe('badge-pill--success');
    expect(lotStatusBadgeClass('preventa')).toBe('badge-pill--warning');
    expect(lotStatusBadgeClass('separado')).toBe('badge-pill--accent');
    expect(lotStatusBadgeClass('reservado')).toBe('badge-pill--accent');
    expect(lotStatusBadgeClass('vendido')).toBe('badge-pill--sold');
    expect(lotStatusBadgeClass('abogado')).toBe('badge-pill--info');
  });
});
