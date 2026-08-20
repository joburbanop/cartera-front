import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BankAccountService } from '../../../core/services/bank-account.service';

@Component({
  selector: 'app-bank-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bank-accounts.component.html', // O './bank-accounts.html' si tu archivo se llama así
  styleUrls: ['./bank-accounts.component.scss'] // O './bank-accounts.scss'
})
export class BankAccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);
  accounts: any[] = [];
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  accountForm = this.fb.nonNullable.group({
    bank_name: ['', Validators.required],
    account_number: ['', Validators.required],
    account_type: ['savings', Validators.required],
    holder_name: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        // 2. AQUI: Agregamos este log para ver qué trae el GET de Laravel
        console.log('Datos que llegaron del GET:', response);
        
        // Verificamos si los datos están paginados (data.data) o directos (data)
        if (response.data && response.data.data) {
           this.accounts = response.data.data;
        } else if (response.data) {
           this.accounts = response.data;
        } else {
           this.accounts = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando cuentas', err)
    });
  }

  onSubmit() {
    if (this.accountForm.invalid) return;

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.bankAccountService.createAccount(this.accountForm.getRawValue()).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Cuenta bancaria registrada exitosamente.';
        
        // 3. AQUI: Al resetear el formulario, también usamos 'savings'
        this.accountForm.reset({ account_type: 'savings' }); 
        
        this.loadAccounts(); 
      },
      error: (err) => {
        this.isLoading = false;
        console.log('Error 422 capturado:', err.error); // Para ver el mensaje de Laravel

        if (err.status === 422 && err.error?.errors) {
          const primerCampoConError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[primerCampoConError][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar la cuenta de banco.';
        }
      }
    });
  }
}