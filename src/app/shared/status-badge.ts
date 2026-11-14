import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ACCESS_LABEL,
  AccessStatus,
  FindingStatus,
  RUN_STATUS_LABEL,
  RunStatus,
  STAGE_STATUS_LABEL,
  STATUS_LABEL,
  StageStatus,
  TONE,
} from '../core/models';

type Kind = 'run' | 'stage' | 'finding' | 'access';

const TONES: Record<string, string> = {
  success: TONE.good, passed: TONE.good, fixed: TONE.good, verified: TONE.good, ok: TONE.good,
  failed: TONE.bad, open: TONE.bad,
  warning: TONE.warn, triaged: TONE.warn, pending: TONE.warn,
  running: TONE.info, queued: TONE.info,
  cancelled: TONE.neutral, skipped: TONE.neutral, falsePositive: TONE.neutral, accepted: TONE.neutral,
};

const LABELS: Record<Kind, Record<string, string>> = {
  run: RUN_STATUS_LABEL,
  stage: STAGE_STATUS_LABEL,
  finding: STATUS_LABEL,
  access: ACCESS_LABEL,
};

/** Badge com ponto colorido para estados de varredura, estágio, achado ou acesso. */
@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class.live]="live()"><span class="dot" [style.color]="color()"></span>{{ label() }}</span>`,
})
export class StatusBadge {
  readonly kind = input.required<Kind>();
  readonly value = input.required<RunStatus | StageStatus | FindingStatus | AccessStatus>();
  protected readonly color = computed(() => TONES[this.value()] ?? TONE.neutral);
  protected readonly label = computed(() => LABELS[this.kind()][this.value()] ?? this.value());
  protected readonly live = computed(() => this.value() === 'running' || this.value() === 'queued');
}
