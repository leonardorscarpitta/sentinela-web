import { Pipe, PipeTransform } from '@angular/core';

/** Segundos → "1 min 05 s". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number | null | undefined): string {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
  }
}
