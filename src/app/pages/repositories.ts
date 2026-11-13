import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { OrgContext } from '../core/org';
import { StatusBadge } from '../shared/status-badge';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';

// Mesmas regras da API (CreateProjectCommand): só SSH, porque todo clone usa a chave de deploy gerada.
export const SSH_URL = /^(git@[\w.-]+:[\w./-]+\.git|ssh:\/\/[\w.@:/-]+)$/;
export const BRANCH = /^[\w./-]{1,255}$/;

@Component({
  selector: 'app-repositories',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StatusBadge, Problem, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Repositórios</h1>
          <p>Código das CitizenTechs monitoradas. Cada repositório é clonado só com uma chave de deploy somente leitura.</p>
        </div>
      </div>

      <div class="card table-wrap">
        @if (repos.error(); as e) {
          <app-problem [error]="e" />
        } @else if (repos.hasValue()) {
          <table>
            <thead>
              <tr><th>Repositório</th><th>Branch</th><th>Acesso</th><th>Última varredura</th><th>Achados abertos</th></tr>
            </thead>
            <tbody>
              @for (r of repos.value(); track r.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/repositorios', r.name]">{{ r.name }}</a><br />
                    <small class="loc muted">{{ r.url }}</small>
                  </td>
                  <td class="mono">{{ r.branch }}</td>
                  <td>
                    @if (r.accessStatus) {
                      <app-status kind="access" [value]="r.accessStatus" />
                    } @else {
                      <span class="muted">público</span>
                    }
                  </td>
                  <td>{{ r.lastScanAt ? (r.lastScanAt | date: 'dd/MM/yyyy HH:mm') : '—' }}</td>
                  <td>{{ r.openFindings ?? '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">Nenhum repositório conectado ainda.</td></tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="loading">Carregando repositórios</p>
        }
      </div>

      @if (org.can('pipelines')) {
        <form class="card connect" [formGroup]="form" (ngSubmit)="connect()">
          <h2><app-icon name="repo" /> Conectar repositório</h2>
          <p class="text-2">
            Informe a URL SSH. A Sentinela gera uma chave de deploy só para este repositório; você a cadastra no
            GitHub/GitLab como <strong>somente leitura</strong> e testa o acesso.
          </p>
          <div class="row">
            <label class="field">
              URL SSH
              <input type="text" class="mono" formControlName="url" placeholder="git@github.com:prefeitura/bairro-vivo.git"
                autocomplete="off" spellcheck="false" />
              @if (form.controls.url.dirty && form.controls.url.invalid) {
                <span class="error">Use uma URL SSH, como git&#64;github.com:dono/repo.git ou ssh://host/dono/repo.</span>
              }
            </label>
            <label class="field">
              Branch
              <input type="text" class="mono" formControlName="branch" autocomplete="off" spellcheck="false" />
              @if (form.controls.branch.dirty && form.controls.branch.invalid) {
                <span class="error">Nome de branch inválido.</span>
              }
            </label>
          </div>
          @if (error(); as e) {
            <app-problem [error]="e" />
          }
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || busy()">
            <app-icon name="key" /> Conectar e gerar chave
          </button>
        </form>
      }
    </section>
  `,
  styles: `
    .connect { display: grid; gap: 14px; }
    .connect h2 { display: flex; gap: 8px; align-items: center; }
    .connect p { margin: 0; }
    .connect .btn { justify-self: start; }
    .row { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
    .row label:first-child { grid-column: span 2; }
    @media (max-width: 640px) { .row label:first-child { grid-column: auto; } }
  `,
})
export class RepositoriesPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);
  protected readonly org = inject(OrgContext);
  protected readonly repos = this.api.repositories();
  protected readonly busy = signal(false);
  protected readonly error = signal<unknown>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    url: ['', [Validators.required, Validators.maxLength(512), Validators.pattern(SSH_URL)]],
    branch: ['main', [Validators.required, Validators.pattern(BRANCH)]],
  });

  protected connect(): void {
    if (this.form.invalid) return;
    const { url, branch } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.api.connect(url.trim(), branch.trim()).subscribe({
      next: (d) => void this.router.navigate(['/repositorios', d.project.name]),
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e);
      },
    });
  }
}
