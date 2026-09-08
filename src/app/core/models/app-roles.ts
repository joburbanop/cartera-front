export const AppRoles = {
  SOCIO_GERENCIA: 'socio_gerencia',
  ADMIN_SISTEMA: 'admin_sistema',
  ADMINISTRADOR: 'administrador',
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];

const ROLE_LABELS: Record<AppRole, string> = {
  [AppRoles.SOCIO_GERENCIA]: 'Socio gerencia',
  [AppRoles.ADMIN_SISTEMA]: 'Admin sistema',
  [AppRoles.ADMINISTRADOR]: 'Administrador',
};

export function roleDisplayName(role: string | null | undefined): string {
  if (!role) {
    return '';
  }

  return ROLE_LABELS[role as AppRole] ?? role;
}

export function rolesDisplayName(roles: string[] | null | undefined): string {
  if (!roles?.length) {
    return 'Sin rol';
  }

  return roles.map((role) => roleDisplayName(role)).join(', ');
}
