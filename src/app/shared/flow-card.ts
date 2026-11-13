import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORY_LABEL, SINK_LABEL, TaintFlow } from '../core/models';
import { SeverityBadge } from './severity-badge';
import { Icon } from './icon';

@Component({
  selector: 'app-flow-card',
  imports: [SeverityBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.safe]="flow().status === 'SANITIZADO'">
      <header>
        <div class="title">
          <span class="mono muted">{{ flow().id }}</span>
          <h3>{{ flow().dado }} → {{ sink() }}</h3>
        </div>
        <div class="tags">
          <span class="badge">{{ category() }}</span>
          <app-severity [value]="flow().severidade" />
          @if (flow().status === 'BLOQUEADO') {
            <span class="badge"><span class="dot" style="color: var(--critical)"></span><app-icon name="lock" [size]="14" />Vazamento bloqueado</span>
          } @else {
            <span class="badge"><span class="dot" style="color: var(--good)"></span><app-icon name="check" [size]="14" />Sanitizado</span>
          }
        </div>
      </header>
      <ol>
        @for (s of steps(); track $index) {
          <li [class]="s.kind">
            <div class="meta">
              <strong>{{ s.label }}</strong>
              <span class="muted">{{ s.descricao }}</span>
            </div>
            <code class="code">{{ s.trecho }}</code>
            <span class="muted mono loc">{{ s.arquivo }}:{{ s.linha }}</span>
          </li>
        }
      </ol>
      @if (flow().sanitizador) {
        <p class="muted">Sanitizador reconhecido: <code>{{ flow().sanitizador }}</code></p>
      }
    </article>
  `,
  styles: `
    article { display: grid; gap: 12px; }
    article.safe { border-style: dashed; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
    .title { display: grid; gap: 2px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; }
    ol { list-style: none; margin: 0; padding: 0 0 0 18px; display: grid; gap: 12px; border-left: 2px solid var(--border); }
    li { position: relative; display: grid; gap: 4px; min-width: 0; }
    li::before { content: ''; position: absolute; left: -26px; top: 4px; width: 14px; height: 14px; border-radius: 50%;
      background: var(--surface); border: 3px solid var(--accent); }
    li.sink::before { border-color: var(--critical); }
    article.safe li.sink::before { border-color: var(--good); }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
    .loc { font-size: .75rem; overflow-wrap: anywhere; }
    p { margin: 0; }
  `,
})
export class FlowCard {
  readonly flow = input.required<TaintFlow>();
  protected readonly sink = computed(() => SINK_LABEL[this.flow().destino.tipo]);
  protected readonly category = computed(() => CATEGORY_LABEL[this.flow().categoria]);
  protected readonly steps = computed(() => {
    const f = this.flow();
    return [
      { ...f.origem, kind: 'source', label: 'Origem' },
      ...f.passos.map((p) => ({ ...p, kind: 'step', label: 'Propagação' })),
      { ...f.destino, kind: 'sink', label: 'Destino' },
    ];
  });
}
