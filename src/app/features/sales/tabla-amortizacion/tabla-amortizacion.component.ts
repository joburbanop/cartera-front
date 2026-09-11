import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef, ElementRef, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, CDK_DRAG_CONFIG, moveItemInArray } from '@angular/cdk/drag-drop';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service';
import { DrawerPagoComponent, DrawerTargetInstallment } from '../../../shared/components/drawer-pago/drawer-pago.component';
import { DrawerCobroResidualComponent, ResidualCollectionPayload } from '../../../shared/components/drawer-cobro-residual/drawer-cobro-residual.component';
import {
  PaymentConfirmKind,
  PaymentConfirmModalComponent,
  PaymentConfirmSummary,
  SURPLUS_ACTION_LABELS,
} from '../../../shared/components/payment-confirm-modal/payment-confirm-modal.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityEntry } from '../../../core/models/activity-entry.model';
import { RecaudoService } from '../../../core/services/recaudo.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { AmortizationSelectionService } from './amortization-selection.service';
import { ContractStatusLabelPipe } from '../../../shared/pipes/contract-status-label.pipe';
import { PaymentMethodNamePipe } from '../../../shared/pipes/payment-method-name.pipe';
import { AmortizationTablePresenterComponent } from '../../../shared/components/amortization-table-presenter/amortization-table-presenter.component';
import { ContractSummaryCardComponent } from './contract-summary-card/contract-summary-card.component';
import { PaymentPromiseTabComponent } from './payment-promise-tab/payment-promise-tab.component';
import { EditDueDateModalComponent, DueDateAdjustMode, DueDateCadence } from './edit-due-date-modal/edit-due-date-modal.component';
import { EditPaymentDateModalComponent } from './edit-payment-date-modal/edit-payment-date-modal.component';
import { RefinanceModalComponent, RefinanceConfirmPayload } from './refinance-modal/refinance-modal.component';
import { LifeSheetTabComponent } from './life-sheet-tab/life-sheet-tab.component';
import { LifeSheet } from '../../../core/models/life-sheet.model';
import { autoSplitDownPayment } from '../../../core/utils/split-down-payment';
import { Transaction, TRANSACTION_TYPE_LABELS } from '../../../core/models/transaction.model';
import { PaymentPromiseService } from '../../../core/services/payment-promise.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { NavigationTrailService } from '../../../core/services/navigation-trail.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BitacoraComponent } from '../../../shared/components/bitacora/bitacora.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { PaymentPromise } from '../../../core/models/payment-promise.model';
import { AmortizationInstallment } from '../../../core/models/amortization-installment.model';
import { AppRoles } from '../../../core/models/app-roles';
import { unwrapListItems, unwrapPaginator, unwrapResource } from '../../../core/models/api-response';
import { amortizationStatusLabel, isPaidStatus, isPartialStatus, isVencida } from '../../../core/models/amortization-status';
import { FinancialRules } from '../../../core/constants/financial-rules';
import { ResidualBalanceRules } from '../../../core/constants/residual-balance-rules';
import {
  applyVisibleReorder,
  ContractTabId,
  isDefaultContractTabOrder,
  visibleContractTabs,
} from '../../../core/utils/contract-tabs';
import { buildAppBreadcrumbs, penultimateBreadcrumb } from '../../../core/utils/breadcrumbs';
@Component({
  selector: 'app-tabla-amortizacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DrawerPagoComponent,
    DrawerCobroResidualComponent,
    PaymentConfirmModalComponent,
    PaymentMethodNamePipe,
    AmortizationTablePresenterComponent,
    ContractSummaryCardComponent,
    PaymentPromiseTabComponent,
    EditDueDateModalComponent,
    EditPaymentDateModalComponent,
    RefinanceModalComponent,
    LifeSheetTabComponent,
    BitacoraComponent,
    PaginationComponent,
    SkeletonComponent,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './tabla-amortizacion.component.html',
  styleUrl: './tabla-amortizacion.component.scss',
  providers: [
    AmortizationSelectionService,
    {
      provide: CDK_DRAG_CONFIG,
      useValue: {
        dragStartThreshold: 1,
        pointerDirectionChangeThreshold: 2,
        zIndex: 40,
        previewClass: 'contract-tab-preview',
      },
    },
  ],
})
export class AmortizationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private amortizationService = inject(AmortizationService);
  private contractService = inject(ContractService);
  private financialService = inject(FinancialService);
  private cdr = inject(ChangeDetectorRef);
  private recaudoService = inject(RecaudoService);
  private activityService = inject(ActivityService);
  private financials = inject(AmortizationFinancialsService);
  private selection = inject(AmortizationSelectionService);
  private paymentPromiseService = inject(PaymentPromiseService);
  private authService = inject(AuthService);
  private pageTitle = inject(PageTitleService);
  private trail = inject(NavigationTrailService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);
  readonly backCrumb = computed(() => penultimateBreadcrumb(buildAppBreadcrumbs(
    this.router.url.split('?')[0],
    {},
    this.pageTitle.title(),
    this.trail.hubs(),
  )));
  tabOrderAnnouncement = '';
  visibleTabs: { id: ContractTabId; label: string }[] = [];
  private tabsSyncKey = '';
  private skipNextTabClick = false;

  constructor() {
    effect(() => {
      this.authService.uiPreferences();
      this.authService.uiPreferencesReady();
      this.cdr.markForCheck();
    });
  }

  get canRegisterPayments(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  get canReversePayments(): boolean {
    return this.authService.hasPermission('payments.reverse');
  }

  get canRefinance(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  get lotListPrice(): number | null {
    const raw = this.contractData?.lot?.list_price;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  get deferredInterestBalance(): number {
    return Number(this.contractData?.deferred_interest_balance || 0);
  }

  get pendingResidualBalance(): number {
    return Number(this.contractData?.pending_residual_balance || 0);
  }

  get residualBalanceCollectible(): boolean {
    if (this.contractData?.residual_balance_collectible === true) {
      return true;
    }

    return this.pendingResidualBalance >= ResidualBalanceRules.collectibleThreshold;
  }

  get residualCollectibleThreshold(): number {
    const fromApi = Number(this.contractData?.residual_collectible_threshold);
    return Number.isFinite(fromApi) && fromApi > 0
      ? fromApi
      : ResidualBalanceRules.collectibleThreshold;
  }

  get isSpecialLot(): boolean {
    const value = this.contractData?.is_special_lot;
    return value === true || value === 1 || value === '1';
  }

  get isCustomPlan(): boolean {
    const value = this.contractData?.is_custom_plan;
    return value === true || value === 1 || value === '1';
  }

  get canShowPromiseTab(): boolean {
    return this.isCustomPlan;
  }

  get hasContractTransactions(): boolean {
    const fromHistory = Array.isArray(this.transactions) && this.transactions.length > 0;
    const fromContract = Array.isArray(this.contractData?.transactions) && this.contractData.transactions.length > 0;
    return fromHistory || fromContract;
  }

  get amortizationTabLabel(): string {
    return this.isSpecialLot ? 'Seguimiento de Abonos' : 'Amortización Financiera';
  }

  get showAmortizationTabBar(): boolean {
    return true;
  }

  get amortizationNote(): string | null {
    return this.lifeSheet?.summary.amortization_note ?? null;
  }

  get criteriaGapLabel(): string | null {
    return this.lifeSheet?.summary.criteria_gap_label ?? null;
  }

  get criteriaGapHint(): string | null {
    return this.lifeSheet?.summary.criteria_gap_hint ?? null;
  }

  get criteriaGap(): number | null {
    return this.lifeSheet ? Number(this.lifeSheet.summary.criteria_gap) : null;
  }

  get lifeSheetBalance(): number | null {
    return this.lifeSheet ? Number(this.lifeSheet.summary.life_sheet_balance) : null;
  }

  get outstandingCapital(): number | null {
    return this.lifeSheet ? Number(this.lifeSheet.summary.outstanding_capital) : null;
  }

  contractId!: number;
  activeTab: 'amortizacion' | 'hoja-vida' | 'promesa' | 'bitacora-contrato' | 'bitacora-cliente' = 'amortizacion';
  lifeSheet: LifeSheet | null = null;
  isLoadingLifeSheet = false;
  contractData: any = null;
  amortizationPlan: any[] = [];
  totalWithInterest = 0;
  isLoading = true;
  isGenerating = false;
  isDrawerOpen = false;
  isProcessingPayment = false;
  isResidualDrawerOpen = false;
  isProcessingResidualCollection = false;
  paymentConfirmSummary: PaymentConfirmSummary | null = null;
  private pendingPaymentConfirm: { kind: PaymentConfirmKind; payload: any } | null = null;
  currentView: 'venta' | 'preventa' = 'venta';
  resetSelectionFlag = false;
  isGeneralPaymentFlow = false;
  drawerSuggestedAmount: number | null = null;
  drawerTargetInstallments: DrawerTargetInstallment[] = [];
  drawerScheduleNextAmount: number | null = null;
  drawerScheduleOpenTotal: number | null = null;
  drawerOverdueTotal: number | null = null;
  drawerPaymentAsOf: string | null = null;
  drawerManualSelection: any[] = [];
  transactions: any[] = [];
  isHistoryModalOpen = false;
  isLoadingHistory = false;
  historyPage = 1;
  historyTotal = 0;
  readonly historyPageSize = 20;
  isReverseModalOpen = false;
  isReversingPayment = false;
  reversingTransaction: Transaction | null = null;
  reversalReason = 'error_captura';
  reversalNotes = '';
  readonly reversalReasons: { value: string; label: string }[] = [
    { value: 'error_captura', label: 'Error de captura' },
    { value: 'duplicado', label: 'Pago duplicado' },
    { value: 'mal_imputado', label: 'Mal imputado' },
    { value: 'otro', label: 'Otro' },
  ];
  paymentPromises: PaymentPromise[] = [];
  activityEntries: ActivityEntry[] = [];
  isLoadingActivity = false;
  activityPage = 1;
  activityTotal = 0;
  customerActivityEntries: ActivityEntry[] = [];
  isLoadingCustomerActivity = false;
  customerActivityPage = 1;
  customerActivityTotal = 0;
  readonly activityPageSize = 20;
  isEditDueDateModalOpen = false;
  isUpdatingDueDate = false;
  editingInstallment: AmortizationInstallment | null = null;
  isEditPaymentDateModalOpen = false;
  isUpdatingPaymentDate = false;
  editingPaymentInstallment: AmortizationInstallment | null = null;
  isRefinanceModalOpen = false;
  isRefinancing = false;
  isReorderingPromises = false;

  /** Socio gerencia ve la bitácora completa del contrato y del cliente. */
  get canViewFullBitacora(): boolean {
    return this.authService.hasRole(AppRoles.SOCIO_GERENCIA);
  }

  /** El administrador ve solo las refinanciaciones; el API filtra por permiso. */
  get canViewBitacora(): boolean {
    return this.canViewFullBitacora || this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  get bitacoraContratoLabel(): string {
    return this.canViewFullBitacora ? 'Bitácora del contrato' : 'Refinanciaciones';
  }

  get prefsReady(): boolean {
    return this.authService.uiPreferencesReady();
  }

  get availableTabIds(): ContractTabId[] {
    const ids: ContractTabId[] = ['amortizacion', 'hoja-vida'];
    if (this.canShowPromiseTab) {
      ids.push('promesa');
    }
    if (this.canViewBitacora) {
      ids.push('bitacora-contrato');
    }
    if (this.canViewFullBitacora) {
      ids.push('bitacora-cliente');
    }
    return ids;
  }

  get orderedTabs(): { id: ContractTabId; label: string }[] {
    return this.ensureVisibleTabs();
  }

  trackTabId(_index: number, tab: { id: ContractTabId }): ContractTabId {
    return tab.id;
  }

  get canResetTabOrder(): boolean {
    return !isDefaultContractTabOrder(this.authService.contractTabOrder());
  }

  tabLabel(id: ContractTabId): string {
    switch (id) {
      case 'amortizacion':
        return this.amortizationTabLabel;
      case 'hoja-vida':
        return 'Hoja de vida';
      case 'promesa':
        return 'Cronograma Pactado en Promesa Comercial';
      case 'bitacora-contrato':
        return this.bitacoraContratoLabel;
      case 'bitacora-cliente':
        return 'Bitácora del cliente';
    }
  }

  selectTab(id: ContractTabId): void {
    if (this.skipNextTabClick) {
      this.skipNextTabClick = false;
      return;
    }

    this.activeTab = id;
  }

  onTabDrop(event: CdkDragDrop<{ id: ContractTabId; label: string }[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.skipNextTabClick = true;
    const tabs = this.ensureVisibleTabs();
    moveItemInArray(tabs, event.previousIndex, event.currentIndex);
    const visible = tabs.map((tab) => tab.id);
    this.tabsSyncKey = this.tabsKey(applyVisibleReorder(this.authService.contractTabOrder(), visible));
    this.commitTabOrder(visible);
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    const tabs = this.orderedTabs;
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      this.moveTab(index, event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const next = index + (event.key === 'ArrowLeft' ? -1 : 1);
      if (next < 0 || next >= tabs.length) {
        return;
      }
      this.selectTab(tabs[next].id);
      this.focusTab(tabs[next].id);
    }
  }

  resetTabOrder(): void {
    this.authService.resetContractTabs().subscribe({
      next: () => {
        this.tabOrderAnnouncement = 'Orden de pestañas restablecido.';
        this.cdr.markForCheck();
      },
      error: () => this.toast.show('No se pudo restablecer el orden de pestañas', 'error'),
    });
  }

  private moveTab(index: number, delta: number): void {
    const tabs = this.ensureVisibleTabs();
    const next = index + delta;
    if (next < 0 || next >= tabs.length) {
      return;
    }

    const moved = tabs[index].id;
    moveItemInArray(tabs, index, next);
    const visible = tabs.map((tab) => tab.id);
    this.tabsSyncKey = this.tabsKey(applyVisibleReorder(this.authService.contractTabOrder(), visible));
    this.commitTabOrder(visible, moved);
    this.focusTab(moved);
  }

  private ensureVisibleTabs(): { id: ContractTabId; label: string }[] {
    const key = this.tabsKey(this.authService.contractTabOrder());
    if (key !== this.tabsSyncKey) {
      this.tabsSyncKey = key;
      this.visibleTabs = visibleContractTabs(this.authService.contractTabOrder(), this.availableTabIds)
        .map((id) => ({ id, label: this.tabLabel(id) }));
    }

    return this.visibleTabs;
  }

  private tabsKey(savedOrder: readonly string[]): string {
    return `${this.availableTabIds.join('|')}::${savedOrder.join('|')}`;
  }

  private commitTabOrder(visible: ContractTabId[], movedId?: ContractTabId): void {
    const next = applyVisibleReorder(this.authService.contractTabOrder(), visible);
    this.authService.updateContractTabs(next).subscribe({
      next: () => {
        if (movedId) {
          const position = this.orderedTabs.findIndex((tab) => tab.id === movedId) + 1;
          this.tabOrderAnnouncement = `${this.tabLabel(movedId)} ahora está en la posición ${position} de ${this.orderedTabs.length}.`;
        }
        this.cdr.markForCheck();
      },
      error: () => this.toast.show('No se pudo guardar el orden de pestañas', 'error'),
    });
    this.cdr.markForCheck();
  }

  private focusTab(id: ContractTabId): void {
    queueMicrotask(() => {
      const el = this.host.nativeElement.querySelector(`[data-contract-tab="${id}"]`) as HTMLElement | null;
      el?.focus();
    });
  }

  get customerId(): number | null {
    const raw = this.contractData?.customer_id ?? this.contractData?.customer?.id;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get selectedFees(): any[] {
    return this.selection.selectedFees;
  }

  set selectedFees(value: any[]) {
    this.selection.selectedFees = value ?? [];
  }

  private clearTableSelection(): void {
    this.selection.clearSelection();
    this.selectedFees = [];
    this.resetSelectionFlag = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.resetSelectionFlag = false;
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.contractId = Number(params['id']);
        this.loadContractData();
        this.loadAmortizationPlan();
      }
    });
  }

  loadContractData(): void {
    this.contractService.getContractById(this.contractId).subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;

        this.contractData = payload;
        this.pageTitle.set(this.buildContractTitle(this.contractData));
        this.setDefaultView();
        if (!this.canShowPromiseTab && this.activeTab === 'promesa') {
          this.activeTab = 'amortizacion';
        }
        this.calculateFinancials();
        this.loadPaymentPromises();
        this.loadActivity();
        this.loadCustomerActivity();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/contracts']),
    });
  }

  loadPaymentPromises(): void {
    this.paymentPromiseService.getPromisesByContract(this.contractId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response ?? [];
        this.paymentPromises = Array.isArray(payload) ? payload : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.paymentPromises = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadActivity(): void {
    if (!this.canViewBitacora || !this.contractId) {
      this.activityEntries = [];
      return;
    }

    this.isLoadingActivity = true;
    this.activityService.getActivity('contract', this.contractId, this.activityPage, this.activityPageSize).subscribe({
      next: (response) => {
        const page = unwrapPaginator(response);
        this.activityEntries = page.items as ActivityEntry[];
        this.activityTotal = page.total;
        this.activityPage = page.currentPage;
        this.isLoadingActivity = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activityEntries = [];
        this.isLoadingActivity = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadCustomerActivity(): void {
    if (!this.canViewFullBitacora || !this.customerId) {
      this.customerActivityEntries = [];
      return;
    }

    this.isLoadingCustomerActivity = true;
    this.activityService.getActivity('customer', this.customerId, this.customerActivityPage, this.activityPageSize).subscribe({
      next: (response) => {
        const page = unwrapPaginator(response);
        this.customerActivityEntries = page.items as ActivityEntry[];
        this.customerActivityTotal = page.total;
        this.customerActivityPage = page.currentPage;
        this.isLoadingCustomerActivity = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.customerActivityEntries = [];
        this.isLoadingCustomerActivity = false;
        this.cdr.detectChanges();
      },
    });
  }

  onActivityPageChange(page: number): void {
    this.activityPage = page;
    this.loadActivity();
  }

  onCustomerActivityPageChange(page: number): void {
    this.customerActivityPage = page;
    this.loadCustomerActivity();
  }

  private unwrapActivity(response: unknown): ActivityEntry[] {
    return unwrapListItems<ActivityEntry>(response);
  }

  cargarTablaAmortizacion(): void {
    this.loadLifeSheet();
    this.amortizationService.getPlan(this.contractId).subscribe({
      next: (response) => {
        const payload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;

        const planData = payload as AmortizationInstallment[] | { rows?: AmortizationInstallment[] };
        const plan = Array.isArray(planData) ? planData : planData.rows ?? [];

        this.amortizationPlan = Array.isArray(plan) ? plan : [];
        this.clearTableSelection();
        this.selection.setPlan(this.amortizationPlan);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadLifeSheet(): void {
    if (!this.contractId) {
      return;
    }

    this.isLoadingLifeSheet = true;
    this.amortizationService.getLifeSheet(this.contractId).subscribe({
      next: (response) => {
        this.lifeSheet = unwrapResource<LifeSheet>(response);
        this.isLoadingLifeSheet = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.lifeSheet = null;
        this.isLoadingLifeSheet = false;
        this.cdr.markForCheck();
      },
    });
  }

  downloadLifeSheetPdf(): void {
    this.amortizationService.downloadLifeSheetPdf(this.contractId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `hoja-de-vida-contrato-${this.contractId}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => undefined,
    });
  }

  loadAmortizationPlan(): void {
    this.cargarTablaAmortizacion();
  }

  downloadPdf(type: 'internal' | 'client' = 'internal'): void {
    this.amortizationService.downloadPdf(this.contractId, type).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `extracto-amortizacion-${type}-v1.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => undefined,
    });
  }

  generatePlan(): void {
    this.isGenerating = true;
    this.amortizationService.generatePlan(this.contractId).subscribe({
      next: () => {
        this.isGenerating = false;
        this.loadAmortizationPlan();
      },
      error: (err) => {
        this.isGenerating = false;
        const backendMessage = this.readFirstBackendError(err);
        this.toast.show(
          'No se pudo generar la tabla de amortización',
          'error',
          backendMessage ?? 'La generación del plan no pudo completarse en este momento.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  calculateFinancials(): void {
    if (!this.contractData) {
      return;
    }

    const salePrice = Number(this.contractData.sale_price) || 0;
    const downPayment = Number(this.contractData.down_payment_pactada) || 0;
    const months = Number(this.contractData.term_months) || 0;
    const interestRate = Number(this.contractData.interest_rate) || 0;
    const principal = salePrice - downPayment;

    if (principal > 0 && months > 0) {
      const quota = this.financialService.calculateFrenchQuota(principal, months, interestRate);
      this.totalWithInterest = this.financialService.calculateProjectedTotal(quota, months, downPayment);
    } else {
      this.totalWithInterest = salePrice;
    }
  }

  setDefaultView(): void {
    if (this.isSpecialLot) {
      this.currentView = 'preventa';
      return;
    }

    this.currentView = this.contractData?.status === 'preventa_inactiva' ? 'preventa' : 'venta';
  }

  isFeeSelectable(fee: any): boolean {
    return this.financials.isFeeSelectable(fee, this.amortizationPlan, this.contractData);
  }

  toggleFeeSelection(fee: any, event: any): void {
    if (isPaidStatus(fee?.status ?? fee?.estado)) {
      if (event?.target) {
        event.target.checked = false;
      }
      return;
    }

    this.selection.toggleFeeSelection(fee, event, this.isFeeSelectable(fee));
  }

  onInstallmentSelectionChange(selected: any[]): void {
    this.selectedFees = selected;
  }

  onEditDueDate(installment: AmortizationInstallment): void {
    if (!this.canRegisterPayments) {
      return;
    }

    if (!installment || Number(installment.installment_number) <= 0) {
      return;
    }

    this.editingInstallment = installment;
    this.isEditDueDateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditDueDateModal(): void {
    if (this.isUpdatingDueDate) {
      return;
    }

    this.isEditDueDateModalOpen = false;
    this.editingInstallment = null;
    this.cdr.detectChanges();
  }

  saveInstallmentDueDate(payload: { dueDate: string; mode: DueDateAdjustMode; cadence?: DueDateCadence }): void {
    if (!this.editingInstallment?.id) {
      return;
    }

    this.isUpdatingDueDate = true;

    this.amortizationService
      .updateInstallmentDueDate(
        this.contractId,
        Number(this.editingInstallment.id),
        payload.dueDate,
        payload.mode,
        payload.cadence ?? 'same_day',
      )
      .subscribe({
        next: () => {
          this.isUpdatingDueDate = false;
          this.isEditDueDateModalOpen = false;
          this.editingInstallment = null;

          this.toast.show(
            'Fechas actualizadas',
            'success',
            payload.mode === 'cascade'
              ? 'El vencimiento se recadenció en cascada.'
              : 'La fecha de vencimiento se actualizó correctamente.',
          );

          this.loadContractData();
          this.cargarTablaAmortizacion();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUpdatingDueDate = false;
          this.toast.show(
            'No se pudo actualizar la fecha',
            'error',
            this.readFirstBackendError(err),
          );
          this.cdr.detectChanges();
        },
      });
  }

  onEditPaymentDate(installment: AmortizationInstallment): void {
    if (!this.canRegisterPayments) {
      return;
    }

    this.editingPaymentInstallment = installment;
    this.isEditPaymentDateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditPaymentDateModal(): void {
    if (this.isUpdatingPaymentDate) {
      return;
    }

    this.isEditPaymentDateModalOpen = false;
    this.editingPaymentInstallment = null;
    this.cdr.detectChanges();
  }

  saveInstallmentPaymentDate(paymentDate: string): void {
    if (!this.editingPaymentInstallment?.id) {
      return;
    }

    this.isUpdatingPaymentDate = true;

    this.amortizationService
      .updateInstallmentPaymentDate(this.contractId, Number(this.editingPaymentInstallment.id), paymentDate)
      .subscribe({
        next: (response) => {
          this.isUpdatingPaymentDate = false;
          this.isEditPaymentDateModalOpen = false;
          this.editingPaymentInstallment = null;

          const warning = response?.data?.warning;
          this.toast.show(
            'Fecha de pago actualizada',
            'success',
            warning || 'La fecha de pago se actualizó solo en esta cuota.',
          );

          this.cargarTablaAmortizacion();
          this.loadActivity();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUpdatingPaymentDate = false;
          this.toast.show(
            'No se pudo actualizar la fecha de pago',
            'error',
            this.readFirstBackendError(err),
          );
          this.cdr.detectChanges();
        },
      });
  }

  openRefinanceModal(): void {
    if (!this.canRefinance) {
      return;
    }

    this.isRefinanceModalOpen = true;
    this.cdr.detectChanges();
  }

  closeRefinanceModal(): void {
    if (this.isRefinancing) {
      return;
    }

    this.isRefinanceModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmRefinance(payload: RefinanceConfirmPayload): void {
    if (!this.canRefinance || this.isRefinancing) {
      return;
    }

    this.isRefinancing = true;

    this.amortizationService
      .refinanceContract(this.contractId, payload.tipo, payload.params)
      .subscribe({
        next: () => {
          this.isRefinancing = false;
          this.isRefinanceModalOpen = false;
          this.toast.show(
            'Contrato refinanciado',
            'success',
            'La refinanciación se aplicó correctamente.',
          );
          this.cargarTablaAmortizacion();
          this.loadContractData();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isRefinancing = false;
          this.toast.show(
            'No se pudo refinanciar el contrato',
            'error',
            this.readFirstBackendError(err),
          );
          this.cdr.detectChanges();
        },
      });
  }

  toggleSelectAll(event: any): void {
    this.selection.toggleSelectAll(event, this.amortizationPlan, (item: any) => this.isFeeSelectable(item));
  }

  allInstallmentsPaid(): boolean {
    return this.amortizationPlan.length > 0 && this.amortizationPlan.every((fee: any) => {
      return isPaidStatus(this.getFeeStatus(fee));
    });
  }

  isSelected(fee: any): boolean {
    return this.selection.isSelected(fee);
  }

  getFeeDebtValue(fee: any): number {
    return this.selection.getFeeDebtValue(fee);
  }

  get totalSelectedAmount(): number {
    return this.selection.totalSelectedAmount;
  }

  get totalOverdueQuotaDebt(): number {
    return this.selection.totalOverdueQuotaDebt;
  }

  /**
   * Delegado a `isVencida` de core. Se conserva como método del componente
   * para que los specs existentes sigan llamándolo vía `(component as any).isVencida`.
   * `asOf` es opcional: banner, badges y checkbox bloqueado no lo pasan (hoy real).
   */
  private isVencida(
    dueDate: string | Date | null | undefined,
    asOf?: string | Date | null,
  ): boolean {
    return isVencida(dueDate, asOf);
  }

  private todayLocalIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  openDrawer(): void {
    this.isGeneralPaymentFlow = false;
    this.drawerSuggestedAmount = null;
    this.drawerTargetInstallments = [];
    this.drawerOverdueTotal = null;
    this.drawerManualSelection = this.selectedFees.filter(
      (fee: any) => this.isFeeSelectable(fee)
    );
    this.drawerPaymentAsOf = this.todayLocalIsoDate();

    if (!this.applySelectedDrawerMerge(this.drawerPaymentAsOf)) {
      return;
    }

    this.isDrawerOpen = true;
    this.syncPaymentSessionKeepAlive();
    this.cdr.detectChanges();
  }

  /**
   * Recalcula mora y monto sugerido del drawer usando la fecha de pago como `asOf`.
   * No toca banner, badges ni `isBloqueada` (siguen contra hoy real).
   */
  onDrawerPaymentDateChange(date: string): void {
    if (!this.isDrawerOpen) {
      return;
    }

    const asOf = String(date ?? '').trim().substring(0, 10);
    if (!asOf || asOf === this.drawerPaymentAsOf) {
      return;
    }

    this.drawerPaymentAsOf = asOf;
    this.refreshDrawerForPaymentDate(asOf);
  }

  private refreshDrawerForPaymentDate(asOf: string): void {
    if (this.isGeneralPaymentFlow) {
      this.applyGeneralDrawerPrefill(asOf, true);
      this.cdr.detectChanges();
      return;
    }

    this.applySelectedDrawerMerge(asOf);
    this.cdr.detectChanges();
  }

  private applySelectedDrawerMerge(asOf?: string | Date | null): boolean {
    const seleccionadasValidas = this.drawerManualSelection.filter(
      (fee: any) => this.isFeeSelectable(fee)
    );

    // --- Regla de negocio: separar carril antes de fusionar mora ---
    // #0 sola va a /down-payment. Regulares van a /cascade. #0 + regulares
    // se cobran como pago_mixto (SplitPaymentService), no se mandan enteras
    // a down_payment.
    const isSeleccionInicial = seleccionadasValidas.some(
      (c: any) => Number(c.installment_number) === 0
    );

    const cuotasEnMora = (this.amortizationPlan ?? []).filter((c: any) => {
      const esPagada = isPaidStatus(c?.status);
      const esVencida = this.isVencida(c.due_date, asOf);
      const esInicial = Number(c.installment_number) === 0;

      if (esPagada || !esVencida) return false;

      // En preventa con inicial incompleta las regulares no son mora FIFO.
      if (!isSeleccionInicial && this.shouldPrioritizePendingInitial() && !esInicial) {
        return false;
      }

      // Solo incluir mora del mismo "carril" que la selección del usuario
      return isSeleccionInicial ? esInicial : !esInicial;
    });

    const merged = [...cuotasEnMora, ...seleccionadasValidas];
    const cuotasUnicas = Array.from(
      new Map(merged.map((c: any) => [c.id ?? c.installment_number, c])).values()
    );

    cuotasUnicas.sort(
      (a: any, b: any) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    if (cuotasUnicas.length === 0) {
      return false;
    }

    this.selectedFees = cuotasUnicas;
    this.syncDrawerCollectionContext(asOf, cuotasUnicas);
    return true;
  }

  get hasPendingPaymentsForGeneralFlow(): boolean {
    if (this.shouldPrioritizePendingInitial()) {
      return true;
    }

    if (this.getRegularPendingInstallmentsSorted().length > 0) {
      return true;
    }

    return false;
  }

  get generalPayButtonLabel(): string {
    return this.hasPendingPaymentsForGeneralFlow ? 'Pagar' : 'No hay pagos pendientes';
  }

  openGeneralPaymentDrawer(): void {
    this.drawerManualSelection = [];
    this.drawerPaymentAsOf = this.todayLocalIsoDate();

    if (!this.applyGeneralDrawerPrefill(this.drawerPaymentAsOf)) {
      return;
    }

    this.isDrawerOpen = true;
    this.syncPaymentSessionKeepAlive();
    this.cdr.detectChanges();
  }

  private applyGeneralDrawerPrefill(
    asOf?: string | Date | null,
    allowEmpty = false,
  ): boolean {
    const targets = this.generalPaymentTargets(asOf);
    const amortizationSuggested = this.sumFeeDebt(targets);
    if (!allowEmpty && (targets.length === 0 || amortizationSuggested <= 0)) {
      return false;
    }

    this.isGeneralPaymentFlow = true;
    this.selectedFees = [];
    this.drawerSuggestedAmount = Math.round(amortizationSuggested);
    this.syncDrawerCollectionContext(asOf, targets);

    return true;
  }

  private lotStatusValue(): string {
    const raw = this.contractData?.lot?.status as string | { value?: string; name?: string } | undefined;
    if (!raw) {
      return '';
    }
    if (typeof raw === 'string') {
      return raw;
    }
    return String(raw.value ?? raw.name ?? '');
  }

  private shouldPrioritizePendingInitial(): boolean {
    return this.financials.suppressesRegularOverdue(this.amortizationPlan, this.contractData);
  }

  private overdueRegularInstallments(asOf?: string | Date | null): any[] {
    if (this.shouldPrioritizePendingInitial()) {
      return [];
    }

    return this.getRegularPendingInstallmentsSorted()
      .filter((fee: any) => this.isVencida(fee?.due_date, asOf));
  }

  private overdueRegularInstallmentsAmount(asOf?: string | Date | null): number {
    return this.overdueRegularInstallments(asOf)
      .reduce((sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee), 0);
  }

  private computeOverdueTotalToDate(asOf?: string | Date | null): number {
    const overdueRegulars = this.overdueRegularInstallmentsAmount(asOf);

    if (!this.shouldPrioritizePendingInitial()) {
      return overdueRegulars;
    }

    return this.initialFeeBalance + overdueRegulars;
  }

  get isPreventaLot(): boolean {
    return this.lotStatusValue() === 'preventa';
  }

  get pendingInitialAmount(): number {
    return this.initialFeeBalance;
  }

  get overdueRegularAmount(): number {
    return this.overdueRegularInstallmentsAmount();
  }

  /**
   * Deuda abierta de todas las # regulares. Sirve de tope de capital cuando
   * el pago se reparte (la inicial ya va por su carril).
   */
  get regularDueAmount(): number {
    return Math.round(
      this.getRegularPendingInstallmentsSorted()
        .reduce((sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee), 0)
    );
  }

  get planRemainingAmount(): number {
    return Math.round(this.initialFeeBalance + this.regularDueAmount);
  }

  get overdueRegularCount(): number {
    return this.overdueRegularInstallments().length;
  }

  private computeAmortizationSuggestedAmount(asOf?: string | Date | null): number {
    return this.sumFeeDebt(this.generalPaymentTargets(asOf));
  }

  /** Lista que precarga el Pagar de arriba: toda la mora, o la próxima #. */
  private generalPaymentTargets(asOf?: string | Date | null): any[] {
    if (this.shouldPrioritizePendingInitial()) {
      const initial = (this.amortizationPlan ?? []).find(
        (fee: any) => Number(fee?.installment_number) === 0,
      );
      const debt = initial ? this.financials.getFeeDebtValue(initial) : 0;
      return initial && debt > 0 ? [initial] : [];
    }

    const overdue = this.overdueRegularInstallments(asOf);
    if (overdue.length > 0) {
      return overdue;
    }

    const next = this.getRegularPendingInstallmentsSorted()[0];
    return next ? [next] : [];
  }

  private sumFeeDebt(fees: any[]): number {
    return Math.round(
      fees.reduce((sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee), 0),
    );
  }

  private syncDrawerCollectionContext(
    asOf?: string | Date | null,
    fees: any[] = [],
  ): void {
    this.drawerOverdueTotal = Math.round(this.computeOverdueTotalToDate(asOf));

    const nextPromise = this.isCustomPlan ? this.nextPendingPromise() : null;
    this.drawerScheduleNextAmount = nextPromise
      ? Math.round(this.promiseRemainingAmount(nextPromise))
      : null;
    const openTotal = this.isCustomPlan ? Math.round(this.openPromisesRemainingTotal()) : 0;
    this.drawerScheduleOpenTotal = nextPromise && openTotal > 0 ? openTotal : null;

    this.drawerTargetInstallments = fees.map((fee: any) => this.toDrawerTarget(fee, asOf));
  }

  private toDrawerTarget(fee: any, asOf?: string | Date | null): DrawerTargetInstallment {
    const overdue = Number(fee?.installment_number) !== 0 && this.isVencida(fee?.due_date, asOf);
    const status = overdue
      ? (isPartialStatus(fee?.status) ? 'partial' : 'overdue')
      : this.getFeeStatus(fee);

    return {
      isInitial: Number(fee?.installment_number) === 0,
      installmentNumber: Number(fee?.installment_number) || 0,
      dueDateLabel: this.formatDueDateLabel(fee?.due_date),
      statusLabel: Number(fee?.installment_number) === 0
        ? 'Cuota inicial'
        : amortizationStatusLabel(status),
      amount: Math.round(this.financials.getFeeDebtValue(fee)),
    };
  }

  private formatDueDateLabel(due: string | Date | null | undefined): string {
    if (!due) {
      return '—';
    }

    const raw = typeof due === 'string'
      ? due.substring(0, 10)
      : `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    const [year, month, day] = raw.split('-');
    if (!year || !month || !day) {
      return raw;
    }

    return `${day}/${month}/${year}`;
  }

  private openPromisesRemainingTotal(): number {
    return [...(this.paymentPromises ?? [])]
      .filter((promise) => {
        const status = String(promise.status ?? '').toLowerCase();
        if (status === 'pagada' || status === 'paid' || promise.is_paid) {
          return false;
        }

        return this.promiseRemainingAmount(promise) > 0;
      })
      .reduce((sum, promise) => sum + this.promiseRemainingAmount(promise), 0);
  }

  private nextPendingPromise(): PaymentPromise | null {
    return [...(this.paymentPromises ?? [])]
      .filter((promise) => {
        const status = String(promise.status ?? '').toLowerCase();
        if (status === 'pagada' || status === 'paid' || promise.is_paid) {
          return false;
        }

        return this.promiseRemainingAmount(promise) > 0;
      })
      .sort((a, b) => {
        const dateA = a.expected_date ? new Date(a.expected_date).getTime() : Number.POSITIVE_INFINITY;
        const dateB = b.expected_date ? new Date(b.expected_date).getTime() : Number.POSITIVE_INFINITY;
        return dateA - dateB;
      })[0] ?? null;
  }

  private promiseRemainingAmount(promise: PaymentPromise): number {
    const remaining = Number(promise.remaining_amount);
    if (Number.isFinite(remaining) && remaining > 0) {
      return remaining;
    }

    return Number(promise.expected_amount) || 0;
  }

  confirmPromiseReorder(payload: Array<{ id: number; expected_date: string }>): void {
    if (!this.canRegisterPayments || this.isReorderingPromises) {
      return;
    }

    this.isReorderingPromises = true;
    this.paymentPromiseService.reorderPromises(this.contractId, payload).subscribe({
      next: (response: any) => {
        const items = response?.data ?? response ?? [];
        this.paymentPromises = Array.isArray(items) ? items : [];
        this.isReorderingPromises = false;
        this.toast.show('Cronograma actualizado', 'success', 'El orden y las fechas se guardaron correctamente.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isReorderingPromises = false;
        this.loadPaymentPromises();
        this.toast.show(
          'No se pudo reordenar el cronograma',
          'error',
          this.readFirstBackendError(err),
        );
        this.cdr.detectChanges();
      },
    });
  }

  private getRegularPendingInstallmentsSorted(): any[] {
    return [...(this.amortizationPlan ?? [])]
      .filter((fee: any) => Number(fee?.installment_number) > 0)
      .filter((fee: any) => !isPaidStatus(this.getFeeStatus(fee)))
      .sort((a: any, b: any) => {
        const dueA = a?.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const dueB = b?.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;

        if (dueA === dueB) {
          return Number(a?.installment_number ?? 0) - Number(b?.installment_number ?? 0);
        }

        return dueA - dueB;
      });
  }

  closeDrawer(): void {
    this.dismissPaymentConfirm();
    this.isProcessingPayment = false;
    this.isDrawerOpen = false;
    this.isGeneralPaymentFlow = false;
    this.drawerSuggestedAmount = null;
    this.drawerTargetInstallments = [];
    this.drawerScheduleNextAmount = null;
    this.drawerScheduleOpenTotal = null;
    this.drawerOverdueTotal = null;
    this.drawerPaymentAsOf = null;
    this.drawerManualSelection = [];
    this.clearTableSelection();
    this.syncPaymentSessionKeepAlive();
  }

  openResidualCollectionDrawer(): void {
    if (!this.residualBalanceCollectible || !this.canRegisterPayments) {
      return;
    }
    this.isResidualDrawerOpen = true;
    this.syncPaymentSessionKeepAlive();
  }

  closeResidualCollectionDrawer(): void {
    this.dismissPaymentConfirm();
    this.isProcessingResidualCollection = false;
    this.isResidualDrawerOpen = false;
    this.syncPaymentSessionKeepAlive();
  }

  onDrawerConfirmPayment(paymentData: any): void {
    this.pendingPaymentConfirm = { kind: 'payment', payload: paymentData };
    this.paymentConfirmSummary = this.buildPaymentConfirmSummary(paymentData);
  }

  onDrawerConfirmResidual(paymentData: ResidualCollectionPayload): void {
    this.pendingPaymentConfirm = { kind: 'residual', payload: paymentData };
    this.paymentConfirmSummary = this.buildResidualConfirmSummary(paymentData);
  }

  dismissPaymentConfirm(): void {
    this.pendingPaymentConfirm = null;
    this.paymentConfirmSummary = null;
  }

  confirmPendingPayment(): void {
    const pending = this.pendingPaymentConfirm;
    if (!pending) {
      return;
    }

    this.pendingPaymentConfirm = null;
    this.paymentConfirmSummary = null;

    if (pending.kind === 'residual') {
      this.procesarCobroResidual(pending.payload);
      return;
    }

    this.procesarPago(pending.payload);
  }

  get isPaymentConfirmOpen(): boolean {
    return this.paymentConfirmSummary != null;
  }

  private buildPaymentConfirmSummary(paymentData: any): PaymentConfirmSummary {
    const resolvedSplit = this.resolveMixedSelectionSplit(paymentData);
    const split = resolvedSplit
      ? {
          toDownPayment: Number(resolvedSplit.to_down_payment) || 0,
          toInstallments: Number(resolvedSplit.to_installments) || 0,
        }
      : null;
    const surplusAction = String(paymentData?.payment_option ?? paymentData?.surplus_action ?? '').trim();

    return {
      kind: 'payment',
      contractLabel: this.paymentConfirmContractLabel(),
      amount: Number(paymentData?.amount) || 0,
      transactionDate: String(paymentData?.transaction_date ?? '').substring(0, 10),
      paymentMethod: String(paymentData?.payment_method ?? ''),
      receiptNumber: String(paymentData?.receipt_number ?? '').trim(),
      installmentsLabel: this.paymentConfirmInstallmentsLabel(),
      split,
      surplusActionLabel: SURPLUS_ACTION_LABELS[surplusAction] ?? (surplusAction || null),
      residualPending: null,
    };
  }

  private buildResidualConfirmSummary(paymentData: ResidualCollectionPayload): PaymentConfirmSummary {
    return {
      kind: 'residual',
      contractLabel: this.paymentConfirmContractLabel(),
      amount: Number(paymentData?.amount) || 0,
      transactionDate: String(paymentData?.transaction_date ?? '').substring(0, 10),
      paymentMethod: String(paymentData?.payment_method ?? ''),
      receiptNumber: String(paymentData?.receipt_number ?? '').trim(),
      installmentsLabel: 'Ítem aparte (no aplica a cuotas)',
      split: null,
      surplusActionLabel: null,
      residualPending: Math.round(Number(this.pendingResidualBalance) || 0),
    };
  }

  private paymentConfirmContractLabel(): string {
    const lot = this.contractData?.lot?.number;
    const customer = this.contractData?.customer_name
      || this.contractData?.customer?.name
      || this.contractData?.customer?.first_name
      || this.contractData?.customers?.[0]?.name;
    const parts: string[] = [];

    if (this.contractData?.contract_number) {
      parts.push(`Contrato ${this.contractData.contract_number}`);
    } else if (this.contractId) {
      parts.push(`Contrato #${this.contractId}`);
    }

    if (lot) {
      parts.push(`Lote ${lot}`);
    }

    if (customer) {
      parts.push(String(customer));
    }

    return parts.join(' · ') || 'Contrato';
  }

  private paymentConfirmInstallmentsLabel(): string {
    if (this.isGeneralPaymentFlow || this.selectedFees.length === 0) {
      return 'Imputación FIFO / flujo general';
    }

    return this.selectedFees.map((fee: any) => {
      const number = Number(fee?.installment_number);
      return number === 0 ? 'Cuota inicial' : `Cuota #${number}`;
    }).join(', ');
  }

  procesarCobroResidual(paymentData: ResidualCollectionPayload): void {
    this.isProcessingResidualCollection = true;

    const formData = new FormData();
    formData.append('amount', String(paymentData.amount ?? 0));
    formData.append('payment_method', paymentData.payment_method ?? '');
    formData.append('transaction_date', paymentData.transaction_date ?? '');
    formData.append('payment_date', paymentData.payment_date ?? paymentData.transaction_date ?? '');
    if (paymentData.bank_account_id) {
      formData.append('bank_account_id', String(paymentData.bank_account_id));
    }
    if (paymentData.receipt) {
      formData.append('receipt', paymentData.receipt);
    }
    if (paymentData.receipt_number) {
      formData.append('receipt_number', paymentData.receipt_number);
    }

    this.recaudoService.registerResidualCollection(this.contractId, formData).subscribe({
      next: () => {
        this.isProcessingResidualCollection = false;
        this.isResidualDrawerOpen = false;
        this.syncPaymentSessionKeepAlive();
        this.toast.show(
          'Residuales cobrados',
          'success',
          'El cobro se registró como ítem aparte. No se modificaron cuotas.',
        );
        this.cdr.detectChanges();
        this.cargarTablaAmortizacion();
        this.loadContractData();
      },
      error: (err) => {
        this.isProcessingResidualCollection = false;
        if (this.isUnauthorizedError(err)) {
          this.cdr.detectChanges();
          return;
        }
        const backendErrors = err?.error?.errors ?? null;
        const firstMessage = backendErrors
          ? Object.values(backendErrors)
              .flat()
              .find((msg: unknown) => typeof msg === 'string')
          : null;
        this.toast.show(
          'No se pudo cobrar el residual',
          'error',
          firstMessage ? String(firstMessage) : undefined,
        );
        this.cdr.detectChanges();
      },
    });
  }

  get initialFee(): any {
    return this.financials.initialFee(this.amortizationPlan, this.contractData);
  }

  get initialFeeTotal(): number {
    return this.financials.initialFeeTotal(this.amortizationPlan, this.contractData);
  }

  get initialFeeBalance(): number {
    return this.financials.initialFeeBalance(this.amortizationPlan, this.contractData);
  }

  get initialFeePaid(): number {
    return this.financials.initialFeePaid(this.amortizationPlan, this.contractData);
  }

  get initialFeeProgress(): number {
    return this.financials.initialFeeProgress(this.amortizationPlan, this.contractData);
  }

  get activationThreshold(): number {
    return this.financials.activationThreshold(this.contractData);
  }

  /** Transacciones cuyo reparto está desplegado en el historial. */
  private expandedTransactionIds = new Set<number>();

  hasAllocations(transaction: Transaction): boolean {
    return (transaction.allocations?.length ?? 0) > 0;
  }

  isTransactionExpanded(transaction: Transaction): boolean {
    return transaction.id != null && this.expandedTransactionIds.has(transaction.id);
  }

  toggleTransactionDetails(transaction: Transaction): void {
    if (transaction.id == null) {
      return;
    }

    if (this.expandedTransactionIds.has(transaction.id)) {
      this.expandedTransactionIds.delete(transaction.id);
    } else {
      this.expandedTransactionIds.add(transaction.id);
    }
  }

  transactionTypeLabel(transaction: Transaction): string {
    return TRANSACTION_TYPE_LABELS[String(transaction.transaction_type)]
      ?? String(transaction.transaction_type ?? '--');
  }

  isReversedTransaction(transaction: Transaction): boolean {
    return !!transaction.reversed_at;
  }

  isReversalTransaction(transaction: Transaction): boolean {
    return String(transaction.transaction_type) === 'payment_reversal';
  }

  canShowReverseButton(transaction: Transaction): boolean {
    return this.canReversePayments
      && transaction.can_reverse === true
      && !this.isReversedTransaction(transaction)
      && !this.isReversalTransaction(transaction);
  }

  openReverseModal(transaction: Transaction): void {
    if (!this.canShowReverseButton(transaction) || this.isReversingPayment) {
      return;
    }

    this.reversingTransaction = transaction;
    this.reversalReason = 'error_captura';
    this.reversalNotes = '';
    this.isReverseModalOpen = true;
    this.cdr.detectChanges();
  }

  closeReverseModal(): void {
    if (this.isReversingPayment) {
      return;
    }

    this.isReverseModalOpen = false;
    this.reversingTransaction = null;
    this.reversalReason = 'error_captura';
    this.reversalNotes = '';
    this.cdr.detectChanges();
  }

  get reversalNotesRequired(): boolean {
    return this.reversalReason === 'otro';
  }

  submitReversal(): void {
    const transaction = this.reversingTransaction;
    if (!transaction?.id || this.isReversingPayment || !this.canShowReverseButton(transaction)) {
      return;
    }

    const notes = this.reversalNotes.trim();
    if (this.reversalNotesRequired && !notes) {
      this.toast.show(
        'Describe el motivo',
        'error',
        'El texto es obligatorio cuando eliges Otro.',
      );
      return;
    }

    this.isReversingPayment = true;
    this.cdr.detectChanges();

    this.recaudoService.reversePayment(this.contractId, transaction.id, {
      reason: this.reversalReason,
      notes: notes || null,
    }).subscribe({
      next: () => {
        this.isReversingPayment = false;
        this.isReverseModalOpen = false;
        this.reversingTransaction = null;
        this.reversalNotes = '';
        this.toast.show('Pago revertido', 'success', 'La reversa se registró en el historial.');
        this.loadHistoryPage(this.historyPage);
        this.cargarTablaAmortizacion();
        this.loadContractData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isReversingPayment = false;
        if (this.isUnauthorizedError(err)) {
          this.cdr.detectChanges();
          return;
        }
        this.toast.show(
          'No se pudo revertir el pago',
          'error',
          this.readFirstBackendError(err),
        );
        this.cdr.detectChanges();
      },
    });
  }


  getFeeStatus(fee: any): string {
    return this.financials.getFeeStatus(fee, this.amortizationPlan, this.contractData);
  }

  get totalPaidAmount(): number {
    return this.financials.totalPaidAmount(this.contractData);
  }

  get totalOutstandingAmount(): number {
    return this.financials.totalOutstandingAmount(this.totalWithInterest, this.contractData);
  }

  get overallPendingBalance(): number {
    return this.totalOutstandingAmount;
  }

  get totalInterestPaid(): number {
    return this.financials.totalInterestPaid(this.amortizationPlan, this.contractData);
  }

  abrirHistorialPagos(): void {
    this.isLoadingHistory = true;
    this.transactions = [];
    this.historyPage = 1;
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();
    this.loadHistoryPage(1);
  }

  loadHistoryPage(page: number): void {
    this.isLoadingHistory = true;
    this.historyPage = page;
    this.cdr.detectChanges();

    this.recaudoService.getTransactionsByContract(this.contractId, page, this.historyPageSize).subscribe({
      next: (response) => {
        const pageData = unwrapPaginator(response);
        this.transactions = pageData.items;
        this.historyTotal = pageData.total;
        this.historyPage = pageData.currentPage;
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.transactions = [];
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarHistorialPagos(): void {
    if (this.isReversingPayment) {
      return;
    }

    this.isHistoryModalOpen = false;
    this.isLoadingHistory = false;
    this.transactions = [];
    this.closeReverseModal();
  }

  verComprobante(receiptUrl: string): void {
  if (!receiptUrl) {
    return;
  }

  this.recaudoService.getReceipt(receiptUrl).subscribe({
    next: (response) => {
      const blob = response.body;

      if (!blob) {
        console.error('El recibo llegó vacío');
        return;
      }

      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, '_blank');

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    },
    error: (err) => {
      console.error('Error al abrir el recibo', err);
    }
  });
}

  /**
   * Abonos que tocaron la cuota inicial: down_payment puros y la parte a
   * inicial de un pago mixto. El monto es lo que fue a la inicial, no el total
   * que vio el banco.
   */
  get initialPaymentTransactions(): Array<{
    id?: number;
    transaction_date?: string | null;
    payment_method?: string;
    amount: number;
    is_split: boolean;
  }> {
    type InitialPaymentRow = {
      id?: number;
      transaction_date?: string | null;
      payment_method?: string;
      amount: number;
      is_split: boolean;
    };

    const rows: InitialPaymentRow[] = [];

    for (const tx of (this.contractData?.transactions ?? []) as Transaction[]) {
      const allocated = (Array.isArray(tx.allocations) ? tx.allocations : [])
        .filter((allocation) => String(allocation.target ?? '').toLowerCase() === 'down_payment')
        .reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      const isDown = type === 'down_payment' || type === 'down-payment';
      const amount = allocated > 0 ? allocated : (isDown ? Number(tx.amount || 0) : 0);

      if (amount > 0) {
        rows.push({
          id: tx.id,
          transaction_date: tx.transaction_date,
          payment_method: tx.payment_method,
          amount,
          is_split: allocated > 0 && !isDown,
        });
      }
    }

    return rows;
  }

  get overdueFees(): any[] {
    return this.financials.overdueFees(this.amortizationPlan, this.contractData);
  }

  get cuotasVencidas(): any[] {
    return (this.amortizationPlan ?? []).filter((cuota: any) => {
      if (isPaidStatus(cuota?.status)) {
        return false;
      }

      if (this.shouldPrioritizePendingInitial() && Number(cuota?.installment_number) !== 0) {
        return false;
      }

      if (this.financials.getFeeDebtValue(cuota) < FinancialRules.quotaCompletionResidual) {
        return false;
      }

      return this.isVencida(cuota?.due_date);
    });
  }

  get cantidadCuotasVencidas(): number {
    return this.cuotasVencidas.length;
  }

  get totalDineroVencido(): number {
    return this.cuotasVencidas.reduce(
      (sum: number, cuota: any) => sum + this.financials.getFeeDebtValue(cuota),
      0,
    );
  }

  get tieneCarteraVencida(): boolean {
    return this.cantidadCuotasVencidas > 0;
  }

  get activeMoraFees(): any[] {
    return this.financials.activeMoraFees(this.amortizationPlan, this.contractData);
  }

  get hasOverdueFees(): boolean {
    return this.overdueFees.length > 0;
  }

  get hasActiveMora(): boolean {
    return this.tieneCarteraVencida;
  }

  get regularPaymentTotal(): number {
    const regularPayments = (this.contractData?.transactions ?? []).filter((tx: any) => {
      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      return type === 'regular_payment' || type === 'regular payment';
    });

    return regularPayments.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  }

  get activeMoraDebt(): number {
    return this.financials.activeMoraDebt(this.amortizationPlan, this.contractData, (fee: any) => this.getFeeDebtValue(fee));
  }

  get activeMoraFeeLabel(): string {
    const firstFee = this.activeMoraFees[0];
    if (!firstFee) return 'Cuota';
    return firstFee.installment_number === 0 ? 'Cuota inicial' : `Cuota #${firstFee.installment_number}`;
  }

  get overdueLevelLabel(): string {
    const count = this.overdueFees.length;

    if (count === 0) return 'Sin mora';
    if (count <= 2) return 'Nivel de antigüedad: 0 a 30 días';
    if (count <= 4) return 'Nivel de antigüedad: 31 a 60 días';
    return 'Nivel de antigüedad: 61+ días';
  }

  get overdueAmount(): number {
    const overdueBalance = this.overdueFees.reduce((sum, fee) => sum + Number(fee.overdue_balance || 0), 0);

    if (overdueBalance > 0) {
      return overdueBalance;
    }

    if (this.currentView === 'preventa' && this.initialFee) {
      return this.initialFeeBalance;
    }

    return 0;
  }

  openPreventaPayment(): void {
    if (!this.initialFee) return;

    const remainingInitialFee = this.initialFeeBalance;
    if (remainingInitialFee <= 0) {
      return;
    }

    this.selectedFees = [{
      ...this.initialFee,
      installment_value: remainingInitialFee,
      remaining_balance: remainingInitialFee,
      overdue_balance: remainingInitialFee,
    }];

    this.openDrawer();
  }

  /**
   * #0 + regulares sin toggle de split: inicial primero (hasta el pendiente),
   * el resto a las cuotas. Si el cobrador ya mandó `split`, se respeta.
   */
  private resolveMixedSelectionSplit(
    paymentData: any,
  ): { to_down_payment: number; to_installments: number } | null {
    const explicit = paymentData?.split;
    const explicitDown = Math.max(0, Number(explicit?.to_down_payment) || 0);
    const explicitRegulars = Math.max(0, Number(explicit?.to_installments) || 0);
    if (explicitDown > 0 && explicitRegulars > 0) {
      return {
        to_down_payment: explicitDown,
        to_installments: explicitRegulars,
      };
    }

    const hasInicial = this.selectedFees.some((fee: any) => Number(fee.installment_number) === 0);
    const hasRegular = this.selectedFees.some((fee: any) => Number(fee.installment_number) > 0);
    if (!hasInicial || !hasRegular) {
      return null;
    }

    return autoSplitDownPayment(
      Math.max(0, Number(paymentData?.amount) || 0),
      Math.round(this.pendingInitialAmount),
    );
  }

  private resolveOutgoingPaymentOption(paymentData: any): string {
    const requested = String(paymentData.payment_option ?? paymentData.surplus_action ?? '').trim();
    const amount = Number(paymentData.amount) || 0;
    const target = this.selectedOrSuggestedDebt();
    const absorbed = FinancialRules.absorbedSurplus;

    if (amount <= target + absorbed) {
      return '';
    }

    return requested || 'abono_capital';
  }

  private selectedOrSuggestedDebt(): number {
    if (!this.isGeneralPaymentFlow && this.selectedFees.length) {
      return Math.round(
        this.selectedFees.reduce(
          (sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee),
          0,
        ),
      );
    }

    return Math.round(this.drawerSuggestedAmount ?? 0);
  }

  procesarPago(paymentData: any): void {
    this.isProcessingPayment = true;

    const transactionType = !this.isGeneralPaymentFlow && this.selectedFees.some((fee: any) => Number(fee.installment_number) === 0)
      && !this.selectedFees.some((fee: any) => Number(fee.installment_number) > 0)
      ? 'down_payment'
      : 'regular_payment';

    const formData = new FormData();

    formData.append('amount', String(paymentData.amount ?? 0));
    formData.append('payment_method', paymentData.payment_method ?? '');
    formData.append('transaction_date', paymentData.transaction_date ?? '');
    formData.append('payment_date', paymentData.payment_date ?? paymentData.transaction_date ?? '');
    formData.append('transaction_type', transactionType);

    const paymentOption = this.resolveOutgoingPaymentOption(paymentData);
    if (paymentOption) {
      formData.append('payment_option', paymentOption);
    }

    // Pago dividido: un solo movimiento bancario que cubre parte de la inicial
    // y parte de la cuota del mes. Va por su propia ruta porque el reparto no
    // se puede deducir del monto.
    const split = this.resolveMixedSelectionSplit(paymentData);
    if (split) {
      formData.append('to_down_payment', String(split.to_down_payment ?? 0));
      formData.append('to_installments', String(split.to_installments ?? 0));
    }

    if (!this.isGeneralPaymentFlow && this.selectedFees.length) {
      this.selectedFees.forEach((fee: any) => {
        if (split && Number(fee.installment_number) === 0) {
          return;
        }

        // El plan persistido siempre trae id; installment_number no se usa como fallback.
        formData.append('installment_numbers[]', String(Number(fee.id)));
        formData.append('selected_installments[]', String(Number(fee.id)));
      });
    }

    if (paymentData.bank_account_id) {
      formData.append('bank_account_id', String(paymentData.bank_account_id));
    }

    if (paymentData.receipt) {
      formData.append('receipt', paymentData.receipt);
    }
    const receiptNumber = String(paymentData.receipt_number ?? '').trim();
    if (receiptNumber) {
      formData.append('receipt_number', receiptNumber);
    }

    const request = split
      ? this.recaudoService.registerSplitPayment(this.contractId, formData)
      : this.recaudoService.registerPayment(this.contractId, formData, transactionType);

    request.subscribe({
      next: (response) => {
        this.isProcessingPayment = false;
        this.isDrawerOpen = false;
        this.syncPaymentSessionKeepAlive();
        this.clearTableSelection();

        const payload = unwrapResource<Record<string, unknown>>(response);
        const notice = typeof payload?.['application_notice'] === 'string'
          ? payload['application_notice'].trim()
          : '';

        this.toast.show(
          'Pago registrado',
          'success',
          split
            ? 'Se registró un solo movimiento y quedó guardado el reparto entre cuota inicial y cuota regular.'
            : (notice || 'El abono se aplicó correctamente a la cuota seleccionada.'),
        );
        this.cdr.detectChanges();

        this.cargarTablaAmortizacion();
        this.loadContractData();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        if (this.isUnauthorizedError(err)) {
          this.cdr.detectChanges();
          return;
        }

        const backendErrors = err?.error?.errors ?? null;
        const firstMessage = backendErrors
          ? Object.values(backendErrors)
              .flat()
              .find((msg: unknown) => typeof msg === 'string')
          : null;

        this.toast.show(
          'No se pudo registrar el pago',
          'error',
          firstMessage ? String(firstMessage) : undefined,
        );
        console.error('Error al registrar pago:', err);
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.authService.stopSessionKeepAlive();
    this.pageTitle.clear();
  }

  private syncPaymentSessionKeepAlive(): void {
    if (this.isDrawerOpen || this.isResidualDrawerOpen) {
      this.authService.startSessionKeepAlive();
      return;
    }

    this.authService.stopSessionKeepAlive();
  }

  private isUnauthorizedError(err: unknown): boolean {
    return (err as { status?: number } | null)?.status === 401;
  }

  private buildContractTitle(contract: any): string {
    const contractNumber = contract?.contract_number;

    return contractNumber
      ? String(contractNumber)
      : `Contrato #${contract?.id || this.contractId}`;
  }

  getContractStatusLabel(status: string): string {
    const pipe = new ContractStatusLabelPipe();
    return pipe.transform(status);
  }

  getPaymentMethodName(method: string): string {
    const pipe = new PaymentMethodNamePipe();
    return pipe.transform(method);
  }

  private readFirstBackendError(err: any): string | undefined {
    const backendErrors = err?.error?.errors ?? null;
    const firstMessage = backendErrors
      ? Object.values(backendErrors)
          .flat()
          .find((msg: unknown) => typeof msg === 'string')
      : null;

    if (firstMessage) {
      return String(firstMessage);
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    return undefined;
  }
}
