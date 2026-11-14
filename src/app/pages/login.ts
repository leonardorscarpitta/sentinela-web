import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth, safeReturnUrl } from '../core/auth';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-login',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page narrow">
      <div class="card hero">
        <img src="logo.svg" alt="" width="56" height="56" />
        <h1>Entrar na Sentinela Cidadã</h1>
        <p class="text-2">
          Acompanhe o Risco Cidadão dos apps da sua organização, os vazamentos de dados pessoais bloqueados e os
          alertas traduzidos para a população.
        </p>
        <button class="btn btn-primary" (click)="login()" [disabled]="busy()">
          <app-icon name="lock" /> Entrar com a conta da organização
        </button>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
        <small class="muted">
          O login acontece no Keycloak (OpenID Connect com PKCE). A senha nunca passa por este app, e o token de
          acesso fica só nesta aba.
        </small>
        <a routerLink="/regras">Testar as regras de PII sem entrar</a>
      </div>
    </section>
  `,
  styles: `
    .narrow { max-width: 560px; }
    .hero { display: grid; gap: 14px; justify-items: center; text-align: center; padding: 32px 24px; }
    .hero p { margin: 0; }
  `,
})
export class LoginPage {
  private readonly auth = inject(Auth);
  readonly returnUrl = input<string>();
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    if (this.auth.isAuthenticated()) void inject(Router).navigateByUrl('/');
  }

  protected login(): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(safeReturnUrl(this.returnUrl())).catch(() => {
      this.busy.set(false);
      this.error.set('Não foi possível abrir o Keycloak. Verifique se ele está no ar (e aceite o certificado local).');
    });
  }
}
