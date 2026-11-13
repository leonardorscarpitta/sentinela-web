import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { CATEGORY_LABEL, PiiCategory, SEVERITY_LABEL, SINK_LABEL, Severity } from '../core/models';
import { CATEGORY_WEIGHT, EXPOSURE_WEIGHT, LATENT_FACTOR, SEVERITY_WEIGHT, flowWeight } from '../core/risk';
import { RiskGauge } from '../shared/risk-gauge';
import { TrendChart } from '../shared/trend-chart';
import { CategoryBars } from '../shared/category-bars';
import { AlertCard } from '../shared/alert-card';
import { Icon } from '../shared/icon';

const SEVERITY_ORDER: Severity[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, KeyValuePipe, RouterLink, RiskGauge, TrendChart, CategoryBars, AlertCard, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage {
  private readonly api = inject(SentinelaApi);
  protected readonly scan = this.api.latest;

  protected readonly blocked = computed(() => this.scan().fluxos.filter((f) => f.status === 'BLOQUEADO'));
  protected readonly sanitized = computed(() => this.scan().fluxos.filter((f) => f.status === 'SANITIZADO'));

  protected readonly previous = computed(() => this.api.scans()[1]);
  protected readonly delta = computed(() => {
    const prev = this.previous();
    return prev ? this.scan().riscoCidadao - prev.riscoCidadao : 0;
  });

  protected readonly trend = computed(() =>
    [...this.api.scans()]
      .filter((s) => s.projeto === this.scan().projeto)
      .slice(0, 8)
      .reverse()
      .map((s) => ({ rotulo: s.versao, data: s.iniciadaEm, valor: s.riscoCidadao })),
  );

  protected readonly categories = computed(() => {
    const acc = new Map<PiiCategory, { peso: number; fluxos: number; achados: number }>();
    for (const f of this.blocked()) {
      const c = acc.get(f.categoria) ?? { peso: 0, fluxos: 0, achados: 0 };
      c.peso += flowWeight(f);
      c.fluxos++;
      acc.set(f.categoria, c);
    }
    for (const a of this.scan().achados) {
      const c = acc.get(a.categoria) ?? { peso: 0, fluxos: 0, achados: 0 };
      c.achados++;
      acc.set(a.categoria, c);
    }
    return [...acc.entries()]
      .map(([cat, c]) => ({
        rotulo: CATEGORY_LABEL[cat],
        valor: c.peso,
        detalhe: `${c.fluxos} vazamento(s) · ${c.achados} dado(s) mapeado(s)`,
      }))
      .sort((a, b) => b.valor - a.valor);
  });

  protected readonly topAlerts = computed(() =>
    [...this.scan().alertas]
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severidade) - SEVERITY_ORDER.indexOf(b.severidade))
      .slice(0, 3),
  );

  protected readonly weights = {
    severidade: SEVERITY_WEIGHT,
    categoria: CATEGORY_WEIGHT,
    exposicao: EXPOSURE_WEIGHT,
    latente: LATENT_FACTOR,
  };
  protected readonly labels = { sev: SEVERITY_LABEL, cat: CATEGORY_LABEL, sink: SINK_LABEL } as Record<
    string,
    Record<string, string>
  >;
  protected readonly keepOrder = () => 0;
}
