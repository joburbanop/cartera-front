import { Component, ChangeDetectorRef, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../../core/services/customer.service';
import { Customer } from '../../../../core/models/customer.model';
import { ToastService } from '../../../../shared/services/toast.service';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../../shared/utils/form-utils';

@Component({
  selector: 'app-quick-customer-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './quick-customer-modal.component.html',
})
export class QuickCustomerModalComponent {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() customerCreated = new EventEmitter<Customer>();
  @Output() createFailed = new EventEmitter<string>();

  customerForm = this.fb.group({
    name: ['', Validators.required],
    document: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)]],
  });

  saveQuickCustomer() {
    if (this.customerForm.invalid) {
      markAllAsTouched(this.customerForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    const rawCustomer = this.customerForm.getRawValue();
    const documentValue = String(rawCustomer.document ?? '').trim();

    const payload = {
      name: String(rawCustomer.name ?? '').trim(),
      document_type: 'CC',
      document_number: documentValue,
      phone: String(rawCustomer.phone ?? '').trim(),
      email: rawCustomer.email?.trim() || null,
    };

    this.customerService.createCustomer(payload).subscribe({
      next: (response) => {
        const customerPayload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;

        const customer = customerPayload as Customer;

        this.customerForm.reset();
        this.customerCreated.emit(customer);
        this.closed.emit();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al crear cliente', err);

        if (err.status === 422 && err.error?.errors) {
          const errors = err.error.errors;
          const errorMessages: string[] = [];

          for (const field in errors) {
            const messages = errors[field];
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            }
          }

          this.createFailed.emit(errorMessages.join('. '));
        } else {
          this.createFailed.emit(err.error?.message || 'No se pudo crear el cliente.');
        }

        this.cdr.markForCheck();
      }
    });
  }
}
