/**
 * Fallbacks de los tokens de :root. Los gráficos y tests no leen CSS;
 * estos valores tienen que coincidir con _design-system.scss.
 */
export const ColorTokens = {
  brandPrimary: '#ed7337',
  brandPrimaryText: '#c2410c',
  brandHover: '#9a3412',
  brandSoft: '#fef4ef',
  onBrand: '#0f172a',
  brandLink: '#0369a1',
  brandLinkHover: '#075985',
  brandAccent: '#37b0ed',
  statusSold: '#22544a',
  statusReserved: '#0f766e',
  statusPresale: '#a16207',
  statusCurrent: '#047857',
  statusOverdue: '#b91c1c',
  statusInfo: '#6d28d9',
  statusNeutral: '#475569',
  statusWarning: '#b45309',
} as const;
