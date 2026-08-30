import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('agrega el toast al estado al llamar show()', () => {
    service.show('Pago registrado', 'success', 'El abono se aplicó correctamente.');

    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].title).toBe('Pago registrado');
    expect(toasts[0].description).toBe('El abono se aplicó correctamente.');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].leaving).toBe(false);
  });

  it('apila el toast más nuevo arriba', () => {
    service.show('Primero', 'success');
    service.show('Segundo', 'error');

    expect(service.toasts().map((toast) => toast.title)).toEqual(['Segundo', 'Primero']);
  });
});
