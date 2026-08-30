export const AppRoles = {
  SOCIO_GERENCIA: 'socio_gerencia',
  ADMIN_SISTEMA: 'admin_sistema',
  ADMINISTRADOR: 'administrador',
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];
