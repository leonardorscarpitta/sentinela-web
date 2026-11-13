import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { OrgContext } from '../core/org';
import { RunDetails, SEVERITY_LABEL, STAGE_LABEL, Severity, TRIGGER_LABEL } from '../core/models';
import { Observable } from 'rxjs';
import { StatusBadge } from '../shared/status-badge';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';
import { DurationPipe } from '../shared/duration';

@Component({
  selector: 'app-run-detail',
  imports: [DatePipe, RouterLink, StatusBadge, Problem, Icon, DurationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a routerLink="/varreduras" class="back"><app-icon name="back" /> Varreduras</a>
      @if (details.error(); as e) {
        <app-problem [error]="e" />
      } @else if (details.hasValue()) {
        @let r = details.value().run;
        <div class="page-head">
          <div>
            <h1>Varredura #{{ r.number }} <app-status kind="run" [value]="r.status" /></h1>
            <p>
              <a [routerLink]="['/repositorios', r.repository]">{{ r.repository }}</a> ·
              <span class="mono">{{ r.branch }}@if (r.commit) {&#64;{{ r.commit.slice(0, 7) }}}</span> ·
              {{ trigger[r.trigger] ?? r.trigger }}@if (r.actor) { por {{ r.actor }}} ·
              {{ r.startedAt | date: "dd/MM/yyyy 'às' HH:mm" }} · {{ r.durationSeconds | duration }}
            </p>
            @if (r.message) {
              <p class="muted">{{ r.message }}</p>
            }
          </div>
          @if (org.can('pipelines') && !r.repositoryRemoved) {
            <div class="actions">
              @if (r.status === 'queued' || r.status === 'running') {
                <button class="btn btn-sm" (click)="act(api.cancel(r.number))" [disabled]="busy()">Cancelar</button>
              } @else {
                <button class="btn btn-sm" (click)="act(api.rerun(r.number), true)" [disabled]="busy()"><app-icon name="refresh" /> Rodar de novo</button>
              }
            </div>
          }
        </div>
        @if (error(); as e) {
          <app-problem [error]="e" />
        }

        <div class="kpis">
          <div class="card kpi"><span class="label">Achados</span><strong>{{ r.totalFindings }}</strong><span class="muted">{{ r.newFindings }} novos</span></div>
          @if (pii(); as p) {
            <a class="card kpi pii" routerLink="/achados" [queryParams]="{ kind: 'privacy', repository: r.repository }">
              <span class="label">Estágio pii</span>
              <strong>{{ p.findings }}</strong>
              <span class="muted">dados pessoais · <app-status kind="stage" [value]="p.status" /></span>
            </a>
          }
          <div class="card kpi">
            <span class="label">Gate</span>
            <strong class="gate" [class.bad]="r.status === 'failed'">{{ r.status === 'failed' ? 'Bloqueado' : r.status === 'success' ? 'Liberado' : '—' }}</strong>
            <span class="muted">{{ blockedBy() }}</span>
          </div>
        </div>

        <ol class="stages">
          @for (s of details.value().stages; track s.id) {
            <li class="card" [class.pii]="s.id === 'pii'">
              <div class="head">
                <div>
                  <h2>{{ stageLabel[s.id] ?? s.id }}</h2>
                  <span class="muted">{{ s.tool }} · {{ s.durationSeconds | duration }} · {{ s.findings }} achado(s)</span>
                </div>
                <app-status kind="stage" [value]="s.status" />
              </div>
              @if (s.failedBy) {
                <p class="fail"><app-icon name="lock" [size]="16" /> Bloqueou: achado de severidade {{ sev(s.failedBy) }} ou maior.</p>
              }
              @if (s.log.length) {
                <details>
                  <summary>Log ({{ s.log.length }} linhas)</summary>
                  <pre class="code log">{{ s.log.join('\\n') }}</pre>
                </details>
              }
            </li>
          }
        </ol>
      } @else {
        <p class="loading">Carregando varredura</p>
      }
    </section>
  `,
  styles: `
    h1 { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .page-head p { overflow-wrap: anywhere; }
    a.kpi { color: var(--text); text-decoration: none; }
    .kpi.pii, li.pii { border-color: var(--accent); }
    .gate { font-size: 1.5rem; color: var(--good); }
    .gate.bad { color: var(--critical); }
    .stages { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .stages li { display: grid; gap: 8px; padding: 14px 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .head h2 { font-size: 1rem; }
    .head .muted { font-size: .85rem; }
    .fail { margin: 0; display: flex; gap: 6px; align-items: center; color: var(--critical); font-weight: 700; }
    summary { cursor: pointer; font-weight: 700; min-height: 32px; }
    .log { max-height: 320px; overflow: auto; font-size: .75rem; margin-top: 6px; }
  `,
})
export class RunDetailPage {
  protected readonly api = inject(SentinelaApi);
  protected readonly org = inject(OrgContext);
  private readonly router = inject(Router);

  readonly number = input.required<string>();
  protected readonly details = this.api.run(() => Number(this.number()));
  protected readonly stageLabel = STAGE_LABEL;
  protected readonly trigger = TRIGGER_LABEL;
  protected readonly busy = signal(false);
  protected readonly error = signal<unknown>(null);

  protected readonly pii = computed(() => (this.details.hasValue() ? this.details.value().stages.find((s) => s.id === 'pii') : undefined));
  protected readonly blockedBy = computed(() => {
    if (!this.details.hasValue()) return '';
    const failed = this.details.value().stages.filter((s) => s.status === 'failed').map((s) => STAGE_LABEL[s.id] ?? s.id);
    return failed.length ? `por ${failed.join(', ')}` : 'nenhum estágio falhou';
  });

  constructor() {
    effect((onCleanup) => {
      const s = this.details.hasValue() ? this.details.value().run.status : null;
      if (s !== 'queued' && s !== 'running') return;
      const t = setTimeout(() => this.details.reload(), 4000);
      onCleanup(() => clearTimeout(t));
    });
  }

  protected sev(s: Severity): string {
    return SEVERITY_LABEL[s]?.toLowerCase() ?? s;
  }

  protected act(call: Observable<RunDetails>, navigate = false): void {
    this.busy.set(true);
    this.error.set(null);
    call.subscribe({
      next: (d) => {
        this.busy.set(false);
        if (navigate) void this.router.navigate(['/varreduras', d.run.number]);
        else this.details.set(d);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e);
      },
    });
  }
}
