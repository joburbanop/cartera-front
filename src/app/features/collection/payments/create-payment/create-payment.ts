import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { PaymentService } from '../../../../core/services/payment';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-create-payment',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-payment.html',
  styleUrl: './create-payment.scss',
})
export class CreatePayment implements OnInit {

  private fb = inject(FormBuilder);
  private paymentService = inject(PaymentService);
  private cdr = inject(ChangeDetectorRef);
  contracts: any[] = [];

  isLoading = false;
  isSaving = false;

  successMessage = '';
  errorMessage = '';

  paymentForm = this.fb.group({
    contract_id: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(1)]],
    transaction_date: ['', Validators.required],
    payment_method: ['', Validators.required],
    receipt: [null as File | null, Validators.required]
  });

  ngOnInit(): void {
    this.loadContracts();
  }

  loadContracts(): void {
  this.isLoading = true;

  this.paymentService.getContracts().subscribe({
   next: (response) => {
  console.log('CONTRATOS:', response);

  this.contracts = response.data.data;
  this.isLoading = false;

  this.cdr.markForCheck();
},

   error: (err) => {
  console.error('Error cargando contratos:', err);

  this.errorMessage = 'No se pudieron cargar los contratos.';
  this.isLoading = false;

  this.cdr.markForCheck();
}
  });
}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      this.paymentForm.patchValue({
        receipt: file
      });

      this.paymentForm.get('receipt')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    const contractId = Number(this.paymentForm.value.contract_id);
    const amount = this.paymentForm.value.amount;
    const transactionDate = this.paymentForm.value.transaction_date;
    const paymentMethod = this.paymentForm.value.payment_method;
    const receipt = this.paymentForm.value.receipt;

    const formData = new FormData();

    formData.append('amount', String(amount));
    formData.append('transaction_date', String(transactionDate));
    formData.append('payment_method', String(paymentMethod));

    if (receipt) {
      formData.append('receipt', receipt);
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.paymentService.createDownPayment(contractId, formData).subscribe({
      next: (response) => {
        console.log('PAGO REGISTRADO:', response);

        this.isSaving = false;
        this.successMessage = 'Pago registrado exitosamente.';

        this.paymentForm.reset();
      },

      error: (err) => {
        console.error('Error registrando pago:', err);

        this.isSaving = false;

        if (err.status === 422 && err.error?.errors) {
          const primerCampo = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[primerCampo][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar el pago.';
        }
      }
    });
  }
}