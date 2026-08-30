import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'contractStatusLabel',
  standalone: true,
})
export class ContractStatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const normalized = String(value ?? '').toLowerCase();

    switch (normalized) {
      case 'preventa_inactiva':
        return 'Preventa';
      case 'activo':
        return 'Activo';
      case 'terminado':
        return 'Terminado';
      case 'rescindido':
        return 'Rescindido';
      case 'vencido':
        return 'Vencido';
      default:
        return value || 'Sin estado';
    }
  }
}
