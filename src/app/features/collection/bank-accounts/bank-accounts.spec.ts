import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankAccountsComponent } from './bank-accounts.component';

describe('BankAccounts', () => {
  let component: BankAccountsComponent;
  let fixture: ComponentFixture<BankAccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankAccountsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BankAccountsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
