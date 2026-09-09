import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ClientsComponent } from './clients.component';

describe('ClientsComponent', () => {
  let component: ClientsComponent;
  let fixture: ComponentFixture<ClientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra pestañas de clientes activos y archivados', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.view-tabs button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe('Clientes activos');
    expect(buttons[1].textContent?.trim()).toBe('Clientes archivados');
    expect(buttons[0].classList.contains('active')).toBe(true);
  });

  it('al dar de alta exige correo, dirección y ciudad', () => {
    component.abrirModalNuevoCliente();

    component.customerForm.patchValue({
      name: 'Cliente Nuevo',
      document: '1088001122',
      phone: '3002223344',
      email: '',
      address: '',
      city: '',
    });

    expect(component.customerForm.controls.email.hasError('required')).toBe(true);
    expect(component.customerForm.controls.address.hasError('required')).toBe(true);
    expect(component.customerForm.controls.city.hasError('required')).toBe(true);
    expect(component.customerForm.valid).toBe(false);

    component.customerForm.patchValue({
      email: 'cliente@example.com',
      address: 'Calle 1 # 2-3',
      city: 'Cali',
    });

    expect(component.customerForm.valid).toBe(true);
  });

  it('al editar no exige los datos de contacto, para no bloquear fichas históricas', () => {
    component.abrirModalEditarCliente({ id: 7 } as never);

    component.customerForm.patchValue({
      name: 'Cliente Histórico',
      document: '1088001122',
      phone: '3002223344',
      email: '',
      address: '',
      city: '',
    });

    expect(component.customerForm.controls.email.hasError('required')).toBe(false);
    expect(component.customerForm.controls.address.hasError('required')).toBe(false);
    expect(component.customerForm.controls.city.hasError('required')).toBe(false);
    expect(component.customerForm.valid).toBe(true);
  });

  it('ofrece los tipos de documento que acepta el API, incluido NIT', () => {
    component.abrirModalNuevoCliente();
    fixture.detectChanges();

    const codes = component.documentTypes.map((type) => type.code);
    expect(codes).toEqual(['CC', 'CE', 'NIT', 'PASSPORT']);
    // "TI" nunca existió en el enum del backend y provocaba un 422.
    expect(codes).not.toContain('TI');
  });

  it('con NIT rotula el nombre como razón social', () => {
    component.abrirModalNuevoCliente();

    expect(component.isCompanyCustomer).toBe(false);

    component.customerForm.controls.document_type.setValue('NIT');

    expect(component.isCompanyCustomer).toBe(true);
  });
});
