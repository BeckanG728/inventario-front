// src/app/shared/format/date-time.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { formatDate, formatDateTime, formatTime } from './date.util';

@Pipe({
  name: 'appDateTime',
  standalone: true
})
export class DateTimePipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    mode: 'datetime' | 'date' | 'time' = 'datetime'
  ): string {
    switch (mode) {
      case 'date':
        return formatDate(value);
      case 'time':
        return formatTime(value);
      case 'datetime':
      default:
        return formatDateTime(value);
    }
  }
}

@Pipe({
  name: 'appDate',
  standalone: true
})
export class DatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatDate(value);
  }
}
