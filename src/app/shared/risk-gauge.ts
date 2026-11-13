import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RiskLevel } from '../core/models';
import { RISK_LEVEL_COLOR, RISK_LEVEL_LABEL, RISK_LEVEL_MEANING } from '../core/risk';

// Semicírculo de raio 80: comprimento do arco = π·80.
const ARC = Math.PI * 80;

@Component({
  selector: 'app-risk-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure role="meter" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="score()"
      [attr.aria-label]="'Risco Cidadão ' + score() + ' de 100, nível ' + label()">
      <svg viewBox="0 0 200 116" aria-hidden="true">
        <path d="M20 100 A80 80 0 0 1 180 100" class="track" />
        <path d="M20 100 A80 80 0 0 1 180 100" class="value" [style.stroke]="color()"
          [attr.stroke-dasharray]="arc" [attr.stroke-dashoffset]="offset()" />
        <text x="100" y="88" text-anchor="middle" class="num">{{ score() }}</text>
        <text x="100" y="108" text-anchor="middle" class="of">de 100</text>
      </svg>
      <figcaption>
        <span class="badge"><span class="dot" [style.color]="color()"></span>Risco {{ label() }}</span>
        <p>{{ meaning() }}</p>
      </figcaption>
    </figure>
  `,
  styles: `
    figure { margin: 0; display: grid; gap: 8px; justify-items: center; text-align: center; }
    svg { width: 100%; max-width: 260px; }
    .track { fill: none; stroke: var(--grid); stroke-width: 14; stroke-linecap: round; }
    .value { fill: none; stroke-width: 14; stroke-linecap: round; transition: stroke-dashoffset .6s ease; }
    .num { font-size: 44px; font-weight: 700; fill: var(--text); }
    .of { font-size: 12px; fill: var(--muted); }
    p { margin: 4px 0 0; color: var(--text-2); max-width: 34ch; }
  `,
})
export class RiskGauge {
  readonly score = input.required<number>();
  readonly level = input.required<RiskLevel>();
  protected readonly arc = ARC;
  protected readonly color = computed(() => RISK_LEVEL_COLOR[this.level()]);
  protected readonly label = computed(() => RISK_LEVEL_LABEL[this.level()]);
  protected readonly meaning = computed(() => RISK_LEVEL_MEANING[this.level()]);
  protected readonly offset = computed(() => ARC * (1 - Math.min(100, Math.max(0, this.score())) / 100));
}
