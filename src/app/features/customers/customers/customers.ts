import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { Customer } from '../../../core/services/customer';


@Component({
  selector: 'app-customers',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers implements OnInit {

  private customerService = inject(Customer);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  customers: any[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  customerForm = this.fb.group({
    document_type: ['', Validators.required],
    document_number: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    city: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
  this.isLoading = true;

  this.customerService.getCustomers().subscribe({
    next: (response) => {
      console.log('CLIENTES:', response.data?.data);

      this.customers = response.data?.data || [];
      this.isLoading = false;

      this.cdr.detectChanges();
    },

      error: (err) => {
        console.error('Error cargando clientes', err);
        this.errorMessage = 'No se pudieron cargar los clientes.';
        this.isLoading = false;
      }
    });
  }
  onSubmit(): void {
  if (this.customerForm.invalid) {
    this.errorMessage = 'Completa los campos obligatorios.';
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  this.customerService.createCustomer(this.customerForm.value).subscribe({
    next: (response) => {
      this.isLoading = false;
      this.successMessage = 'Cliente registrado exitosamente.';

      this.customerForm.reset();

      this.loadCustomers();
    },

    error: (err) => {
      this.isLoading = false;
      console.error('Error registrando cliente:', err);

      if (err.status === 422 && err.error?.errors) {
        const primerCampo = Object.keys(err.error.errors)[0];
        this.errorMessage = err.error.errors[primerCampo][0];
      } else {
        this.errorMessage = 'Hubo un error al registrar el cliente.';
      }
    }
  });
}
}