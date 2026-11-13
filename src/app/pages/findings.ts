import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import {
  CATEGORY_LABEL,
  FindingFilter,
  FindingKind,
  FindingStatus,
  KIND_LABEL,
  SEVERITY_LABEL,
  SINK_LABEL,
  STATUS_LABEL,
  Severity,
} from '../core/models';
import { SeverityBadge } from '../shared/severity-badge';
import { StatusBadge } from '../shared/status-badge';
import { Problem } from '../shared/problem';

const entries = <K extends string>(r: Record<K, string>) => Object.entries(r) as [K, string][];
const oneOf = <K extends string>(r: Record<K, string>, v: string | undefined): K | undefined =>
  v && v in r ? (v as K) : undefined;

@Component({
  selector: 'app-findings',
  imports: [DatePipe, RouterLink, SeverityBadge, StatusBadge, Problem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Achados</h1>
          <p>Tudo o que as varreduras encontraram. Em <strong>Privacidade (PII)</strong> ficam os dados pessoais mapeados e os vazamentos rastreados.</p>
        </div>
      </div>

      <form class="card filters" role="search" (submit)="$event.preventDefault()">
        <label class="field">
          Busca
          <input type="search" [value]="q() ?? ''" (change)="set('q', $event)" maxlength="200" placeholder="título, regra ou arquivo" />
        </label>
        <label class="field">
          Tipo
          <select (change)="set('kind', $event)">
            <option value="">Todos</option>
            @for (k of kinds; track k[0]) {
              <option [value]="k[0]" [selected]="k[0] === filter().kind">{{ k[1] }}</option>
            }
          </select>
        </label>
        <label class="field">
          Severidade
          <select (change)="set('severity', $event)">
            <option value="">Todas</option>
            @for (s of severities; track s[0]) {
              <option [value]="s[0]" [selected]="s[0] === filter().severity">{{ s[1] }}</option>
            }
          </select>
        </label>
        <label class="field">
          Status
          <select (change)="set('status', $event)">
            <option value="">Todos</option>
            @for (s of statuses; track s[0]) {
              <option [value]="s[0]" [selected]="s[0] === filter().status">{{ s[1] }}</option>
            }
          </select>
        </label>
        <label class="field">
          Repositório
          <select (change)="set('repository', $event)">
            <option value="">Todos</option>
            @for (n of repoNames(); track n) {
              <option [value]="n" [selected]="n === filter().repository">{{ n }}</option>
            }
          </select>
        </label>
      </form>

      <div class="card table-wrap">
        @if (findings.error(); as e) {
          <app-problem [error]="e" />
        } @else if (findings.hasValue()) {
          <p class="count muted">{{ findings.value().length }} achado(s)</p>
          <table>
            <thead>
              <tr><th>Severidade</th><th>Achado</th><th>Repositório</th><th>Local</th><th>Status</th><th>Detectado</th></tr>
            </thead>
            <tbody>
              @for (f of findings.value(); track f.id) {
                <tr>
                  <td><app-severity [value]="f.severity" /></td>
                  <td>
                    <a [routerLink]="['/achados', f.id]">{{ f.title }}</a><br />
                    <small class="muted">
                      {{ kindLabel[f.kind] ?? f.kind }}
                      @if (f.privacy; as p) {
                        · {{ categoryLabel[p.category] }}{{ p.sink ? ' → ' + sinkLabel[p.sink] : ' (mapeado)' }}
                      }
                      · <span class="mono">{{ f.ruleId }}</span>
                    </small>
                  </td>
                  <td>{{ f.repository }}</td>
                  <td class="loc">{{ f.location ? f.location.path + (f.location.line ? ':' + f.location.line : '') : (f.packageName ?? '—') }}</td>
                  <td><app-status kind="finding" [value]="f.status" /></td>
                  <td>{{ f.detectedAt | date: 'dd/MM/yyyy' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">Nenhum achado com esses filtros.</td></tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="loading">Carregando achados</p>
        }
      </div>
    </section>
  `,
  styles: `
    .count { margin: 0 0 8px; font-size: .85rem; }
    td.loc { min-width: 200px; }
    @media (max-width: 640px) {
      th:nth-child(4), td:nth-child(4), th:nth-child(6), td:nth-child(6) { display: none; }
      td:nth-child(2) { min-width: 180px; }
    }
  `,
})
export class FindingsPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);

  readonly q = input<string>();
  readonly kind = input<string>();
  readonly severity = input<string>();
  readonly status = input<string>();
  readonly repository = input<string>();

  protected readonly kinds = entries(KIND_LABEL);
  protected readonly severities = entries(SEVERITY_LABEL);
  protected readonly statuses = entries(STATUS_LABEL);
  protected readonly kindLabel = KIND_LABEL;
  protected readonly categoryLabel = CATEGORY_LABEL;
  protected readonly sinkLabel = SINK_LABEL;

  /** Só valores conhecidos chegam à API (parâmetros da URL são entrada do usuário). */
  protected readonly filter = computed<FindingFilter>(() => ({
    q: this.q()?.slice(0, 200) || undefined,
    kind: oneOf<FindingKind>(KIND_LABEL, this.kind()),
    severity: oneOf<Severity>(SEVERITY_LABEL, this.severity()),
    status: oneOf<FindingStatus>(STATUS_LABEL, this.status()),
    repository: this.repository()?.slice(0, 255) || undefined,
  }));

  protected readonly findings = this.api.findings(this.filter);
  private readonly repos = this.api.repositories();
  protected readonly repoNames = computed(() => (this.repos.hasValue() ? this.repos.value().map((r) => r.name) : []));

  protected set(key: keyof FindingFilter, e: Event): void {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value.trim();
    void this.router.navigate([], { queryParams: { [key]: value || null }, queryParamsHandling: 'merge' });
  }
}
