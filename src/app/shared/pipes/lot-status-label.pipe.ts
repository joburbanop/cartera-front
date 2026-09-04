import { Pipe, PipeTransform } from '@angular/core';

export function lotStatusValue(
  value: string | { value?: string; name?: string } | null | undefined,
): string {
  if (value && typeof value === 'object') {
    return String(value.value ?? value.name ?? '').toLowerCase();
  }

  return String(value ?? '').toLowerCase();
}

export function lotStatusLabel(
  value: string | { value?: string; name?: string } | null | undefined,
): string {
  const normalized = lotStatusValue(value);

  switch (normalized) {
    case 'disponible':
      return 'Disponible';
    case 'preventa':
      return 'Preventa';
    case 'reservado':
      return 'Separado';
    case 'vendido':
      return 'Vendido';
    case 'abogado':
      return 'Renegociación';
    case 'separado':
      return 'Separado';
    default:
      return (typeof value === 'string' && value) || 'Sin estado';
  }
}

@Pipe({
  name: 'lotStatusLabel',
  standalone: true,
})
export class LotStatusLabelPipe implements PipeTransform {
  transform(value: string | { value?: string; name?: string } | null | undefined): string {
    return lotStatusLabel(value);
  }
}
