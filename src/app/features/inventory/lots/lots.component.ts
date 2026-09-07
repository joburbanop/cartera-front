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
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterModule
} from '@angular/router';

import { ProjectService } from '../../../core/services/project.service';

import {
  LotListFilters,
  LotService
} from '../../../core/services/lot.service';

import { AuthService } from '../../../core/services/auth.service';

import { AppRoles } from '../../../core/models/app-roles';

import {
  ActivitySubjectType
} from '../../../core/models/activity-entry.model';

import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';

import { unwrapResource } from '../../../core/models/api-response';
import { ToastService } from '../../../shared/services/toast.service';
import { JustChangedTracker, LeavingTracker, insertAtFront, removeById, replaceById } from '../../../shared/utils/list-feedback';

import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';

import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

import { BitacoraModalComponent } from '../../../shared/components/bitacora-modal/bitacora-modal.component';

import { LotStatusBadgePipe, LotStatusLabelPipe, lotStatusValue } from '../../../shared/pipes/lot-status-label.pipe';

import {
  markAllAsTouched,
  scrollToFirstInvalid
} from '../../../shared/utils/form-utils';

import {
  unwrapPaginator
} from '../../../core/models/api-response';

import { Lot } from '../../../core/models/lot.model';


@Component({
  selector: 'app-lots',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyMaskDirective,
    FieldErrorComponent,
    PaginationComponent,
    SkeletonComponent,
    BitacoraModalComponent,
    LotStatusLabelPipe,
    LotStatusBadgePipe
  ],

  templateUrl: './lots.component.html',
  styleUrl: './lots.component.scss'
})
export class LotsComponent implements OnInit {

  private fb = inject(FormBuilder);

  private projectService = inject(ProjectService);

  private lotService = inject(LotService);

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private cdr = inject(ChangeDetectorRef);

  private authService = inject(AuthService);

  private toast = inject(ToastService);

  private host = inject(ElementRef<HTMLElement>);


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

  lots: any[] = [];

  archivedLots: Lot[] = [];

  selectedProjectId: number | null = null;

  activeProject: any = null;


  // =========================================================
  // KPIs
  // =========================================================

  projectTotalLots = 0;

  projectAvailableLots = 0;

  projectTotalValue = 0;


  // =========================================================
  // CONTROL DEL UI
  // =========================================================

  isLoading = true;

  isSaving = false;

  mutatingLotId: number | null = null;

  private readonly justChanged = new JustChangedTracker();
  private readonly leaving = new LeavingTracker();

  isModalOpen = false;

  isEditMode = false;

  selectedLot: any = null;

  isBitacoraOpen = false;

  bitacoraTitle = 'Bitácora del lote';

  bitacoraSubjectType: ActivitySubjectType = 'lot';

  bitacoraSubjectId: number | null = null;

  errorMessage = '';

  hasProjectInRoute = false;


  // =========================================================
  // PAGINACIÓN
  // =========================================================

  pageSize = 20;

  currentPage = 1;

  lotsTotal = 0;


  // =========================================================
  // ARCHIVADOS
  // =========================================================

  showArchivedLots = false;


  // =========================================================
  // VISTA
  // =========================================================

  get isGlobalView(): boolean {
    return !this.selectedProjectId;
  }


  /**
   * Los lotes ya vienen paginados desde el backend.
   * Por eso no debemos volver a hacer slice().
   */
  get pagedLots(): any[] {
    return this.lots;
  }


  // =========================================================
  // FORMULARIO DEL LOTE
  // =========================================================

  lotForm = this.fb.group({

    project_id: [
      '',
      Validators.required
    ],

    number: [
      '',
      Validators.required
    ],

    area_m2: [
      '',
      [
        Validators.required,
        Validators.min(1)
      ]
    ],

    list_price: [
      '',
      [
        Validators.required,
        Validators.min(0)
      ]
    ],

    price_m2: [
      '0'
    ],

    status: [
      'disponible',
      Validators.required
    ],

    type: [
      'residential',
      Validators.required
    ]
  });


  // =========================================================
  // FILTROS
  // =========================================================

  filterForm = this.fb.group({

    number: [''],

    status: [''],

    project_id: [''],

    plan_type: [''],

    cartera: [''],

    customer: ['']
  });


  // =========================================================
  // ESTADOS DE LOTE
  // =========================================================

  readonly lotStatusOptions = [

    {
      value: 'disponible',
      label: 'Disponible'
    },

    {
      value: 'preventa',
      label: 'Preventa'
    },

    {
      value: 'separado',
      label: 'Separado'
    },

    {
      value: 'vendido',
      label: 'Vendido'
    },

    {
      value: 'abogado',
      label: 'Renegociación'
    }

  ];


  // =========================================================
  // LABEL DE RESULTADOS
  // =========================================================

  get lotsFoundLabel(): string {

    const n = this.lotsTotal;

    return n === 1
      ? '1 lote encontrado'
      : `${n} lotes encontrados`;
  }


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {

      const projectId = params['projectId'];


      // -----------------------------------------------------
      // PROYECTO
      // -----------------------------------------------------

      if (projectId) {

        const selectedProjectId =
          Number(projectId);

        this.hasProjectInRoute = true;

        this.selectedProjectId =
          selectedProjectId;

        this.lotForm.patchValue({
          project_id:
            selectedProjectId.toString()
        });

        this.activeProject =
          this.projects.find(
            p => p.id === selectedProjectId
          ) ?? null;

      } else {

        this.hasProjectInRoute = false;

        this.selectedProjectId = null;

        this.activeProject = null;

        this.lotForm.patchValue({
          project_id: ''
        });
      }


      // -----------------------------------------------------
      // FILTROS DESDE URL
      // -----------------------------------------------------

      this.filterForm.patchValue({

        number:
          params['number'] ?? '',

        status:
          params['status'] ?? '',

        project_id:
          projectId
            ? String(projectId)
            : '',

        plan_type:
          params['plan_type'] ?? '',

        cartera:
          params['cartera'] ?? '',

        customer:
          params['customer'] ?? ''

      }, {
        emitEvent: false
      });


      // -----------------------------------------------------
      // CARGA INICIAL
      // -----------------------------------------------------

      this.loadProjects();

      this.loadLots(1);

    });
  }


  // =========================================================
  // PROYECTOS
  // =========================================================

  loadProjects(): void {

    this.projectService.getProjects().subscribe({

      next: (response) => {

        const data =
          response &&
          typeof response === 'object' &&
          'data' in response
            ? response.data
            : response;


        this.projects =
          Array.isArray(data)
            ? data
            : Array.isArray(
                (data as {
                  data?: unknown
                })?.data
              )
              ? (
                  data as {
                    data: any[]
                  }
                ).data
              : [];


        if (this.selectedProjectId) {

          this.activeProject =
            this.projects.find(
              p => p.id === this.selectedProjectId
            ) ?? null;
        }


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
  // SELECCIÓN DE PROYECTO
  // =========================================================

  onProjectSelect(event: any): void {

    this.currentPage = 1;

    const pId =
      Number(event.target.value);


    if (pId) {

      this.router.navigate(
        [],
        {
          queryParams: {
            projectId: pId
          }
        }
      );

    } else {

      this.router.navigate([]);

      this.selectedProjectId = null;

      this.activeProject = null;

      this.lots = [];
    }
  }


  selectProject(projectId: number): void {

    this.currentPage = 1;

    this.selectedProjectId =
      projectId;

    this.lotForm.patchValue({
      project_id:
        projectId.toString()
    });


    if (this.projects.length > 0) {

      this.activeProject =
        this.projects.find(
          p => p.id === projectId
        );
    }


    this.loadLots(1);
  }


  // =========================================================
  // PAGINACIÓN
  // =========================================================

  onLotsPageChange(page: number): void {

    this.loadLots(page);
  }


  // =========================================================
  // FILTROS
  // =========================================================

  currentFilters(): LotListFilters {

    const value =
      this.filterForm.getRawValue();


    const filters: LotListFilters = {};


    const number =
      (value.number ?? '').trim();

    const status =
      (value.status ?? '').trim();

    const planType =
      (value.plan_type ?? '').trim();

    const cartera =
      (value.cartera ?? '').trim();

    const customer =
      (value.customer ?? '').trim();


    if (number) {

      filters.number = number;
    }


    if (status) {

      filters.status = status;
    }


    if (planType) {

      filters.plan_type = planType;
    }


    if (cartera) {

      filters.cartera = cartera;
    }


    if (customer) {

      filters.customer = customer;
    }


    return filters;
  }


  applyFilters(): void {

    const projectId =
      (
        this.filterForm.get(
          'project_id'
        )?.value ?? ''
      ).trim();


    const filters =
      this.currentFilters();


    const queryParams:
      Record<string, string> = {
        ...filters
      };


    if (projectId) {

      queryParams['projectId'] =
        projectId;
    }


    void this.router.navigate(
      ['/lots'],
      {
        queryParams
      }
    );
  }


  clearFilters(): void {

    this.filterForm.reset({

      number: '',

      status: '',

      project_id: '',

      plan_type: '',

      cartera: '',

      customer: ''

    }, {
      emitEvent: false
    });


    this.currentPage = 1;


    void this.router.navigate(
      ['/lots'],
      {
        queryParams: {}
      }
    );
  }


  // =========================================================
  // CARGAR LOTES
  // =========================================================

  loadLots(
    page = this.currentPage
  ): void {

    this.currentPage = page;


    const projectIdRaw =
      (
        this.filterForm.get(
          'project_id'
        )?.value ?? ''
      ).trim();


    const projectId =
      projectIdRaw
        ? Number(projectIdRaw)
        : (
            this.selectedProjectId
              ?? undefined
          );


    this.lotService
      .getLots(
        projectId || undefined,
        page,
        this.pageSize,
        this.currentFilters()
      )
      .subscribe({

        next: (response) => {

          const pageData =
            unwrapPaginator(response);


          this.lots =
            pageData.items;


          this.lotsTotal =
            pageData.total;


          this.currentPage =
            pageData.currentPage;


          // -------------------------------------------------
          // KPIs
          // -------------------------------------------------

          if (this.selectedProjectId) {

            this.calculateProjectKPIs();

          } else {

            this.projectTotalLots =
              this.lotsTotal;


            this.projectAvailableLots =
              this.lots.filter(lot => this.isLotAvailable(lot)).length;


            this.projectTotalValue =
              this.lots.reduce(
                (sum, lot) =>
                  sum +
                  Number(
                    lot.list_price || 0
                  ),
                0
              );
          }


          this.isLoading = false;
          this.cdr.detectChanges();
        },


        error: (err) => {

          console.error(
            'Error cargando lotes',
            err
          );

          this.isLoading = false;
          this.lots = [];

          this.lotsTotal = 0;

          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // KPIs DEL PROYECTO
  // =========================================================

  calculateProjectKPIs(): void {

    this.projectTotalLots =
      Number(
        this.activeProject?.total_lots_count
        ?? this.lotsTotal
      );


    this.projectAvailableLots =
      Number(
        this.activeProject?.available_lots_count
        ?? 0
      );


    this.projectTotalValue =
      this.lots.reduce(
        (sum, lot) =>
          sum +
          Number(
            lot.list_price || 0
          ),
        0
      );
  }


  // =========================================================
  // LOTES ARCHIVADOS
  // =========================================================

  loadArchivedLots(): void {

    const request$ =
      this.selectedProjectId

        ? this.lotService.getArchivedLots(
            this.selectedProjectId
          )

        : this.lotService.getArchivedLots();


    request$.subscribe({

      next: (response) => {

        const data =
          Array.isArray(response)

            ? response

            : response &&
              typeof response === 'object' &&
              'data' in response

              ? response.data

              : [];


        this.archivedLots =
          Array.isArray(data)
            ? data
            : [];


        this.cdr.detectChanges();
      },


      error: (err) => {

        console.error(
          'Error cargando lotes archivados',
          err
        );

        this.archivedLots = [];


        this.toast.show(
          'Error',
          'error',
          'No se pudieron cargar los lotes archivados.'
        );


        this.cdr.detectChanges();
      }

    });
  }


  showArchived(): void {

    this.showArchivedLots = true;

    this.currentPage = 1;

    this.loadArchivedLots();
  }


  showActive(): void {

    this.showArchivedLots = false;

    this.currentPage = 1;

    this.loadLots(1);
  }


  // =========================================================
  // MODAL NUEVO LOTE
  // =========================================================

  openModal(): void {

    this.isEditMode = false;

    this.selectedLot = null;

    this.isModalOpen = true;

    this.errorMessage = '';


    const projectId =
      this.selectedProjectId ??
      this.lotForm.get(
        'project_id'
      )?.value;


    this.lotForm.reset({

      project_id:
        projectId
          ? String(projectId)
          : '',

      number: '',

      area_m2: '',

      list_price: '',

      price_m2: '0',

      status: 'disponible',

      type: 'residential'

    });
  }


  // =========================================================
  // MODAL EDITAR LOTE
  // =========================================================

  openEditModal(lot: any): void {

    const status =
      typeof lot.status === 'object'

        ? (
            lot.status?.value ||
            lot.status?.name
          )

        : lot.status;


    const type =
      typeof lot.type === 'object'

        ? (
            lot.type?.value ||
            lot.type?.name
          )

        : lot.type;


    this.selectedLot = lot;

    this.isEditMode = true;

    this.isModalOpen = true;

    this.errorMessage = '';


    this.lotForm.patchValue({

      project_id:
        lot.project_id?.toString()
        ?? '',

      number:
        lot.number
        ?? '',

      area_m2:
        lot.area_m2?.toString()
        ?? '',

      list_price:
        lot.list_price?.toString()
        ?? '',

      price_m2:
        lot.price_m2?.toString()
        ?? '0',

      status:
        status
        ?? 'disponible',

      type:
        type
        ?? 'residential'

    });
  }


  // =========================================================
  // CERRAR MODAL
  // =========================================================

  closeModal(): void {

    this.isModalOpen = false;

    this.isEditMode = false;

    this.selectedLot = null;


    this.lotForm.reset({

      project_id:
        this.selectedProjectId
          ? String(
              this.selectedProjectId
            )
          : '',

      number: '',

      area_m2: '',

      list_price: '',

      price_m2: '0',

      status: 'disponible',

      type: 'residential'

    });
  }


  // =========================================================
  // BITÁCORA
  // =========================================================

  openBitacora(
    lot: {
      id?: number;
      number?: string
    }
  ): void {

    if (
      !this.canViewBitacora ||
      lot.id == null
    ) {
      return;
    }


    this.bitacoraTitle =
      lot.number
        ? `Bitácora del lote ${lot.number}`
        : 'Bitácora del lote';


    this.bitacoraSubjectType = 'lot';

    this.bitacoraSubjectId =
      Number(lot.id);

    this.isBitacoraOpen = true;
  }


  closeBitacora(): void {

    this.isBitacoraOpen = false;

    this.bitacoraSubjectId = null;
  }


  // =========================================================
  // CONTRATOS
  // =========================================================

  lotContractsCount(
    lot: {
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): number {

    if (
      lot.contracts_count != null
    ) {
      return Number(
        lot.contracts_count
      );
    }


    return Array.isArray(
      lot.contracts
    )
      ? lot.contracts.length
      : 0;
  }


  singleContractId(
    lot: {
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): number | null {

    if (
      this.lotContractsCount(lot) !== 1
    ) {
      return null;
    }


    const id =
      Number(
        lot.contracts?.[0]?.id ?? 0
      );


    return id > 0
      ? id
      : null;
  }


  lotResumeCommands(
    lot: {
      id?: number;
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): (string | number)[] {

    const contractId =
      this.singleContractId(lot);


    return contractId
      ? ['/amortization', contractId]
      : ['/contracts'];
  }


  lotResumeQueryParams(
    lot: {
      id?: number;
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): Record<string, number> {

    return this.singleContractId(lot)
      ? {}
      : {
          lotId: Number(lot.id)
        };
  }


  hasLotContractActions(
    lot: {
      status?: string | { value?: string };
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): boolean {

    return !this.isLotAvailable(lot)
      && this.lotContractsCount(lot) > 0;
  }


  lotContractActionTitle(
    lot: {
      contracts_count?: number;
      contracts?: {
        id?: number
      }[]
    }
  ): string {

    return this.singleContractId(lot)
      ? 'Ver contrato'
      : 'Ver contratos';
  }


  // =========================================================
  // GUARDADO
  // =========================================================

  onSubmit(): void {

    if (this.lotForm.invalid) {

      markAllAsTouched(
        this.lotForm
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


    this.isSaving = true;

    this.errorMessage = '';


    const formValues =
      this.lotForm.getRawValue();


    const area =
      Number(
        formValues.area_m2
      );


    const price =
      Number(
        formValues.list_price
      );


    // =====================================================
    // CALCULAR PRECIO POR M2
    // =====================================================

    const priceM2 =
      area > 0
        ? price / area
        : 0;


    // =====================================================
    // EDITAR
    // =====================================================

    if (
      this.isEditMode &&
      this.selectedLot
    ) {

      const updateData = {

        number:
          formValues.number,

        area_m2:
          area,

        list_price:
          price,

        status:
          formValues.status,

        type:
          formValues.type

      };


      this.lotService
        .updateLot(
          this.selectedLot.id,
          updateData
        )
        .subscribe({

          next: (response) => {

            this.isSaving = false;

            const updated = this.mergeLot(
              this.selectedLot,
              unwrapResource<Lot>(response),
            );

            this.applyUpdatedLot(updated);

            this.toast.show(
              'Lote actualizado',
              'success',
              'El lote se actualizó correctamente.'
            );

            this.closeModal();
            this.markJustChanged(updated.id);
            this.cdr.detectChanges();
          },


          error: (err) => {

            this.isSaving = false;


            if (
              err.status === 422 &&
              err.error?.errors
            ) {

              const firstError =
                Object.keys(
                  err.error.errors
                )[0];


              this.errorMessage =
                err.error.errors[
                  firstError
                ][0];

            } else if (
              err.error?.message
            ) {

              this.errorMessage =
                err.error.message;

            } else {

              this.errorMessage =
                'Error al actualizar el lote.';
            }


            this.cdr.detectChanges();
          }

        });


      return;
    }


    // =====================================================
    // CREAR
    // =====================================================

    const createData = {

      project_id:
        formValues.project_id,

      number:
        formValues.number,

      area_m2:
        area,

      list_price:
        price,

      price_m2:
        priceM2,

      status:
        formValues.status,

      type:
        formValues.type

    };


    this.lotService
      .createLot(createData)
      .subscribe({

        next: (response) => {

          this.isSaving = false;

          const created = this.mergeLot(
            {
              project_id: Number(formValues.project_id),
              number: formValues.number ?? undefined,
              area_m2: area,
              list_price: price,
              status: formValues.status ?? undefined,
              type: formValues.type ?? undefined,
              project: this.projects.find((project) => project.id === Number(formValues.project_id)),
            },
            unwrapResource<Lot>(response),
          );

          this.applyCreatedLot(created);

          this.toast.show(
            'Lote registrado',
            'success',
            'El lote se registró correctamente.'
          );

          this.closeModal();
          this.markJustChanged(created.id);
          this.cdr.detectChanges();
        },


        error: (err) => {

          this.isSaving = false;


          if (
            err.status === 422 &&
            err.error?.errors
          ) {

            const firstError =
              Object.keys(
                err.error.errors
              )[0];


            this.errorMessage =
              err.error.errors[
                firstError
              ][0];

          } else if (
            err.error?.message
          ) {

            this.errorMessage =
              err.error.message;

          } else {

            this.errorMessage =
              'Error al registrar el lote.';
          }


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // ARCHIVAR
  // =========================================================

  archiveLot(lot: Lot): void {

    const confirmed =
      confirm(
        `¿Estás seguro de que deseas archivar el lote ${lot.number}?`
      );


    if (!confirmed) {
      return;
    }


    if (lot.id == null) {
      return;
    }


    this.mutatingLotId = lot.id;

    this.lotService
      .archiveLot(lot.id)
      .subscribe({

        next: (response) => {

          this.mutatingLotId = null;
          this.applyArchivedLot(this.mergeLot(lot, unwrapResource<Lot>(response)));

          this.toast.show(
            'Lote archivado',
            'success',
            'El lote fue archivado correctamente.'
          );


          this.cdr.detectChanges();
        },


        error: (error) => {

          this.mutatingLotId = null;

          console.error(
            'Error archivando lote:',
            error
          );


          this.toast.show(
            'Error',
            'error',
            error.error?.message ||
              'No se pudo archivar el lote.'
          );


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // ACTIVAR
  // =========================================================

  activateLot(lot: Lot): void {

    const confirmed =
      confirm(
        `¿Estás seguro de que deseas reactivar el lote ${lot.number}?`
      );


    if (!confirmed) {
      return;
    }


    if (lot.id == null) {
      return;
    }


    this.mutatingLotId = lot.id;

    this.lotService
      .activateLot(lot.id)
      .subscribe({

        next: (response) => {

          this.mutatingLotId = null;
          const activated = this.mergeLot(lot, unwrapResource<Lot>(response));
          this.applyActivatedLot(activated);
          this.markJustChanged(activated.id);

          this.toast.show(
            'Lote reactivado',
            'success',
            'El lote fue reactivado correctamente.'
          );


          this.cdr.detectChanges();
        },


        error: (error) => {

          this.mutatingLotId = null;

          console.error(
            'Error reactivando lote:',
            error
          );


          this.toast.show(
            'Error',
            'error',
            error.error?.message ||
              'No se pudo reactivar el lote.'
          );


          this.cdr.detectChanges();
        }

      });
  }


  // =========================================================
  // DISPONIBILIDAD
  // =========================================================

  isLotAvailable(
    lot: Lot | {
      status?: string | { value?: string; name?: string }
    }
  ): boolean {
    return lotStatusValue(lot.status) === 'disponible';
  }

  isJustChanged(id: number | null | undefined): boolean {
    return this.justChanged.has(id);
  }

  isLeaving(id: number | null | undefined): boolean {
    return this.leaving.has(id);
  }

  private markJustChanged(id: number | null | undefined): void {
    this.justChanged.mark(id, () => this.cdr.detectChanges());
  }

  private markLeaving(id: number | null | undefined, apply: () => void): void {
    this.leaving.mark(id, () => this.cdr.detectChanges(), () => {
      apply();
      this.cdr.detectChanges();
    });
  }

  private mergeLot(base: Partial<Lot> | null | undefined, incoming: Lot | null): Lot {
    return {
      ...(base ?? {}),
      ...(incoming ?? {}),
    } as Lot;
  }

  private applyCreatedLot(lot: Lot): void {
    this.lotsTotal += 1;
    this.adjustProjectLotCounts(lot, 1, this.isLotAvailable(lot) ? 1 : 0);
    if (this.currentPage === 1 && !this.showArchivedLots) {
      this.lots = insertAtFront(this.lots, lot, this.pageSize);
    }
    this.refreshLotCounters();
  }

  private applyUpdatedLot(lot: Lot): void {
    const previous = this.lots.find((row) => row.id === lot.id);
    if (previous) {
      const availableDelta = Number(this.isLotAvailable(lot)) - Number(this.isLotAvailable(previous));
      this.adjustProjectLotCounts(lot, 0, availableDelta);
    }
    this.lots = replaceById(this.lots, lot);
    this.refreshLotCounters();
  }

  private applyArchivedLot(lot: Lot): void {
    const previous = this.lots.find((row) => row.id === lot.id) ?? lot;
    this.markLeaving(lot.id, () => {
      this.lots = removeById(this.lots, Number(lot.id));
      this.lotsTotal = Math.max(0, this.lotsTotal - 1);
      this.adjustProjectLotCounts(previous, -1, this.isLotAvailable(previous) ? -1 : 0);
      if (this.showArchivedLots) {
        this.archivedLots = insertAtFront(this.archivedLots, { ...lot, deleted_at: lot.deleted_at ?? new Date().toISOString() });
      }
      this.refreshLotCounters();
    });
  }

  private applyActivatedLot(lot: Lot): void {
    this.markLeaving(lot.id, () => {
      this.archivedLots = removeById(this.archivedLots, Number(lot.id));
      this.lotsTotal += 1;
      this.adjustProjectLotCounts(lot, 1, this.isLotAvailable(lot) ? 1 : 0);
      if (!this.showArchivedLots && this.currentPage === 1) {
        this.lots = insertAtFront(this.lots, { ...lot, deleted_at: null }, this.pageSize);
      }
      this.refreshLotCounters();
    });
  }

  private adjustProjectLotCounts(lot: Lot, totalDelta: number, availableDelta: number): void {
    if (!this.activeProject) {
      return;
    }

    if (lot.project_id != null && this.activeProject.id !== lot.project_id) {
      return;
    }

    this.activeProject.total_lots_count = Math.max(0, Number(this.activeProject.total_lots_count ?? this.lotsTotal) + totalDelta);
    this.activeProject.available_lots_count = Math.max(0, Number(this.activeProject.available_lots_count ?? 0) + availableDelta);
  }

  private refreshLotCounters(): void {
    if (this.selectedProjectId) {
      this.calculateProjectKPIs();
      return;
    }

    this.projectTotalLots = this.lotsTotal;
    this.projectAvailableLots = this.lots.filter((lot) => this.isLotAvailable(lot)).length;
    this.projectTotalValue = this.lots.reduce((sum, lot) => sum + Number(lot.list_price || 0), 0);
  }

}