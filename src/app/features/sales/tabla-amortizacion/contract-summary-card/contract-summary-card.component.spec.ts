import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractSummaryCardComponent } from './contract-summary-card.component';

describe('ContractSummaryCardComponent residuales', () => {
  let fixture: ComponentFixture<ContractSummaryCardComponent>;
  let component: ContractSummaryCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractSummaryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractSummaryCardComponent);
    component = fixture.componentInstance;
  });

  it('muestra el acumulado aunque sea $2 y no habilita cobro', () => {
    component.contractData = {
      pending_residual_balance: 2,
      residual_balance_collectible: false,
    };
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.pendingResidualBalance).toBe(2);
    expect(component.residualBalanceCollectible).toBe(false);
    expect(text).toContain('Residuales acumulados');
    expect(text).toContain('Se podrá cobrar al acumular');
  });

  it('marca listo para cobrar cuando el SUM llega a $500', () => {
    component.contractData = {
      pending_residual_balance: 500,
      residual_balance_collectible: true,
    };
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.residualBalanceCollectible).toBe(true);
    expect(text).toContain('Listo para cobrar como ítem aparte');
  });
});
