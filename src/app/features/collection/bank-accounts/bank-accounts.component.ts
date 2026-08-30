import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BankAccountService } from '../../../core/services/bank-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { ToastService } from '../../../shared/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';

@Component({
  selector: 'app-bank-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './bank-accounts.component.html', // O './bank-accounts.html' si tu archivo se llama así
  styleUrls: ['./bank-accounts.component.scss'] // O './bank-accounts.scss'
})
export class BankAccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  get canCreate(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }
  accounts: any[] = [];
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  isModalOpen = false;

  totalAccounts = 0;
  savingsCount = 0;
  checkingCount = 0;
  accountForm = this.fb.nonNullable.group({
    bank_name: ['', Validators.required],
    account_number: ['', Validators.required],
    account_type: ['savings', Validators.required],
    holder_name: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  // Llama a esta función después de cargar las cuentas desde tu backend
  calculateKPIs() {
    this.totalAccounts = this.accounts.length;
    this.savingsCount = this.accounts.filter(a => a.account_type === 'savings').length;
    this.checkingCount = this.accounts.filter(a => a.account_type === 'checking').length;
  }

  // --- CONTROL DEL MODAL ---
  openModal() {
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.accountForm.reset({ account_type: 'savings' }); // Resetea con valor por defecto
  }

  loadAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        if (response.data && response.data.data) {
           this.accounts = response.data.data;
        } else if (response.data) {
           this.accounts = response.data;
        } else {
           this.accounts = [];
        }
        this.calculateKPIs();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando cuentas', err)
    });
  }

  onSubmit() {
    if (this.accountForm.invalid) {
      markAllAsTouched(this.accountForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = this.accountForm.getRawValue();

    this.bankAccountService.createAccount(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Cuenta bancaria registrada exitosamente.';

        this.accountForm.reset({ account_type: 'savings' });
        this.isModalOpen = false;
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading = false;

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