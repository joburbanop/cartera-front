import { lotStatusLabel } from './lot-status-label.pipe';

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
