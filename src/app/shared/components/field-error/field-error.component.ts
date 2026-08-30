import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './field-error.component.html',
  styleUrl: './field-error.component.scss',
})
export class FieldErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() label = 'Este campo';

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
}
