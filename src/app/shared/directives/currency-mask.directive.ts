import { Directive, ElementRef, HostListener, Renderer2, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CurrencyMaskDirective),
    multi: true,
  }],
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  private onChange = (_value: number | null) => {};
  private onTouched = () => {};

  constructor(
    private readonly elementRef: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2,
  ) {}

  writeValue(value: number | string | null): void {
    const numericValue = this.toNumber(value);
    const formatted = numericValue === null ? '' : this.formatNumber(numericValue);
    this.renderer.setProperty(this.elementRef.nativeElement, 'value', formatted);
  }

  registerOnChange(fn: (_value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isDisabled);
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value ?? '';
    const digitsOnly = currentValue.replace(/[^\d]/g, '');
    const numericValue = digitsOnly === '' ? null : Number(digitsOnly);
    const formattedValue = numericValue === null ? '' : this.formatNumber(numericValue);

    const selectionStart = input.selectionStart ?? currentValue.length;
    const caretPosition = this.calculateCaretPosition(currentValue, formattedValue, selectionStart);

    this.renderer.setProperty(input, 'value', formattedValue);
    this.onChange(numericValue);
    this.onTouched();

    if (typeof input.setSelectionRange === 'function') {
      requestAnimationFrame(() => input.setSelectionRange(caretPosition, caretPosition));
    }
  }

  private calculateCaretPosition(previousValue: string, nextValue: string, currentPosition: number): number {
    const digitsBeforeCursor = previousValue.slice(0, currentPosition).replace(/[^\d]/g, '').length;
    const nextDigits = nextValue.replace(/[^\d]/g, '');

    if (digitsBeforeCursor <= 0 || nextDigits.length === 0) {
      return nextValue.length;
    }

    let digitsCount = 0;

    for (let index = 0; index < nextValue.length; index++) {
      if (/\d/.test(nextValue[index])) {
        digitsCount += 1;
        if (digitsCount === digitsBeforeCursor) {
          return index + 1;
        }
      }
    }

    return nextValue.length;
  }

  private toNumber(value: number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalizedValue = String(value).replace(/\./g, '').replace(/,/g, '');
    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value);
  }
}
