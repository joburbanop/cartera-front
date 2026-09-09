import { buildAppBreadcrumbs, penultimateBreadcrumb } from './breadcrumbs';
import { clientHub, clientesHub, lotContractsHub, lotsHub } from './navigation-trail';

describe('buildAppBreadcrumbs', () => {
  it('en el dashboard deja Panel como ubicación actual', () => {
    expect(buildAppBreadcrumbs('/dashboard')).toEqual([
      { label: 'Panel', url: '/dashboard' },
    ]);
  });

  it('arma el listado de contratos y la amortización con el padre Contratos', () => {
    expect(buildAppBreadcrumbs('/contracts')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Contratos', url: '/contracts' },
    ]);

    expect(buildAppBreadcrumbs('/amortization/507', {}, 'SM-LOTE-49')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Contratos', url: '/contracts' },
      { label: 'SM-LOTE-49', url: '/amortization/507' },
    ]);
  });

  it('en el detalle de un lote usa Lotes como padre', () => {
    expect(buildAppBreadcrumbs('/contracts', { lotId: 12 }, 'Lote 49')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Lotes', url: '/lots' },
      { label: 'Lote 49', url: '/contracts' },
    ]);
  });

  it('en listados planos usa el nombre legible y no la ruta técnica', () => {
    expect(buildAppBreadcrumbs('/lots')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Lotes', url: '/lots' },
    ]);
    expect(buildAppBreadcrumbs('/projects')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Proyectos', url: '/projects' },
    ]);
    expect(buildAppBreadcrumbs('/bank-accounts')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Cuentas bancarias', url: '/bank-accounts' },
    ]);
    expect(buildAppBreadcrumbs('/usuarios')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Usuarios', url: '/usuarios' },
    ]);
    expect(buildAppBreadcrumbs('/clientes')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Clientes', url: '/clientes' },
    ]);
  });

  it('en la ficha de cliente usa el nombre y no la ruta técnica', () => {
    expect(buildAppBreadcrumbs('/clientes/8', {}, 'Juan Pérez')).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Clientes', url: '/clientes' },
      { label: 'Juan Pérez', url: '/clientes/8' },
    ]);
  });

  it('en amortización usa el rastro de la visita y cae a Contratos si no hay', () => {
    expect(buildAppBreadcrumbs('/amortization/507', {}, 'SM-LOTE-49', [lotsHub()])).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Lotes', url: '/lots' },
      { label: 'SM-LOTE-49', url: '/amortization/507' },
    ]);

    expect(buildAppBreadcrumbs('/amortization/507', {}, 'SM-LOTE-49', [
      lotsHub(),
      lotContractsHub(12, 'Lote 49'),
    ])).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Lotes', url: '/lots' },
      { label: 'Lote 49', url: '/contracts', queryParams: { lotId: 12 } },
      { label: 'SM-LOTE-49', url: '/amortization/507' },
    ]);

    expect(buildAppBreadcrumbs('/amortization/507', {}, 'SM-LOTE-49', [
      clientesHub(),
      clientHub(8, 'Juan Pérez'),
    ])).toEqual([
      { label: 'Panel', url: '/dashboard' },
      { label: 'Clientes', url: '/clientes' },
      { label: 'Juan Pérez', url: '/clientes/8' },
      { label: 'SM-LOTE-49', url: '/amortization/507' },
    ]);
  });

  it('el botón volver usa el penúltimo segmento de la miga', () => {
    const crumbs = buildAppBreadcrumbs('/amortization/507', {}, 'SM-LOTE-49', [
      lotsHub(),
      lotContractsHub(12, 'Lote 49'),
    ]);

    expect(penultimateBreadcrumb(crumbs)).toEqual({
      label: 'Lote 49',
      url: '/contracts',
      queryParams: { lotId: 12 },
    });
  });
});
