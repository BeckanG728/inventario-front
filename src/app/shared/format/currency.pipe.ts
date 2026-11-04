// src/app/shared/format/currency.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from './number.util';

@Pipe({
  name: 'appCurrency',
  standalone: true
})
export class CurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    decimals = 2
  ): string {
    return formatCurrency(value, decimals);
  }
}
