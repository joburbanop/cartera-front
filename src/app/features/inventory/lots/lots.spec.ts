import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LotsComponent } from './lots.component';

describe('LotsComponent', () => {
  let component: LotsComponent;
  let fixture: ComponentFixture<LotsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LotsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
