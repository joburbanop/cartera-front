import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ClientsComponent } from './clients.component';

describe('ClientsComponent', () => {
  let component: ClientsComponent;
  let fixture: ComponentFixture<ClientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra pestañas de clientes activos y archivados', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.view-tabs button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent?.trim()).toBe('Clientes activos');
    expect(buttons[1].textContent?.trim()).toBe('Clientes archivados');
    expect(buttons[0].classList.contains('active')).toBe(true);
  });
});
