import { lotStatusLabel } from './lot-status-label.pipe';

describe('lotStatusLabel', () => {
  it('muestra Renegociación para el valor interno abogado', () => {
    expect(lotStatusLabel('abogado')).toBe('Renegociación');
    expect(lotStatusLabel({ value: 'abogado' })).toBe('Renegociación');
  });
});
