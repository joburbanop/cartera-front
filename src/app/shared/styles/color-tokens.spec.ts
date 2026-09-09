import { ColorTokens } from './color-tokens';

describe('ColorTokens', () => {
  it('deja Vendido y Separado fuera de la marca y usa el nuevo estado de renegociación', () => {
    expect(ColorTokens.statusSold).not.toBe(ColorTokens.brandPrimary);
    expect(ColorTokens.statusReserved).not.toBe(ColorTokens.brandPrimary);
    expect(ColorTokens.statusSold).toBe('#22544a');
    expect(ColorTokens.statusReserved).toBe('#0f766e');
    expect(ColorTokens.statusInfo).toBe('#6d28d9');
  });

  it('usa el naranja de marca para acciones y el azul para navegación', () => {
    expect(ColorTokens.brandPrimary).toBe('#ed7337');
    expect(ColorTokens.brandPrimaryText).toBe('#c2410c');
    expect(ColorTokens.onBrand).toBe('#0f172a');
    expect(ColorTokens.statusPresale).toBe('#a16207');
    expect(ColorTokens.statusPresale).not.toBe(ColorTokens.statusWarning);
    expect(ColorTokens.brandLink).toBe('#0369a1');
    expect(ColorTokens.brandAccent).toBe('#37b0ed');
  });
});
