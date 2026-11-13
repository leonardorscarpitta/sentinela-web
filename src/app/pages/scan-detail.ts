import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { CATEGORY_LABEL, Scan } from '../core/models';
import { DEFAULT_RULES } from '../core/mock-data';
import { RiskGauge } from '../shared/risk-gauge';
import { AlertCard } from '../shared/alert-card';
import { FlowCard } from '../shared/flow-card';
import { SeverityBadge } from '../shared/severity-badge';
import { Icon } from '../shared/icon';

type Tab = 'alertas' | 'fluxos' | 'pii';

const TABS: { id: Tab; label: string }[] = [
  { id: 'alertas', label: 'Alertas ao cidadão (IA)' },
  { id: 'fluxos', label: 'Taint analysis' },
  { id: 'pii', label: 'Mapeamento de PII' },
];

@Component({
  selector: 'app-scan-detail',
  imports: [DatePipe, RouterLink, RiskGauge, AlertCard, FlowCard, SeverityBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-detail.html',
  styleUrl: './scan-detail.scss',
})
export class ScanDetailPage {
  private readonly api = inject(SentinelaApi);

  readonly id = input.required<string>();
  readonly aba = input<Tab | undefined>();

  protected readonly tabs = TABS;
  protected readonly tab = linkedSignal<Tab>(() => this.aba() ?? 'alertas');
  protected readonly scan = computed(() => this.api.scan(this.id()));
  protected readonly categoryLabel = CATEGORY_LABEL;
  private readonly ruleNames = new Map(DEFAULT_RULES.map((r) => [r.id, r.nome]));

  protected readonly flows = computed(() => {
    const f = this.scan()?.fluxos ?? [];
    return [...f.filter((x) => x.status === 'BLOQUEADO'), ...f.filter((x) => x.status === 'SANITIZADO')];
  });

  protected ruleName(id: string): string {
    return this.ruleNames.get(id) ?? id;
  }

  protected exportJson(scan: Scan): void {
    this.download(`${scan.id}-auditoria.json`, 'application/json', JSON.stringify(scan, null, 2));
  }

  protected exportMarkdown(scan: Scan): void {
    const md = [
      `# Auditoria ${scan.id} — ${scan.projeto} v${scan.versao}`,
      '',
      `- Data: ${scan.iniciadaEm}`,
      `- Risco Cidadão: **${scan.riscoCidadao}/100**`,
      `- Gate: **${scan.veredito}**`,
      `- Arquivos analisados: ${scan.arquivosAnalisados}`,
      '',
      '## Taint analysis',
      '',
      ...scan.fluxos.flatMap((f) => [
        `### ${f.id} — ${f.dado} (${f.status})`,
        '',
        `- Origem: \`${f.origem.arquivo}:${f.origem.linha}\` — \`${f.origem.trecho}\``,
        ...f.passos.map((p) => `- Propagação: \`${p.arquivo}:${p.linha}\` — \`${p.trecho}\``),
        `- Destino (${f.destino.tipo}): \`${f.destino.arquivo}:${f.destino.linha}\` — \`${f.destino.trecho}\``,
        ...(f.sanitizador ? [`- Sanitizador: \`${f.sanitizador}\``] : []),
        '',
      ]),
      '## Mapeamento de PII',
      '',
      '| ID | Regra | Severidade | Local | Evidência (mascarada) |',
      '|---|---|---|---|---|',
      ...scan.achados.map(
        (a) => `| ${a.id} | ${a.regraId} | ${a.severidade} | ${a.local.arquivo}:${a.local.linha} | \`${a.evidenciaMascarada}\` |`,
      ),
      '',
      '## Alertas ao cidadão (IA)',
      '',
      ...scan.alertas.flatMap((a) => [`### ${a.titulo}`, '', a.oQueAcontece, '', `**Quem é afetado:** ${a.quemEAfetado}`, '']),
    ].join('\n');
    this.download(`${scan.id}-auditoria.md`, 'text/markdown', md);
  }

  private download(name: string, type: string, content: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
