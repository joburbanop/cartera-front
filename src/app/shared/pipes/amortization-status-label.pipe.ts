import { Pipe, PipeTransform } from '@angular/core';
import { amortizationStatusLabel } from '../../core/models/amortization-status';

@Pipe({
  name: 'amortizationStatusLabel',
  standalone: true,
})
export class AmortizationStatusLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return amortizationStatusLabel(value);
  }
}
