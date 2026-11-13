import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth, LoginRequiredError } from '../core/auth';

/** Retorno do Keycloak: troca o código pelo token e volta para onde o usuário estava. */
@Component({
  selector: 'app-callback',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      @if (error(); as e) {
        <div class="problem" role="alert"><p>{{ e }}</p></div>
        <a routerLink="/entrar">Tentar entrar de novo</a>
      } @else {
        <p class="loading" aria-live="polite">Entrando</p>
      }
    </section>
  `,
})
export class CallbackPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const query = new URLSearchParams(location.search);
    // replaceUrl: o endereço com código e state sai do histórico.
    this.auth.completeLogin(query).then(
      (url) => this.router.navigateByUrl(url, { replaceUrl: true }),
      (e: unknown) => {
        if (e instanceof LoginRequiredError) {
          void this.router.navigate(['/entrar'], { queryParams: { returnUrl: e.returnUrl }, replaceUrl: true });
        } else {
          this.error.set(e instanceof Error ? e.message : 'Falha no login.');
        }
      },
    );
  }
}
