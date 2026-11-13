import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORY_LABEL, FindingSummary, ROLE_LABEL, SINK_LABEL, TraceStep } from '../core/models';
import { SeverityBadge } from './severity-badge';
import { Icon } from './icon';

/** Caminho de um dado pessoal: origem → propagação → destino (só arquivo:linha, nunca código ou valores). */
@Component({
  selector: 'app-flow-card',
  imports: [SeverityBadge, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.safe]="!active()">
      <header>
        <div class="title">
          <span class="mono muted">{{ finding().reference }} · {{ finding().ruleId }}</span>
          <h3>
            @if (link()) {
              <a [routerLink]="['/achados', finding().id]">{{ heading() }}</a>
            } @else {
              {{ heading() }}
            }
          </h3>
        </div>
        <div class="tags">
          <span class="badge">{{ category() }}</span>
          <app-severity [value]="finding().severity" />
          @if (isFlow()) {
            @if (active()) {
              <span class="badge"><span class="dot" style="color: var(--critical)"></span><app-icon name="lock" [size]="14" />Vazamento bloqueado</span>
            } @else {
              <span class="badge"><span class="dot" style="color: var(--good)"></span><app-icon name="check" [size]="14" />Fora do gate</span>
            }
          }
        </div>
      </header>
      @if (steps().length) {
        <ol>
          @for (s of steps(); track $index) {
            <li [class]="s.role">
              <strong>{{ roleLabel[s.role] }}</strong>
              <span class="mono loc">{{ s.path }}:{{ s.line }}</span>
            </li>
          }
        </ol>
      } @else if (finding().location; as loc) {
        <p class="muted">Dado mapeado em <span class="mono loc">{{ loc.path }}{{ loc.line ? ':' + loc.line : '' }}</span></p>
      }
    </article>
  `,
  styles: `
    article { display: grid; gap: 12px; }
    article.safe { border-style: dashed; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
    .title { display: grid; gap: 2px; min-width: 0; }
    .title .mono { overflow-wrap: anywhere; }
    h3 a { color: var(--text); }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; }
    ol { list-style: none; margin: 0 0 0 8px; padding: 0 0 0 18px; display: grid; gap: 12px; border-left: 2px solid var(--border); }
    li { position: relative; display: grid; gap: 2px; min-width: 0; }
    li::before { content: ''; position: absolute; left: -26px; top: 4px; width: 14px; height: 14px; border-radius: 50%;
      background: var(--surface); border: 3px solid var(--accent); }
    li.sink::before { border-color: var(--critical); }
    article.safe li.sink::before { border-color: var(--good); }
    .loc { font-size: .8rem; overflow-wrap: anywhere; }
    p { margin: 0; }
  `,
})
export class FlowCard {
  readonly finding = input.required<FindingSummary>();
  /** Título vira link para o detalhe do achado. */
  readonly link = input(false);

  protected readonly roleLabel = ROLE_LABEL;
  private readonly privacy = computed(() => this.finding().privacy ?? null);
  protected readonly isFlow = computed(() => this.privacy()?.type === 'flow');
  protected readonly active = computed(() => ['open', 'triaged'].includes(this.finding().status));
  protected readonly category = computed(() => {
    const c = this.privacy()?.category;
    return c ? CATEGORY_LABEL[c] : 'Dado pessoal';
  });
  protected readonly heading = computed(() => {
    const sink = this.privacy()?.sink;
    return sink ? `${this.category()} → ${SINK_LABEL[sink] ?? sink}` : this.finding().title;
  });
  protected readonly steps = computed<TraceStep[]>(() => this.privacy()?.trace ?? []);
}
