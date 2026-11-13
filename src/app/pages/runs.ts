import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { TRIGGER_LABEL } from '../core/models';
import { StatusBadge } from '../shared/status-badge';
import { Problem } from '../shared/problem';
import { DurationPipe } from '../shared/duration';

@Component({
  selector: 'app-runs',
  imports: [DatePipe, RouterLink, StatusBadge, Problem, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Varreduras</h1>
          <p>Execuções do pipeline. O estágio <strong>pii</strong> mapeia dados pessoais e bloqueia vazamentos.</p>
        </div>
        <label class="field">
          Repositório
          <select [value]="repositorio() ?? ''" (change)="filter($event)">
            <option value="">Todos</option>
            @for (n of repoNames(); track n) {
              <option [value]="n">{{ n }}</option>
            }
          </select>
        </label>
      </div>

      <div class="card table-wrap">
        @if (runs.error(); as e) {
          <app-problem [error]="e" />
        } @else if (runs.hasValue()) {
          <table>
            <thead>
              <tr><th>Nº</th><th>Repositório</th><th>Commit</th><th>Origem</th><th>Início</th><th>Duração</th><th>Achados</th><th>Status</th></tr>
            </thead>
            <tbody>
              @for (r of runs.value(); track r.number) {
                <tr>
                  <td><a [routerLink]="['/varreduras', r.number]">#{{ r.number }}</a></td>
                  <td>{{ r.repository }}@if (r.repositoryRemoved) { <small class="muted">(removido)</small> }<br />
                    <small class="mono muted">{{ r.branch }}</small></td>
                  <td>
                    <span class="mono">{{ r.commit?.slice(0, 7) ?? '—' }}</span>
                    @if (r.message) { <br /><small class="muted msg">{{ r.message }}</small> }
                  </td>
                  <td>{{ trigger[r.trigger] ?? r.trigger }}</td>
                  <td>{{ r.startedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ r.durationSeconds | duration }}</td>
                  <td>{{ r.totalFindings }} <small class="muted">({{ r.newFindings }} novos)</small></td>
                  <td><app-status kind="run" [value]="r.status" /></td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">Nenhuma varredura ainda. Conecte um repositório e inicie a primeira.</td></tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="loading">Carregando varreduras</p>
        }
      </div>
    </section>
  `,
  styles: `.msg { display: inline-block; max-width: 28ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }`,
})
export class RunsPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);

  readonly repositorio = input<string>();
  protected readonly runs = this.api.runs(() => this.repositorio() || null);
  private readonly repos = this.api.repositories();
  protected readonly repoNames = computed(() => (this.repos.hasValue() ? this.repos.value().map((r) => r.name) : []));
  protected readonly trigger = TRIGGER_LABEL;

  constructor() {
    // Atualiza a lista a cada 5 s enquanto houver varredura na fila ou rodando
    // (lê o valor, não um computed booleano, para reagendar a cada resposta nova).
    effect((onCleanup) => {
      const list = this.runs.hasValue() ? this.runs.value() : [];
      if (!list.some((r) => r.status === 'queued' || r.status === 'running')) return;
      const t = setTimeout(() => this.runs.reload(), 5000);
      onCleanup(() => clearTimeout(t));
    });
  }

  protected filter(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    void this.router.navigate([], { queryParams: { repositorio: value || null } });
  }
}
