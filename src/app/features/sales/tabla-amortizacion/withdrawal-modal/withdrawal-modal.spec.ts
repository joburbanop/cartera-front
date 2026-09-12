import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithdrawalModal } from './withdrawal-modal';

describe('WithdrawalModal', () => {
  let component: WithdrawalModal;
  let fixture: ComponentFixture<WithdrawalModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalModal],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
