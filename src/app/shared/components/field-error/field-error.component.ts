import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './field-error.component.html',
  styleUrl: './field-error.component.scss',
})
export class FieldErrorComponent implements OnChanges, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private eventsSub?: Subscription;

  @Input() control: AbstractControl | null = null;
  @Input() label = 'Este campo';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control']) {
      this.bindControlEvents();
    }
  }

  ngOnDestroy(): void {
    this.eventsSub?.unsubscribe();
  }

  get visible(): boolean {
    const control = this.control;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get message(): string {
    const errors = this.control?.errors;
    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return `${this.label} es obligatorio`;
    }

    if (errors['email']) {
      return 'Ingresa un correo válido';
    }

    if (errors['minlength']) {
      return `${this.label} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['min']) {
      return `${this.label} debe ser mayor a ${errors['min'].min}`;
    }

    if (errors['pattern']) {
      return `${this.label} tiene un formato inválido`;
    }

    return `${this.label} es inválido`;
  }

  private bindControlEvents(): void {
    this.eventsSub?.unsubscribe();
    const control = this.control;
    if (!control) {
      return;
    }

    this.eventsSub = control.events.subscribe(() => this.cdr.markForCheck());
  }
}
