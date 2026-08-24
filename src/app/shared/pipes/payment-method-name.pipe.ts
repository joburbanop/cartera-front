import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paymentMethodName',
  standalone: true,
})
export class PaymentMethodNamePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    const normalized = String(value ?? '').toLowerCase();

    const methods: Record<string, string> = {
      transfer: 'Transferencia',
      cash: 'Efectivo',
      barter: 'Permuta',
      bank_transfer: 'Transferencia bancaria',
    };

    const mapped = methods[normalized];
    return mapped ?? (value ? String(value) : 'Sin método');
  }
}
