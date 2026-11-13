import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SentinelaApi } from '../core/sentinela-api';
import { OrgContext } from '../core/org';
import { RepositoryAccess, SEVERITY_LABEL, STAGE_LABEL } from '../core/models';
import { StatusBadge } from '../shared/status-badge';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';

const CHECK_LABEL: Record<string, string> = {
  queued: 'Teste na fila',
  running: 'Testando acesso',
  ok: 'Acesso confirmado',
  failed: 'Acesso recusado',
};

@Component({
  selector: 'app-repository-detail',
  imports: [DatePipe, RouterLink, StatusBadge, Problem, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a routerLink="/repositorios" class="back"><app-icon name="back" /> Repositórios</a>
      @if (repo.error(); as e) {
        <app-problem [error]="e" />
      } @else if (repo.hasValue()) {
        @let p = repo.value().project;
        <div class="page-head">
          <div>
            <h1>{{ p.name }}</h1>
            <p><span class="loc">{{ p.url }}</span> · branch <span class="mono">{{ p.branch }}</span>
              @if (p.stack) { · {{ p.stack }} }</p>
          </div>
          <div class="actions">
            <a class="btn btn-sm" routerLink="/varreduras" [queryParams]="{ repositorio: p.name }"><app-icon name="list" /> Varreduras</a>
            <a class="btn btn-sm" routerLink="/achados" [queryParams]="{ repository: p.name, kind: 'privacy' }"><app-icon name="bug" /> Achados</a>
            @if (org.can('pipelines')) {
              <button class="btn btn-primary btn-sm" (click)="scan(p.name)" [disabled]="!canScan() || busy()">
                <app-icon name="play" /> Iniciar varredura
              </button>
            }
          </div>
        </div>
        @if (error(); as e) {
          <app-problem [error]="e" />
        }

        <div class="grid grid-2">
          <div class="card access">
            <div class="card-title">
              <h2><app-icon name="key" /> Chave de deploy</h2>
              @if (p.accessStatus) {
                <app-status kind="access" [value]="p.accessStatus" />
              }
            </div>
            @if (access.hasValue()) {
              @let a = access.value();
              @if (a.type === 'public') {
                <p class="text-2">Repositório público: não precisa de chave.</p>
              } @else if (a.deployKey; as k) {
                <ol class="steps">
                  <li>Copie a chave pública abaixo.</li>
                  <li>No provedor ({{ a.host }}), adicione-a como <strong>deploy key somente leitura</strong>.</li>
                  <li>Clique em <strong>Testar acesso</strong>.</li>
                </ol>
                <pre class="code key">{{ k.publicKey }}</pre>
                <p class="muted small">Impressão digital <span class="mono">{{ k.fingerprint }}</span> · criada em
                  {{ k.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
                @if (a.hostKeyFingerprint) {
                  <p class="muted small">Chave do servidor {{ a.hostKeyPinned ? '(fixada)' : '(registrada no 1º acesso)' }}:
                    <span class="mono">{{ a.hostKeyFingerprint }}</span></p>
                }
                <div class="actions">
                  <button class="btn btn-sm" (click)="copy(k.publicKey)"><app-icon name="copy" /> {{ copied() ? 'Copiada' : 'Copiar chave' }}</button>
                  @if (org.can('pipelines')) {
                    <button class="btn btn-sm btn-primary" (click)="check(p.name)" [disabled]="checking() || busy()">
                      <app-icon name="refresh" /> Testar acesso
                    </button>
                  }
                  @if (org.can('integrations')) {
                    <button class="btn btn-sm btn-ghost" (click)="rotate(p.name)" [disabled]="busy()">Gerar nova chave</button>
                  }
                </div>
              } @else {
                <p class="text-2">Nenhuma chave gerada.</p>
              }
              @if (a.lastCheck; as c) {
                <p class="check" [class.bad]="c.status === 'failed'" [class.ok]="c.status === 'ok'" aria-live="polite">
                  <strong>{{ checkLabel[c.status] }}</strong>
                  @if (c.message) { — {{ c.message }} }
                  <small class="muted">({{ c.requestedAt | date: 'dd/MM HH:mm' }})</small>
                </p>
              }
            } @else if (access.error(); as e) {
              <app-problem [error]="e" />
            } @else {
              <p class="loading">Carregando acesso</p>
            }
          </div>

          <div class="card">
            <div class="card-title">
              <h2><app-icon name="shield" /> Pipeline</h2>
              <small>estágios que rodam em cada varredura</small>
            </div>
            <ul class="stages">
              @for (s of repo.value().pipeline; track s.id) {
                <li [class.pii]="s.id === 'pii'" [class.off]="!s.enabled">
                  <strong>{{ stageLabel[s.id] ?? s.id }}</strong>
                  <span class="muted">{{ s.tool }}</span>
                  <span class="badge">{{ s.enabled ? (s.failOn && s.failOn !== 'never' ? 'bloqueia a partir de ' + (sevLabel[s.failOn] ?? s.failOn).toLowerCase() : 'só informa') : 'desligado' }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      } @else {
        <p class="loading">Carregando repositório</p>
      }
    </section>
  `,
  styles: `
    .steps { margin: 0 0 12px; padding-left: 20px; display: grid; gap: 4px; }
    .key { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .78rem; }
    .small { font-size: .82rem; margin: 8px 0; overflow-wrap: anywhere; }
    .access .actions { margin-top: 12px; }
    .check { margin: 14px 0 0; padding: 8px 12px; border-radius: 8px; background: var(--surface-2); border-left: 4px solid var(--accent); }
    .check.ok { border-left-color: var(--good); }
    .check.bad { border-left-color: var(--critical); }
    .stages { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .stages li { display: grid; grid-template-columns: 1fr auto; gap: 0 10px; padding: 8px 10px; border-radius: 8px; }
    .stages li .muted { grid-column: 1; font-size: .85rem; }
    .stages li .badge { grid-row: 1 / 3; grid-column: 2; align-self: center; }
    .stages li.pii { background: var(--accent-soft); }
    .stages li.off { opacity: .55; }
  `,
})
export class RepositoryDetailPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);
  protected readonly org = inject(OrgContext);

  readonly name = input.required<string>();
  protected readonly repo = this.api.repository(this.name);
  protected readonly access = this.api.access(this.name);
  protected readonly stageLabel = STAGE_LABEL;
  protected readonly sevLabel: Record<string, string> = SEVERITY_LABEL;
  protected readonly checkLabel = CHECK_LABEL;
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly error = signal<unknown>(null);

  protected readonly checking = computed(() => {
    const s = this.access.hasValue() ? this.access.value().lastCheck?.status : null;
    return s === 'queued' || s === 'running';
  });

  protected readonly canScan = computed(() => {
    const p = this.repo.hasValue() ? this.repo.value().project : null;
    return !!p && (p.access === 'public' || p.accessStatus === 'verified');
  });

  constructor() {
    // Enquanto o runner testa o acesso, consulta de novo a cada 3 s.
    effect((onCleanup) => {
      const s = this.access.hasValue() ? this.access.value().lastCheck?.status : null;
      if (s !== 'queued' && s !== 'running') return;
      const t = setTimeout(() => {
        this.access.reload();
        this.repo.reload();
      }, 3000);
      onCleanup(() => clearTimeout(t));
    });
  }

  protected copy(text: string): void {
    void navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  protected check(name: string): void {
    this.run(this.api.checkAccess(name), (a) => this.access.set(a));
  }

  protected rotate(name: string): void {
    if (!confirm('Gerar uma nova chave? A chave atual deixa de funcionar e o acesso volta a "aguardando chave".')) return;
    this.run(this.api.rotateKey(name), (a) => {
      this.access.set(a);
      this.repo.reload();
    });
  }

  protected scan(name: string): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.scan(name).subscribe({
      next: (d) => void this.router.navigate(['/varreduras', d.run.number]),
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e);
      },
    });
  }

  private run(call: Observable<RepositoryAccess>, done: (a: RepositoryAccess) => void): void {
    this.busy.set(true);
    this.error.set(null);
    call.subscribe({
      next: (a) => {
        this.busy.set(false);
        done(a);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e);
      },
    });
  }
}
