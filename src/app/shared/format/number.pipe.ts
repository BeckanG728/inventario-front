// src/app/shared/format/number.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { formatNumber, formatCompactNumber } from './number.util';

@Pipe({
  name: 'appNumber',
  standalone: true
})
export class NumberPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    minDecimals = 0,
    maxDecimals = 2,
    compact = false
  ): string {
    if (compact) {
      return formatCompactNumber(value);
    }
    return formatNumber(value, minDecimals, maxDecimals);
  }
}
