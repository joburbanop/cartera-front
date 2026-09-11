import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BankAccountService } from '../../../core/services/bank-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { BankAccount } from '../../../core/models/bank-account.model';
import {unwrapResource,unwrapPaginator} from '../../../core/models/api-response';
import { ToastService } from '../../../shared/services/toast.service';
import { JustChangedTracker, insertAtFront } from '../../../shared/utils/list-feedback';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-bank-accounts',
  standalone: true,
 imports: [
  CommonModule,
  ReactiveFormsModule,
  FieldErrorComponent,
  PaginationComponent
],
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
  accounts: BankAccount[] = [];
  showArchived = false;
  totalArchivedAccounts = 0;
  isLoading = true;
  isSaving = false;
  mutatingAccountId: number | null = null;
  successMessage = '';
  errorMessage = '';
  isModalOpen = false;
  editingAccountId: number | null = null;
  currentPage = 1;
  pageSize = 10;

  private readonly justChanged = new JustChangedTracker();

  totalAccounts = 0;
  savingsCount = 0;
  checkingCount = 0;
  
  accountForm = this.fb.nonNullable.group({
    bank_name: this.fb.nonNullable.control('', Validators.required),
    account_number: this.fb.nonNullable.control('', Validators.required),
    account_type: this.fb.nonNullable.control<'savings' | 'checking'>(
      'savings',
      Validators.required
    ),
    holder_name: this.fb.nonNullable.control('', Validators.required),
    is_active: this.fb.nonNullable.control(true, Validators.required)
  });
  ngOnInit(): void {
    this.loadAccounts();
  }

  // Llama a esta función después de cargar las cuentas desde tu backend
  calculateKPIs(): void {
    this.savingsCount = this.accounts.filter(
      (account) => this.accountTypeOf(account) === 'savings'
    ).length;

    this.checkingCount = this.accounts.filter(
      (account) => this.accountTypeOf(account) === 'checking'
    ).length;
  }

  // --- CONTROL DEL MODAL ---
  openModal(): void {
    this.editingAccountId = null;
    this.accountForm.reset({
      bank_name: '',
      account_number: '',
      account_type: 'savings',
      holder_name: '',
      is_active: true
    });

    this.errorMessage = '';
    this.successMessage = '';
    this.isModalOpen = true;
  }
  editAccount(account: BankAccount): void {
    this.editingAccountId = account.id;

    this.accountForm.patchValue({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_type: account.account_type,
      holder_name: account.holder_name,
      is_active: account.is_active
    });

    this.errorMessage = '';
    this.successMessage = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.isModalOpen = false;
    this.editingAccountId = null;

    this.accountForm.reset({
      bank_name: '',
      account_number: '',
      account_type: 'savings',
      holder_name: ''
    });

    this.errorMessage = '';
  }

  loadAccounts(page = 1): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bankAccountService.getAccounts({
      page,
      perPage: this.pageSize
    }).subscribe({
      next: (response) => {
        const paginator = unwrapPaginator(response);

        this.accounts = paginator.items as BankAccount[];
        this.currentPage = paginator.currentPage;
        this.totalAccounts = paginator.total;

        this.calculateKPIs();
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando cuentas', err);

        this.accounts = [];
        this.totalAccounts = 0;
        this.isLoading = false;

        this.errorMessage =
          err.error?.message ||
          'No fue posible cargar las cuentas bancarias.';

        this.cdr.detectChanges();
      }
    });
  }

  loadArchivedAccounts(page = 1): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bankAccountService.getArchivedAccounts({
      page,
      perPage: this.pageSize
    }).subscribe({
      next: (response) => {
        const paginator = unwrapPaginator(response);

        this.accounts = paginator.items as BankAccount[];
        this.currentPage = paginator.currentPage;
        this.totalArchivedAccounts = paginator.total;
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando cuentas archivadas', err);

        this.accounts = [];
        this.totalArchivedAccounts = 0;
        this.isLoading = false;

        this.errorMessage =
          err.error?.message ||
          'No fue posible cargar las cuentas archivadas.';

        this.cdr.detectChanges();
      }
    });
  }
  
 toggleArchived(): void {
    this.showArchived = !this.showArchived;
    this.currentPage = 1;
    this.accounts = [];
    this.errorMessage = '';

    if (this.showArchived) {
      this.loadArchivedAccounts(1);
    } else {
      this.loadAccounts(1);
    }
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      markAllAsTouched(this.accountForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show(
        'Formulario incompleto',
        'error',
        'Revisa los campos marcados en rojo'
      );
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.editingAccountId !== null) {
      const payload = {
        holder_name: this.accountForm.controls.holder_name.value,
        is_active: this.accountForm.controls.is_active.value
      };
      this.bankAccountService
        .updateAccount(this.editingAccountId, payload)
        .subscribe({
          next: (response) => {
            this.isSaving = false;

            const updated = unwrapResource<BankAccount>(response);

            if (!updated) {
              this.errorMessage =
                'La cuenta fue actualizada, pero no se recibió la información.';
              this.cdr.detectChanges();
              return;
            }

            this.accounts = this.accounts.map((account) =>
              account.id === updated.id ? updated : account
            );

            this.calculateKPIs();
            this.closeModal();

            this.toast.show(
              'Cuenta actualizada',
              'success',
              'La cuenta bancaria fue actualizada exitosamente.'
            );

            this.markJustChanged(updated.id);
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isSaving = false;

            this.errorMessage =
              err.error?.message ||
              Object.values(err.error?.errors ?? {}).flat().join('. ') ||
              'No fue posible actualizar la cuenta bancaria.';

            this.cdr.detectChanges();
          }
        });

      return;
    }

    const payload = this.accountForm.getRawValue();

    this.bankAccountService.createAccount(payload).subscribe({
      next: (response) => {
        this.isSaving = false;

        const created = unwrapResource<BankAccount>(response);

        if (!created) {
          this.errorMessage =
            'La cuenta fue creada, pero no se recibió la información.';
          this.cdr.detectChanges();
          return;
        }

        this.accounts = insertAtFront(this.accounts, created);
        this.calculateKPIs();

        this.closeModal();

        this.toast.show(
          'Cuenta registrada',
          'success',
          'La cuenta bancaria ya está disponible para recaudos.'
        );

        this.markJustChanged(created.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;

        this.errorMessage =
          err.error?.message ||
          Object.values(err.error?.errors ?? {}).flat().join('. ') ||
          'No fue posible registrar la cuenta bancaria.';

        this.cdr.detectChanges();
      }
    });
  }

  archiveAccount(account: BankAccount): void {
    const confirmed = confirm(
      `¿Estás seguro de que deseas archivar la cuenta de ${account.bank_name} - ${account.account_number}?`
    );

    if (!confirmed) {
      return;
    }

    this.mutatingAccountId = account.id;
    this.errorMessage = '';

    this.bankAccountService
      .archiveAccount(account.id)
      .pipe(
        finalize(() => {
          this.mutatingAccountId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.accounts = this.accounts.filter(
            (item) => item.id !== account.id
          );

          this.calculateKPIs();

          this.toast.show(
            'Cuenta archivada',
            'success',
            'La cuenta bancaria fue archivada exitosamente.'
          );
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message ||
            Object.values(err.error?.errors ?? {}).flat().join('. ') ||
            'No fue posible archivar la cuenta bancaria.';

          this.toast.show(
            'No se pudo archivar',
            'error',
            this.errorMessage
          );
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

  restoreAccount(account: BankAccount): void {
    const confirmed = confirm(
      `¿Estás seguro de que deseas restaurar la cuenta de ${account.bank_name} - ${account.account_number}?`
    );

    if (!confirmed) {
      return;
    }

    this.mutatingAccountId = account.id;
    this.errorMessage = '';

    this.bankAccountService
      .restoreAccount(account.id)
      .pipe(
        finalize(() => {
          this.mutatingAccountId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.toast.show(
            'Cuenta restaurada',
            'success',
            'La cuenta bancaria fue restaurada exitosamente.'
          );

          // Volver al listado de cuentas activas
          this.showArchived = false;
          this.currentPage = 1;
          this.loadAccounts();
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message ||
            Object.values(err.error?.errors ?? {}).flat().join('. ') ||
            'No fue posible restaurar la cuenta bancaria.';

          this.toast.show(
            'No se pudo restaurar',
            'error',
            this.errorMessage
          );
        }
      });
  }

}