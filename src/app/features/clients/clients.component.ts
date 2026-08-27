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
        
        // Los datos ya vienen en el formato correcto desde el backend
        this.clientes = customersData.map((customer: any) => ({
          id: customer.id,
          nombre: customer.nombre,
          documento: customer.documento,
          telefono: customer.telefono,
          email: customer.email,
          lote: customer.lote,
          estadoCartera: customer.estadoCartera
        }));

        this.clientesFiltrados = [...this.clientes];
        this.calcularKPIs();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        // Si hay error en producción, mostrar mensaje al usuario
        this.errorMessage = 'No se pudieron cargar los clientes. Por favor, intente nuevamente.';
        this.clientes = [];
        this.clientesFiltrados = [];
        this.calcularKPIs();
        this.isLoading = false;
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

    // Mapear correctamente los campos al formato que espera el backend
    const customerData = {
      document_type: this.customerForm.value.document_type || 'CC',
      document_number: this.customerForm.value.document || '',
      name: this.customerForm.value.name || '',
      phone: this.customerForm.value.phone || '',
      email: this.customerForm.value.email || null,
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
        this.isLoading = false;
        
        // Manejo específico de errores de validación (422)
        if (err.status === 422 && err.error?.errors) {
          // Laravel devuelve los errores en formato { campo: [mensajes] }
          const errors = err.error.errors;
          const errorMessages: string[] = [];
          
          // Mapear los nombres de campos del backend a mensajes amigables
          const fieldLabels: { [key: string]: string } = {
            'document_type': 'Tipo de documento',
            'document_number': 'Número de documento',
            'name': 'Nombre',
            'phone': 'Teléfono',
            'email': 'Email',
            'address': 'Dirección',
            'city': 'Ciudad'
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
          // Error genérico
          this.errorMessage = err.error?.message || 'No se pudo crear el cliente. Intente nuevamente.';
        }
      }
    });
  }
}
