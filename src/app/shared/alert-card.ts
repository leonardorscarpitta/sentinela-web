import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CitizenAlert } from '../core/models';
import { SeverityBadge } from './severity-badge';
import { Icon } from './icon';

/** Alerta ao cidadão escrito pela IA a partir de um vazamento (nenhum dado pessoal vai ao modelo). */
@Component({
  selector: 'app-alert-card',
  imports: [SeverityBadge, Icon, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <header>
        <app-severity [value]="alert().severity" />
        <span class="muted"><app-icon name="sparkle" [size]="14" /> {{ alert().model }}</span>
      </header>
      <h3>{{ alert().title }}</h3>
      <p>{{ alert().whatHappens }}</p>
      <dl>
        <dt><app-icon name="user" [size]="16" /> Quem é afetado</dt>
        <dd>{{ alert().whoIsAffected }}</dd>
        <dt><app-icon name="shield" [size]="16" /> O que fazer</dt>
        <dd>{{ alert().citizenGuidance }}</dd>
      </dl>
      <details>
        <summary><app-icon name="code" [size]="16" /> Correção para a equipe técnica</summary>
        <p>{{ alert().technicalFix }}</p>
      </details>
      <small class="muted">Gerado em {{ alert().createdAt | date: "dd/MM/yyyy 'às' HH:mm" }} · {{ alert().language }}</small>
    </article>
  `,
  styles: `
    article { display: grid; gap: 10px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    header .muted { display: inline-flex; gap: 4px; align-items: center; font-family: var(--mono); font-size: .8rem; }
    h3 { font-size: 1.05rem; }
    p { margin: 0; color: var(--text-2); }
    dl { margin: 0; display: grid; gap: 4px; }
    dt { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: .85rem; color: var(--muted); }
    dd { margin: 0 0 6px; }
    summary { cursor: pointer; font-weight: 700; display: inline-flex; gap: 6px; align-items: center; min-height: 36px; }
    details p { margin: 6px 0 0; }
  `,
})
export class AlertCard {
  readonly alert = input.required<CitizenAlert>();
}
