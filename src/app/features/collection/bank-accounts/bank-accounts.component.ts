import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BankAccountService } from '../../../core/services/bank-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { BankAccount } from '../../../core/models/bank-account.model';
import { unwrapResource } from '../../../core/models/api-response';
import { ToastService } from '../../../shared/services/toast.service';
import { JustChangedTracker, insertAtFront } from '../../../shared/utils/list-feedback';
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
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  isModalOpen = false;
  private readonly justChanged = new JustChangedTracker();

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
    this.savingsCount = this.accounts.filter((account) => this.accountTypeOf(account) === 'savings').length;
    this.checkingCount = this.accounts.filter((account) => this.accountTypeOf(account) === 'checking').length;
  }

  // --- CONTROL DEL MODAL ---
  openModal() {
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal() {
    if (this.isSaving) {
      return;
    }

    this.isModalOpen = false;
    this.accountForm.reset({ account_type: 'savings' });
  }

  loadAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response?.data;

        let accounts: any[] = [];
        if (Array.isArray(payload)) {
          accounts = payload;
        } else if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
          accounts = (payload as { data: any[] }).data;
        }

        this.accounts = accounts;
        this.calculateKPIs();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando cuentas', err);
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit() {
    if (this.accountForm.invalid) {
      markAllAsTouched(this.accountForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = this.accountForm.getRawValue();

    this.bankAccountService.createAccount(payload).subscribe({
      next: (response) => {
        this.isSaving = false;
        const created = {
          ...payload,
          ...(unwrapResource<BankAccount>(response) ?? {}),
        };
        this.accounts = insertAtFront(this.accounts, created);
        this.calculateKPIs();
        this.accountForm.reset({ account_type: 'savings' });
        this.isModalOpen = false;
        this.toast.show('Cuenta registrada', 'success', 'La cuenta bancaria ya está disponible para recaudos.');
        this.markJustChanged(created.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;

        if (err.status === 422 && err.error?.errors) {
          const primerCampoConError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[primerCampoConError][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar la cuenta de banco.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  isJustChanged(id: number | null | undefined): boolean {
    return this.justChanged.has(id);
  }

  private markJustChanged(id: number | null | undefined): void {
    this.justChanged.mark(id, () => this.cdr.detectChanges());
  }

  private accountTypeOf(account: { account_type?: string | { value?: string } }): string {
    const type = account?.account_type;
    return String((typeof type === 'object' ? type?.value : type) ?? '').toLowerCase();
  }
}