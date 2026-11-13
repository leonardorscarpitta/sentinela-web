import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AiAlert } from '../core/models';
import { SeverityBadge } from './severity-badge';
import { Icon } from './icon';

@Component({
  selector: 'app-alert-card',
  imports: [SeverityBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <header>
        <app-severity [value]="alert().severidade" />
        <span class="muted mono">{{ alert().fluxoId }}</span>
      </header>
      <h3>{{ alert().titulo }}</h3>
      <p>{{ alert().oQueAcontece }}</p>
      <dl>
        <dt><app-icon name="user" [size]="16" /> Quem é afetado</dt>
        <dd>{{ alert().quemEAfetado }}</dd>
        <dt><app-icon name="shield" [size]="16" /> O que fazer</dt>
        <dd>{{ alert().orientacaoCidadao }}</dd>
      </dl>
      @if (!compact()) {
        <details>
          <summary><app-icon name="code" [size]="16" /> Correção para a equipe técnica</summary>
          <p>{{ alert().correcaoTecnica }}</p>
          <pre class="diff">@for (l of lines(); track $index) {<span [class]="l.cls">{{ l.text }}</span>}</pre>
        </details>
      }
    </article>
  `,
  styles: `
    article { display: grid; gap: 10px; }
    header { display: flex; justify-content: space-between; align-items: center; }
    h3 { font-size: 1.05rem; }
    p { margin: 0; color: var(--text-2); }
    dl { margin: 0; display: grid; gap: 4px; }
    dt { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: .85rem; color: var(--muted); }
    dd { margin: 0 0 6px; }
    summary { cursor: pointer; font-weight: 700; display: inline-flex; gap: 6px; align-items: center; min-height: 36px; }
    details p { margin: 6px 0 8px; }
  `,
})
export class AlertCard {
  readonly alert = input.required<AiAlert>();
  readonly compact = input(false);
  protected readonly lines = computed(() =>
    this.alert()
      .patch.split('\n')
      .map((text) => ({ text, cls: text.startsWith('-') ? 'del' : text.startsWith('+') ? 'add' : '' })),
  );
}
