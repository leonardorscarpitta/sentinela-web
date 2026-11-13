import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { RISK_LEVEL_LABEL, riskLevel } from '../core/risk';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-scans',
  imports: [DatePipe, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Varreduras</h1>
          <p>Histórico de análises do código das CitizenTechs.</p>
        </div>
        <a class="btn btn-primary" routerLink="/varreduras/nova"><app-icon name="shield" /> Nova varredura</a>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Varredura</th><th>Projeto</th><th>Data</th><th>Risco Cidadão</th>
              <th>Dados mapeados</th><th>Vazamentos</th><th>Gate</th>
            </tr>
          </thead>
          <tbody>
            @for (s of api.scans(); track s.id) {
              <tr>
                <td><a class="mono" [routerLink]="['/varreduras', s.id]">{{ s.id }}</a></td>
                <td>{{ s.projeto }} <span class="muted">v{{ s.versao }}</span></td>
                <td>{{ s.iniciadaEm | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <span class="risk">
                    <strong>{{ s.riscoCidadao }}</strong>
                    <span class="bar"><span [style.width.%]="s.riscoCidadao"></span></span>
                    <span class="muted">{{ level(s.riscoCidadao) }}</span>
                  </span>
                </td>
                <td>{{ s.achados.length }}</td>
                <td>{{ blocked(s.fluxos) }}</td>
                <td>
                  @if (s.veredito === 'BLOQUEADO') {
                    <span class="badge"><span class="dot" style="color: var(--critical)"></span>Bloqueado</span>
                  } @else {
                    <span class="badge"><span class="dot" style="color: var(--good)"></span>Aprovado</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .risk { display: inline-grid; grid-template-columns: 2.2ch 80px auto; gap: 8px; align-items: center; }
    .bar { height: 8px; background: var(--surface-2); border-radius: 0 4px 4px 0; }
    .bar span { display: block; height: 100%; background: var(--accent); border-radius: 0 4px 4px 0; }
  `,
})
export class ScansPage {
  protected readonly api = inject(SentinelaApi);
  protected level = (v: number) => RISK_LEVEL_LABEL[riskLevel(v)];
  protected blocked = (f: { status: string }[]) => f.filter((x) => x.status === 'BLOQUEADO').length;
}
