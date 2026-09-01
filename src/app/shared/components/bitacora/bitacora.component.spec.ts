import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityEntry } from '../../../core/models/activity-entry.model';
import { BitacoraComponent } from './bitacora.component';

const sample = (overrides: Partial<ActivityEntry> = {}): ActivityEntry => ({
  id: 1,
  date: new Date().toISOString(),
  description: 'Actualizó contrato',
  causer_name: 'Ana Pérez',
  changes: { before: {}, after: {} },
  properties: {},
  ...overrides,
});

describe('BitacoraComponent', () => {
  let component: BitacoraComponent;
  let fixture: ComponentFixture<BitacoraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BitacoraComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BitacoraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clasifica pagos, fechas, altas y ediciones', () => {
    expect(component.eventKind(sample({
      description: 'Registró un pago de $1,000.00 mediante cash sobre el contrato',
      properties: { transaction_id: 9 },
    }))).toBe('pago');

    expect(component.eventKind(sample({
      description: 'Cambió la fecha de vencimiento de la cuota 1 de 05/03/2027 a 10/03/2027',
      properties: { installment_number: 1 },
    }))).toBe('fecha');

    expect(component.eventKind(sample({ description: 'Creó contrato' }))).toBe('creacion');
    expect(component.eventKind(sample({ description: 'Actualizó cliente' }))).toBe('edicion');
  });

  it('muestra el estado vacío con el copy acordado', () => {
    component.entries = [];
    component.isLoading = false;
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-state') as HTMLElement | null;
    expect(empty?.textContent).toContain('Sin movimientos registrados todavía');
  });
});
