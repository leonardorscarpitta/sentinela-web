import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { problemCode, problemMessage, problemStatus } from '../core/http';
import { Icon } from './icon';

/** Erro da API (ProblemDetail) em linguagem simples, com o código técnico para quem for depurar. */
@Component({
  selector: 'app-problem',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="problem" role="alert">
      <app-icon name="alert" />
      <div>
        <p>{{ message() }}</p>
        @if (code()) {
          <small class="mono muted">{{ status() }} · {{ code() }}</small>
        }
      </div>
    </div>
  `,
})
export class Problem {
  readonly error = input.required<unknown>();
  protected readonly message = computed(() => problemMessage(this.error()));
  protected readonly code = computed(() => problemCode(this.error()) ?? (problemStatus(this.error()) ? 'http' : ''));
  protected readonly status = computed(() => problemStatus(this.error()));
}
