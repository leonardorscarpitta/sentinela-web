import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrgContext } from '../core/org';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-organizations',
  imports: [Problem, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Organizações</h1>
          <p>Escolha a organização cujos apps você quer acompanhar.</p>
        </div>
      </div>
      @if (error(); as e) {
        <app-problem [error]="e" />
      } @else if (org.memberships(); as list) {
        <div class="grid list">
          @for (o of list; track o.slug) {
            <button class="card pick" (click)="choose(o.slug)">
              <strong>{{ o.name }}</strong>
              <span class="mono muted">{{ o.slug }} · {{ o.role }}</span>
              <app-icon name="arrow" />
            </button>
          } @empty {
            <p class="empty">
              Sua conta ainda não participa de nenhuma organização. Peça um convite a quem administra a sua.
            </p>
          }
        </div>
      } @else {
        <p class="loading">Carregando organizações</p>
      }
    </section>
  `,
  styles: `
    .list { grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
    .pick { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; text-align: left; font: inherit; color: var(--text);
      cursor: pointer; align-items: center; }
    .pick:hover { border-color: var(--accent); }
    .pick app-icon { grid-row: 1 / 3; grid-column: 2; color: var(--accent-ink); }
  `,
})
export class OrganizationsPage {
  protected readonly org = inject(OrgContext);
  private readonly router = inject(Router);
  protected readonly error = signal<unknown>(null);

  constructor() {
    this.org.load().then(
      (list) => {
        if (list.length === 1) void this.router.navigateByUrl('/');
      },
      (e: unknown) => this.error.set(e),
    );
  }

  protected choose(slug: string): void {
    this.org.select(slug);
    void this.router.navigateByUrl('/');
  }
}
