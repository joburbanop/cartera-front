import { TrailHub, contractsHub, limitTrailHubs } from './navigation-trail';

export interface AppBreadcrumb {
  label: string;
  url: string;
  queryParams?: Record<string, string | number>;
}

export function buildAppBreadcrumbs(
  pathname: string,
  query: Record<string, string | number | null | undefined> = {},
  pageTitle: string | null = null,
  hubs: readonly TrailHub[] | null = null,
): AppBreadcrumb[] {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);
  const panel: AppBreadcrumb = { label: 'Panel', url: '/dashboard' };
  const title = pageTitle?.trim() || null;

  if (segments.length === 0 || segments[0] === 'dashboard') {
    return [panel];
  }

  switch (segments[0]) {
    case 'contracts':
      if (query['lotId'] != null && String(query['lotId']) !== '') {
        return [
          panel,
          { label: 'Lotes', url: '/lots' },
          { label: title || 'Lote', url: path },
        ];
      }
      return [panel, { label: 'Contratos', url: '/contracts' }];
    case 'amortization':
      return [
        panel,
        ...limitTrailHubs(hubs?.length ? hubs : [contractsHub()]).map(toCrumb),
        { label: title || 'Contrato', url: path },
      ];
    case 'lots':
      return [panel, { label: 'Lotes', url: '/lots' }];
    case 'clientes':
      if (segments[1]) {
        return [
          panel,
          { label: 'Clientes', url: '/clientes' },
          { label: title || 'Cliente', url: path },
        ];
      }
      return [panel, { label: 'Clientes', url: '/clientes' }];
    case 'projects':
      return [panel, { label: 'Proyectos', url: '/projects' }];
    case 'bank-accounts':
      return [panel, { label: 'Cuentas bancarias', url: '/bank-accounts' }];
    case 'usuarios':
      return [panel, { label: 'Usuarios', url: '/usuarios' }];
    default:
      return [panel, { label: title || segments[0], url: path }];
  }
}

export function penultimateBreadcrumb(crumbs: readonly AppBreadcrumb[]): AppBreadcrumb {
  return crumbs[crumbs.length - 2] ?? { label: 'Contratos', url: '/contracts' };
}

function toCrumb(hub: TrailHub): AppBreadcrumb {
  return hub.queryParams
    ? { label: hub.label, url: hub.url, queryParams: hub.queryParams }
    : { label: hub.label, url: hub.url };
}
