import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CustomerService, Customer } from '../../core/services/customer.service';

interface ClienteUI {
  id?: number;
  nombre: string;
  documento: string;
  telefono: string;
  email?: string;
  lote: string | null;
  estadoCartera: 'al_dia' | 'vencida' | 'sin_contrato';
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);

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

  // Búsqueda
  searchTerm = '';

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
    this.isLoading = true;
    this.customerService.getCustomers().subscribe({
      next: (response) => {
        const customersData = response.data || response || [];
        
        // Mapear los datos de la API al formato UI
        this.clientes = customersData.map((customer: Customer) => ({
          id: customer.id,
          nombre: customer.name || 'Sin nombre',
          documento: customer.document_number || customer.document || 'Sin documento',
          telefono: customer.phone || 'Sin teléfono',
          email: customer.email,
          lote: null, // TODO: Conectar con el servicio de contratos para obtener el lote asociado
          estadoCartera: 'sin_contrato' as const
        }));

        // Agregar datos de prueba si no hay clientes
        if (this.clientes.length === 0) {
          this.agregarDatosDePrueba();
        }

        this.clientesFiltrados = [...this.clientes];
        this.calcularKPIs();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        // Si hay error, mostrar datos de prueba
        this.agregarDatosDePrueba();
        this.clientesFiltrados = [...this.clientes];
        this.calcularKPIs();
        this.isLoading = false;
      }
    });
  }

  private agregarDatosDePrueba(): void {
    this.clientes = [
      {
        id: 1,
        nombre: 'William Rojas',
        documento: '1234567890',
        telefono: '321 456 7890',
        email: 'william.rojas@email.com',
        lote: 'Lote 45',
        estadoCartera: 'vencida'
      },
      {
        id: 2,
        nombre: 'Ana Muñoz',
        documento: '9876543210',
        telefono: '310 234 5678',
        email: 'ana.munoz@email.com',
        lote: 'Lote 12',
        estadoCartera: 'al_dia'
      },
      {
        id: 3,
        nombre: 'Luis Erazo',
        documento: '5554443332',
        telefono: '315 987 6543',
        email: 'luis.erazo@email.com',
        lote: null,
        estadoCartera: 'sin_contrato'
      }
    ];
  }

  private calcularKPIs(): void {
    this.totalClientes = this.clientes.length;
    this.clientesConContrato = this.clientes.filter(c => c.lote !== null).length;
    this.clientesEnMora = this.clientes.filter(c => c.estadoCartera === 'vencida').length;
  }

  buscarCliente(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();

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
    this.showCustomerModal = true;
    this.customerForm.reset({
      document_type: 'CC'
    });
    this.successMessage = '';
    this.errorMessage = '';
  }

  cerrarModal(): void {
    this.showCustomerModal = false;
    this.customerForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
  }

  guardarCliente(): void {
    if (this.customerForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const customerData: Partial<Customer> = {
      name: this.customerForm.value.name || '',
      document: this.customerForm.value.document || '',
      phone: this.customerForm.value.phone || '',
      email: this.customerForm.value.email || '',
      document_type: this.customerForm.value.document_type || 'CC',
      address: this.customerForm.value.address || null,
      city: this.customerForm.value.city || null
    };

    this.customerService.createCustomer(customerData).subscribe({
      next: (response) => {
        this.successMessage = 'Cliente registrado correctamente';
        this.isLoading = false;
        
        // Recargar la lista de clientes
        setTimeout(() => {
          this.cerrarModal();
          this.cargarClientes();
        }, 1500);
      },
      error: (err) => {
        console.error('Error al crear cliente:', err);
        this.errorMessage = err.error?.message || 'No se pudo crear el cliente';
        this.isLoading = false;
      }
    });
  }
}
