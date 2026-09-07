import {
  Component,
  ElementRef,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormControl
} from '@angular/forms';

import { ProjectService } from '../../../core/services/project.service';

import { BankAccountService } from '../../../core/services/bank-account.service';

import { LotService } from '../../../core/services/lot.service';

import { AuthService } from '../../../core/services/auth.service';

import { AppRoles } from '../../../core/models/app-roles';

import {
  ActivitySubjectType
} from '../../../core/models/activity-entry.model';

import { RouterModule } from '@angular/router';

import { ToastService } from '../../../shared/services/toast.service';

import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';

import { BitacoraModalComponent } from '../../../shared/components/bitacora-modal/bitacora-modal.component';

import {
  markAllAsTouched,
  requiredArray,
  scrollToFirstInvalid
} from '../../../shared/utils/form-utils';


@Component({
  selector: 'app-projects',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FieldErrorComponent,
    BitacoraModalComponent
  ],

  templateUrl: './projects.component.html',

  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {

  // =========================================================
  // SERVICIOS
  // =========================================================

  private fb = inject(FormBuilder);

  private projectService = inject(ProjectService);

  private bankAccountService = inject(BankAccountService);

  private lotService = inject(LotService);

  private cdr = inject(ChangeDetectorRef);

  private authService = inject(AuthService);

  private toast = inject(ToastService);

  private host = inject(
    ElementRef<HTMLElement>
  );


  // =========================================================
  // PERMISOS
  // =========================================================

  get canCreate(): boolean {

    return this.authService.hasRole(
      AppRoles.ADMINISTRADOR
    );
  }


  get canViewBitacora(): boolean {

    return this.authService.hasRole(
      AppRoles.SOCIO_GERENCIA
    );
  }


  // =========================================================
  // DATOS
  // =========================================================

  projects: any[] = [];

  availableBankAccounts: any[] = [];


  // =========================================================
  // ESTADO
  // =========================================================

  isLoading = false;

  successMessage = '';

  errorMessage = '';


  // =========================================================
  // KPIs GLOBALES
  // =========================================================

  totalLots = 0;

  totalAvailableLots = 0;


  // =========================================================
  // ESTADÍSTICAS POR PROYECTO
  // =========================================================

  projectLotsStats: {
    [key: number]: {
      total: number;
      available: number;
    }
  } = {};


  // =========================================================
  // MODAL
  // =========================================================

  isModalOpen = false;

  isEditMode = false;

  selectedProject: any = null;


  // =========================================================
  // BITÁCORA
  // =========================================================

  isBitacoraOpen = false;

  bitacoraTitle = 'Bitácora del proyecto';

  bitacoraSubjectType: ActivitySubjectType = 'project';

  bitacoraSubjectId: number | null = null;


  // =========================================================
  // FORMULARIO
  // =========================================================

  projectForm = this.fb.group({

    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],

    location: [
      '',
      Validators.required
    ],

    description: [
      ''
    ],

    bank_account_ids: this.fb.array(
      [],
      requiredArray
    )

  });


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.loadProjects();

    if (this.canCreate) {

      this.loadBankAccounts();

    }

    // Conservamos la lógica de tu rama
    // para construir las estadísticas de lotes.
    this.loadLotsStats();

  }


  // =========================================================
  // CUENTAS BANCARIAS
  // =========================================================

  loadBankAccounts(): void {

    this.bankAccountService
      .getAccounts()
      .subscribe({

        next: (response) => {

          const responseData =
            Array.isArray(response)

              ? response

              : response &&
                typeof response === 'object' &&
                'data' in response

                ? response.data

                : undefined;


          this.availableBankAccounts =
            Array.isArray(responseData)

              ? responseData

              : Array.isArray(
                  (
                    responseData as {
                      data?: unknown
                    }
                  )?.data
                )

                ? (
                    responseData as {
                      data: any[]
                    }
                  ).data

                : [];


          this.cdr.detectChanges();
        },


        error: (err) => {

          console.error(
            'Error cargando cuentas bancarias',
            err
          );


          this.availableBankAccounts = [];

          this.errorMessage =
            'No se pudieron cargar las cuentas bancarias. Intente nuevamente.';


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // PROYECTOS
  // =========================================================

  loadProjects(): void {

    this.projectService
      .getProjects()
      .subscribe({

        next: (response) => {

          const responseData =
            Array.isArray(response)

              ? response

              : response &&
                typeof response === 'object' &&
                'data' in response

                ? response.data

                : undefined;


          this.projects =
            Array.isArray(responseData)

              ? responseData

              : Array.isArray(
                  (
                    responseData as {
                      data?: unknown
                    }
                  )?.data
                )

                ? (
                    responseData as {
                      data: any[]
                    }
                  ).data

                : [];


          /*
           * main ya entrega las estadísticas de lotes
           * dentro de cada proyecto.
           *
           * Las aplicamos como primera fuente.
           */
          this.applyLotStatsFromProjects();


          this.cdr.detectChanges();
        },


        error: (err) => {

          console.error(
            'Error cargando proyectos',
            err
          );


          this.projects = [];

          this.errorMessage =
            'No se pudieron cargar los proyectos. Intente nuevamente.';


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // ESTADÍSTICAS DESDE LOS PROYECTOS
  // =========================================================

  private applyLotStatsFromProjects(): void {

    this.totalLots = 0;

    this.totalAvailableLots = 0;

    this.projectLotsStats = {};


    this.projects.forEach(
      (project) => {

        const total =
          Number(
            project.total_lots_count ?? 0
          );


        const available =
          Number(
            project.available_lots_count ?? 0
          );


        this.totalLots += total;

        this.totalAvailableLots += available;


        if (project.id != null) {

          this.projectLotsStats[
            project.id
          ] = {
            total,
            available
          };

        }

      }
    );
  }


  // =========================================================
  // ESTADÍSTICAS DESDE LOTES
  // =========================================================

  loadLotsStats(): void {

    this.lotService
      .getAllLots()
      .subscribe({

        next: (response) => {

          let allLots: any[] = [];


          const data =
            Array.isArray(response)

              ? response

              : response?.data;


          if (Array.isArray(data)) {

            allLots = data;

          } else if (
            data &&
            typeof data === 'object' &&
            'data' in data &&
            Array.isArray(
              (
                data as {
                  data?: unknown
                }
              ).data
            )
          ) {

            allLots =
              (
                data as {
                  data: any[]
                }
              ).data;
          }


          /*
           * En caso de que el backend entregue
           * paginación, getAllLots() puede devolver
           * solamente la página actual.
           *
           * Aun así conservamos esta lógica porque
           * tu rama ya la utilizaba.
           */
          this.totalLots =
            allLots.length;


          this.totalAvailableLots = 0;

          this.projectLotsStats = {};


          allLots.forEach(
            (lot: any) => {

              // ---------------------------------------------
              // ESTADO
              // ---------------------------------------------

              const statusStr =
                typeof lot.status === 'object'

                  ? (
                      lot.status?.value ||
                      lot.status?.name
                    )

                  : lot.status;


              const statusLimpio =
                String(statusStr)
                  .toLowerCase()
                  .trim();


              const isAvailable =
                statusLimpio === 'available' ||
                statusLimpio === 'disponible';


              // ---------------------------------------------
              // KPI GLOBAL
              // ---------------------------------------------

              if (isAvailable) {

                this.totalAvailableLots++;

              }


              // ---------------------------------------------
              // KPI POR PROYECTO
              // ---------------------------------------------

              const pId =
                lot.project_id;


              if (pId) {

                if (
                  !this.projectLotsStats[pId]
                ) {

                  this.projectLotsStats[pId] = {
                    total: 0,
                    available: 0
                  };

                }


                this.projectLotsStats[pId].total++;


                if (isAvailable) {

                  this.projectLotsStats[
                    pId
                  ].available++;

                }

              }

            }
          );


          this.cdr.detectChanges();
        },


        error: (err) => {

          console.error(
            'Error cargando estadísticas de lotes',
            err
          );


          this.toast.show(
            'No se pudieron cargar las estadísticas de lotes.',
            'error'
          );


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // CHECKBOX CUENTAS BANCARIAS
  // =========================================================

  onCheckboxChange(e: any): void {

    const bankAccountIds =
      this.projectForm.get(
        'bank_account_ids'
      ) as FormArray;


    if (e.target.checked) {

      bankAccountIds.push(
        new FormControl(
          e.target.value
        )
      );

    } else {

      let i = 0;


      bankAccountIds.controls.forEach(
        (item: any) => {

          if (
            item.value == e.target.value
          ) {

            bankAccountIds.removeAt(i);

            return;
          }


          i++;

        }
      );
    }


    bankAccountIds.markAsDirty();

    bankAccountIds.markAsTouched();

    bankAccountIds.updateValueAndValidity();
  }


  // =========================================================
  // MODAL CREAR
  // =========================================================

  openModal(): void {

    this.isEditMode = false;

    this.selectedProject = null;


    this.projectForm.reset();


    (
      this.projectForm.get(
        'bank_account_ids'
      ) as FormArray
    ).clear();


    this.isModalOpen = true;

    this.successMessage = '';

    this.errorMessage = '';
  }


  // =========================================================
  // MODAL EDITAR
  // =========================================================

  openEditModal(project: any): void {

    this.isEditMode = true;

    this.selectedProject = project;


    const bankAccountIds =
      this.projectForm.get(
        'bank_account_ids'
      ) as FormArray;


    bankAccountIds.clear();


    this.projectForm.patchValue({

      name:
        project.name,

      location:
        project.location,

      description:
        project.description

    });


    if (project.bank_accounts) {

      project.bank_accounts.forEach(
        (account: any) => {

          bankAccountIds.push(
            new FormControl(
              account.id
            )
          );

        }
      );

    }


    this.errorMessage = '';

    this.successMessage = '';

    this.isModalOpen = true;
  }


  // =========================================================
  // ARCHIVAR PROYECTO
  // =========================================================

  archiveProject(project: any): void {

    this.projectService
      .archiveProject(project.id)
      .subscribe({

        next: () => {

          this.toast.show(
            'Proyecto archivado correctamente.',
            'success'
          );


          this.loadProjects();

        },


        error: (err) => {

          if (err.status === 422) {

            this.toast.show(
              err.error?.message ||
                'Solo se pueden archivar proyectos activos.',
              'error'
            );

          } else {

            this.toast.show(
              'No se pudo archivar el proyecto.',
              'error'
            );

          }

        }

      });
  }


  // =========================================================
  // ACTIVAR PROYECTO
  // =========================================================

  activateProject(project: any): void {

    this.projectService
      .activateProject(project.id)
      .subscribe({

        next: () => {

          this.toast.show(
            'Proyecto activado correctamente.',
            'success'
          );


          this.loadProjects();

        },


        error: (err) => {

          if (err.status === 422) {

            this.toast.show(
              err.error?.message ||
                'Solo se pueden activar proyectos archivados.',
              'error'
            );

          } else {

            this.toast.show(
              'No se pudo activar el proyecto.',
              'error'
            );

          }

        }

      });
  }


  // =========================================================
  // CERRAR MODAL
  // =========================================================

  closeModal(): void {

    this.isModalOpen = false;

    this.isEditMode = false;

    this.selectedProject = null;


    this.projectForm.reset();


    (
      this.projectForm.get(
        'bank_account_ids'
      ) as FormArray
    ).clear();


    // Limpiar checkboxes físicos
    document
      .querySelectorAll(
        'input[type=checkbox]'
      )
      .forEach(
        (el: any) =>
          el.checked = false
      );
  }


  // =========================================================
  // BITÁCORA
  // =========================================================

  openBitacora(
    project: {
      id?: number;
      name?: string
    }
  ): void {

    if (
      !this.canViewBitacora ||
      project.id == null
    ) {

      return;
    }


    this.bitacoraTitle =
      project.name

        ? `Bitácora de ${project.name}`

        : 'Bitácora del proyecto';


    this.bitacoraSubjectType =
      'project';


    this.bitacoraSubjectId =
      Number(project.id);


    this.isBitacoraOpen = true;
  }


  closeBitacora(): void {

    this.isBitacoraOpen = false;

    this.bitacoraSubjectId = null;
  }


  // =========================================================
  // GUARDAR
  // =========================================================

  onSubmit(): void {

    if (this.projectForm.invalid) {

      markAllAsTouched(
        this.projectForm
      );


      scrollToFirstInvalid(
        this.host.nativeElement
      );


      this.toast.show(
        'Formulario incompleto',
        'error',
        'Revisa los campos marcados en rojo'
      );


      return;
    }


    this.isLoading = true;

    this.successMessage = '';

    this.errorMessage = '';


   // =========================================================
// EDITAR
// =========================================================

if (
  this.isEditMode &&
  this.selectedProject
) {

  const updateData =
    this.projectForm.getRawValue();

  this.projectService
    .updateProject(
      this.selectedProject.id,
      updateData
    )
    .subscribe({

      next: () => {

        this.isLoading = false;

        this.toast.show(
          'Proyecto actualizado',
          'success',
          'El proyecto se actualizó correctamente.'
        );

        this.closeModal();

        this.loadProjects();

        this.loadLotsStats();

        this.cdr.detectChanges();
      },

      error: (err) => {

        this.isLoading = false;

        if (
          err.status === 422 &&
          err.error?.errors
        ) {

          const primerError =
            Object.keys(
              err.error.errors
            )[0];

          this.errorMessage =
            err.error.errors[
              primerError
            ][0];

        } else if (
          err.error?.message
        ) {

          this.errorMessage =
            err.error.message;

        } else {

          this.errorMessage =
            'Hubo un error al actualizar el proyecto.';
        }

        this.cdr.detectChanges();
      }

    });

  return;
}

    /*
     * CREAR
     */

    this.projectService
      .createProject(
        this.projectForm.value
      )
      .subscribe({

        next: () => {

          this.isLoading = false;


          this.closeModal();


          this.loadProjects();

          this.loadLotsStats();


          this.cdr.detectChanges();
        },


        error: (err) => {

          this.isLoading = false;


          if (
            err.status === 422 &&
            err.error?.errors
          ) {

            const primerError =
              Object.keys(
                err.error.errors
              )[0];


            this.errorMessage =
              err.error.errors[
                primerError
              ][0];

          } else {

            this.errorMessage =
              'Hubo un error al registrar el proyecto.';
          }


          this.cdr.detectChanges();
        }

      });
  }
}