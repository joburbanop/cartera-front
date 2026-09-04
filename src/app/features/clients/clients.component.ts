import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CustomerService, Customer } from '../../core/services/customer.service';
import { AuthService } from '../../core/services/auth.service';
import { AppRoles } from '../../core/models/app-roles';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { FieldErrorComponent } from '../../shared/components/field-error/field-error.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../shared/utils/form-utils';

interface ClienteUI {
  id?: number;
  nombre: string;
  documento: string;
  telefono: string;
  email?: string | null;
  lote: string | null;
  cantidad_contratos?: number;
  estadoCartera: string;
  deleted_at?: string | null;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FieldErrorComponent, PaginationComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  get canCreate(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  // KPIs
  totalClientes = 0;
  clientesConContrato = 0;
  clientesEnMora = 0;

  // Lista de clientes
  clientes: ClienteUI[] = [];
  clientesFiltrados: ClienteUI[] = [];
  
  // Control del modal
  showCustomerModal = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  isEditMode = false;
  selectedCustomer: Customer | null = null;
  editingCustomerId: number | null = null;

  archivedClientes: ClienteUI[] = [];
  mostrarArchivados = false;

  // Búsqueda
  searchTerm = '';
  pageSize = 10;
  currentPage = 1;

 get pagedClientes(): ClienteUI[] {
  const start = (this.currentPage - 1) * this.pageSize;
  return this.clientesFiltrados.slice(start, start + this.pageSize);
}
 get clientesMostrados(): ClienteUI[] {
  const lista = this.mostrarArchivados
    ? this.archivedClientes
    : this.clientesFiltrados;

  const start = (this.currentPage - 1) * this.pageSize;

  return lista.slice(start, start + this.pageSize);
}

  // Formulario de nuevo cliente
  customerForm = this.fb.group({
    name: ['', Validators.required],
    document: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.email]],
    document_type: ['CC'],
    address: [''],
    city: ['']
  });

  ngOnInit(): void {
    this.cargarClientes();
  }

  cargarClientes(): void {
    this.currentPage = 1;
    this.isLoading = true;
    this.customerService.getCustomers().subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response ?? [];

        const customersData = (Array.isArray(payload) ? payload : []) as Customer[];

  this.clientes = customersData
  .filter(customer => !customer.deleted_at)
  .map(customer => ({
    id: customer.id,
    nombre: customer.nombre ?? customer.name ?? '',
    documento: customer.documento ?? customer.document_number ?? '',
    telefono: customer.telefono ?? customer.phone ?? '',
    email: customer.email ?? null,
    lote: customer.lote ?? null,
    cantidad_contratos: customer.cantidad_contratos ?? 0,
    estadoCartera: customer.estadoCartera ?? 'sin_contrato',
    deleted_at: customer.deleted_at ?? null
  }));

this.archivedClientes = customersData
  .filter(customer => !!customer.deleted_at)
  .map(customer => ({
    id: customer.id,
    nombre: customer.nombre ?? customer.name ?? '',
    documento: customer.documento ?? customer.document_number ?? '',
    telefono: customer.telefono ?? customer.phone ?? '',
    email: customer.email ?? null,
    lote: customer.lote ?? null,
    cantidad_contratos: customer.cantidad_contratos ?? 0,
    estadoCartera: customer.estadoCartera ?? 'sin_contrato',
    deleted_at: customer.deleted_at ?? null
  }));

this.clientesFiltrados = [...this.clientes];
        this.calcularKPIs();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        this.errorMessage = 'No se pudieron cargar los clientes. Por favor, intente nuevamente.';
        this.clientes = [];
        this.clientesFiltrados = [];
        this.calcularKPIs();
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calcularKPIs(): void {
    this.totalClientes = this.clientes.length;
    this.clientesConContrato = this.clientes.filter(c => c.lote !== null).length;
    this.clientesEnMora = this.clientes.filter(c => c.estadoCartera === 'vencida').length;
  }

  buscarCliente(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
    this.currentPage = 1;

    if (!this.searchTerm.trim()) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }

    this.clientesFiltrados = this.clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(this.searchTerm) ||
      cliente.documento.includes(this.searchTerm) ||
      cliente.telefono.includes(this.searchTerm) ||
      (cliente.lote && cliente.lote.toLowerCase().includes(this.searchTerm))
    );
  }

  abrirModalNuevoCliente(): void {
  this.isEditMode = false;
  this.selectedCustomer = null;

  this.showCustomerModal = true;

  this.customerForm.reset({
    name: '',
    document: '',
    phone: '',
    email: '',
    document_type: 'CC',
    address: '',
    city: ''
  });

  this.successMessage = '';
  this.errorMessage = '';
}
abrirModalEditarCliente(cliente: ClienteUI): void {
  if (!cliente.id) {
    return;
  }

  this.isEditMode = true;
  this.editingCustomerId = cliente.id;
  this.selectedCustomer = null;

  this.successMessage = '';
  this.errorMessage = '';
  this.isLoading = true;

  this.customerService.getCustomerById(cliente.id).subscribe({
    next: (response) => {
  if (!response.data) {
    this.isLoading = false;
    this.errorMessage = 'No se encontró la información del cliente.';
    this.cdr.detectChanges();
    return;
  }

  const customer = response.data;

  this.selectedCustomer = customer;

  this.customerForm.patchValue({
    name: customer.name ?? '',
    document: customer.document_number ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    document_type: customer.document_type ?? 'CC',
    address: customer.address ?? '',
    city: customer.city ?? ''
  });

  this.showCustomerModal = true;
  this.isLoading = false;

  this.cdr.detectChanges();
},

    error: (err) => {
      console.error('Error cargando cliente:', err);

      this.isLoading = false;
      this.errorMessage =
        err.error?.message || 'No se pudo cargar la información del cliente.';

      this.cdr.detectChanges();
    }
  });
}
  cerrarModal(): void {
  this.showCustomerModal = false;
  this.customerForm.reset();

  this.isEditMode = false;
  this.selectedCustomer = null;

  this.successMessage = '';
  this.errorMessage = '';
}

  guardarCliente(): void {
    if (this.customerForm.invalid) {
      markAllAsTouched(this.customerForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show(
        'Formulario incompleto',
        'error',
        'Revisa los campos marcados en rojo'
      );
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const customerData = {
      document_type: this.customerForm.value.document_type || 'CC',
      document_number: this.customerForm.value.document || '',
      name: this.customerForm.value.name || '',
      phone: this.customerForm.value.phone || '',
      email: this.customerForm.value.email || null,
      address: this.customerForm.value.address || null,
      city: this.customerForm.value.city || null
    };

      if (this.isEditMode) {
  if (!this.editingCustomerId) {
    this.isLoading = false;
    this.errorMessage = 'No se pudo identificar el cliente.';
    return;
  }

  this.customerService
    .updateCustomer(this.editingCustomerId, customerData)
    .subscribe({
      next: () => {
        this.successMessage = 'Cliente actualizado correctamente';
        this.isLoading = false;

        setTimeout(() => {
          this.cerrarModal();
          this.cargarClientes();
        }, 1000);

        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error al actualizar cliente:', err);

        this.isLoading = false;
        this.mostrarErroresCliente(err);

        this.cdr.detectChanges();
      }
    });

  return;
}

    // =========================
    // EDITAR CLIENTE
    // =========================
    if (this.isEditMode) {

      if (!this.selectedCustomer?.id) {
        this.isLoading = false;
        this.errorMessage = 'No se pudo identificar el cliente a actualizar.';
        return;
      }

      this.customerService
        .updateCustomer(this.selectedCustomer.id, customerData)
        .subscribe({
          next: () => {
            this.successMessage = 'Cliente actualizado correctamente';
            this.isLoading = false;

            setTimeout(() => {
              this.cerrarModal();
              this.cargarClientes();
            }, 1000);

            this.cdr.detectChanges();
          },

          error: (err) => {
            console.error('Error al actualizar cliente:', err);
            this.isLoading = false;

            this.mostrarErroresCliente(err);

            this.cdr.detectChanges();
          }
        });

      return;
    }

    // =========================
    // CREAR CLIENTE
    // =========================
    this.customerService.createCustomer(customerData).subscribe({
      next: () => {
        this.successMessage = 'Cliente registrado correctamente';
        this.isLoading = false;

        setTimeout(() => {
          this.cerrarModal();
          this.cargarClientes();
        }, 1000);

        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error al crear cliente:', err);
        this.isLoading = false;

        this.mostrarErroresCliente(err);

        this.cdr.detectChanges();
      }
    });
  }

  archivarCliente(cliente: ClienteUI): void {
  if (!cliente.id) {
    return;
  }

  const confirmar = confirm(
    `¿Está seguro de que desea archivar al cliente "${cliente.nombre}"?`
  );

  if (!confirmar) {
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  this.customerService.archiveCustomer(cliente.id).subscribe({
    next: () => {
      this.toast.show(
        'Cliente archivado',
        'success',
        'El cliente fue archivado correctamente'
      );

      this.isLoading = false;

      // Actualizar la lista sin recargar la página
      this.clientes = this.clientes.filter(
        c => c.id !== cliente.id
      );

      this.clientesFiltrados = this.clientesFiltrados.filter(
        c => c.id !== cliente.id
      );

      this.calcularKPIs();

      // Evitar quedar en una página vacía
      const totalPages = Math.ceil(
        this.clientesFiltrados.length / this.pageSize
      );

      if (this.currentPage > totalPages && totalPages > 0) {
        this.currentPage = totalPages;
      }

      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('Error archivando cliente:', err);

      this.isLoading = false;

      const message =
        err.error?.message ||
        'No se pudo archivar el cliente.';

      this.toast.show(
        'No se pudo archivar',
        'error',
        message
      );

      this.cdr.detectChanges();
    }
  });
}
activarCliente(cliente: ClienteUI): void {
  if (!cliente.id) {
    return;
  }

  const confirmar = confirm(
    `¿Desea activar nuevamente al cliente "${cliente.nombre}"?`
  );

  if (!confirmar) {
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  this.customerService.activateCustomer(cliente.id).subscribe({
        next: () => {
      this.toast.show(
        'Cliente activado',
        'success',
        'El cliente fue activado correctamente'
      );

      this.isLoading = false;

      this.archivedClientes = this.archivedClientes.filter(
        c => c.id !== cliente.id
      );

      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('Error activando cliente:', err);

      this.isLoading = false;

      this.toast.show(
        'No se pudo activar',
        'error',
        err.error?.message || 'No se pudo activar el cliente.'
      );

      this.cdr.detectChanges();
    }
  });
}

cargarClientesArchivados(): void {
  this.isLoading = true;

  this.customerService.getArchivedCustomers().subscribe({
    next: (response) => {
      const payload = Array.isArray(response)
        ? response
        : response && typeof response === 'object' && 'data' in response
          ? response.data
          : response ?? [];

      const customersData = (
        Array.isArray(payload) ? payload : []
      ) as Customer[];

      this.archivedClientes = customersData.map((customer: any) => ({
        id: customer.id,
        nombre: customer.nombre ?? customer.name ?? '',
        documento: customer.documento ?? customer.document_number ?? '',
        telefono: customer.telefono ?? customer.phone ?? '',
        email: customer.email,
        lote: customer.lote ?? null,
        cantidad_contratos: customer.cantidad_contratos ?? 0,
        estadoCartera: customer.estadoCartera ?? 'sin_contrato',
        deleted_at: customer.deleted_at ?? null
      }));

      this.currentPage = 1;
      this.isLoading = false;
      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('Error cargando clientes archivados:', err);

      this.archivedClientes = [];

      this.isLoading = false;

      this.toast.show(
        'Error',
        'error',
        'No se pudieron cargar los clientes archivados.'
      );

      this.cdr.detectChanges();
    }
  });
}
toggleArchivados(): void {
  this.mostrarArchivados = !this.mostrarArchivados;

  this.currentPage = 1;
  this.searchTerm = '';

  if (this.mostrarArchivados) {
    this.cargarClientesArchivados();
  } else {
    this.cargarClientes();
  }
}

  private mostrarErroresCliente(err: any): void {
  if (err.status === 422 && err.error?.errors) {
    const errors = err.error.errors;
    const errorMessages: string[] = [];

    const fieldLabels: { [key: string]: string } = {
      document_type: 'Tipo de documento',
      document_number: 'Número de documento',
      name: 'Nombre',
      phone: 'Teléfono',
      email: 'Email',
      address: 'Dirección',
      city: 'Ciudad'
    };

    for (const field in errors) {
      const label = fieldLabels[field] || field;
      const messages = errors[field];

      if (Array.isArray(messages)) {
        messages.forEach(msg => {
          errorMessages.push(`${label}: ${msg}`);
        });
      }
    }

    this.errorMessage = errorMessages.join('. ');
  } else {
    this.errorMessage =
      err.error?.message ||
      'No se pudo guardar el cliente. Intente nuevamente.';
  }
}
}
