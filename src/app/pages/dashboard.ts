import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { OrgContext } from '../core/org';
import { CATEGORY_LABEL, KIND_LABEL } from '../core/models';
import { weightTables } from '../core/risk';
import { RiskGauge } from '../shared/risk-gauge';
import { TrendChart } from '../shared/trend-chart';
import { CategoryBars } from '../shared/category-bars';
import { FlowCard } from '../shared/flow-card';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink, RiskGauge, TrendChart, CategoryBars, FlowCard, Problem, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);
  protected readonly org = inject(OrgContext);

  /** Filtro por repositório (?repositorio=nome). */
  readonly repositorio = input<string>();
  private readonly repo = computed(() => this.repositorio() || null);

  protected readonly risk = this.api.citizenRisk(this.repo);
  protected readonly summary = this.api.summary();
  protected readonly repos = this.api.repositories();
  private readonly openPrivacy = this.api.findings(() => ({ kind: 'privacy', status: 'open', repository: this.repo() ?? undefined }));

  protected readonly repoNames = computed(() => (this.repos.hasValue() ? this.repos.value().map((r) => r.name) : []));

  protected readonly trend = computed(() =>
    this.risk.hasValue()
      ? this.risk.value().trend.map((t) => ({ rotulo: `#${t.runNumber}`, data: t.date, valor: t.score, detalhe: t.repository }))
      : [],
  );

  protected readonly categories = computed(() =>
    this.risk.hasValue()
      ? this.risk
          .value()
          // A API lista as 5 categorias sempre; só as que têm algo aparecem nas barras.
          .byCategory.filter((c) => c.weight > 0 || c.flows > 0 || c.mapped > 0)
          .sort((a, b) => b.weight - a.weight)
          .map((c) => ({
            rotulo: CATEGORY_LABEL[c.category] ?? c.category,
            valor: c.weight,
            detalhe: `${c.flows} vazamento(s) · ${c.mapped} dado(s) mapeado(s)`,
          }))
      : [],
  );

  protected readonly topFlows = computed(() =>
    this.openPrivacy.hasValue() ? this.openPrivacy.value().filter((f) => f.privacy?.type === 'flow').slice(0, 3) : [],
  );

  protected readonly flowsLoaded = computed(() => this.openPrivacy.hasValue());

  protected readonly weights = computed(() => (this.risk.hasValue() ? weightTables(this.risk.value().weights) : null));

  protected readonly byKind = computed(() =>
    this.summary.hasValue()
      ? this.summary
          .value()
          .byKind.filter((k) => k.count > 0)
          .map((k) => ({ label: KIND_LABEL[k.kind] ?? k.kind, count: k.count, kind: k.kind }))
      : [],
  );

  protected filter(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    void this.router.navigate([], { queryParams: { repositorio: value || null } });
  }
}
