import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export function markAllAsTouched(form: FormGroup | FormArray): void {
  form.markAsTouched({ onlySelf: true });

  const children = form.controls;
  const list = Array.isArray(children) ? children : Object.values(children);

  for (const child of list) {
    if (child instanceof FormGroup || child instanceof FormArray) {
      markAllAsTouched(child);
    } else {
      child.markAsTouched();
    }
  }
}

export function scrollToFirstInvalid(formElement: HTMLElement): void {
  const firstInvalid = formElement.querySelector(
    'input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
  ) as HTMLElement | null;
  firstInvalid?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
}

/** Vacío (array o valor nulo) se reporta como `required`, para reutilizar FieldErrorComponent. */
export function requiredArray(control: AbstractControl) {
  const value = control.value;
  const empty = value == null || (Array.isArray(value) && value.length === 0);
  return empty ? { required: true } : null;
}
