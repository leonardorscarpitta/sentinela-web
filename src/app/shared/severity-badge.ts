import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SEVERITY_LABEL, Severity } from '../core/models';

export const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICA: 'var(--critical)',
  ALTA: 'var(--serious)',
  MEDIA: 'var(--warning)',
  BAIXA: 'var(--neutral)',
};

@Component({
  selector: 'app-severity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge"><span class="dot" [style.color]="color()"></span>{{ label() }}</span>`,
})
export class SeverityBadge {
  readonly value = input.required<Severity>();
  protected readonly color = computed(() => SEVERITY_COLOR[this.value()]);
  protected readonly label = computed(() => SEVERITY_LABEL[this.value()]);
}
