import { CATEGORY_LABEL, PiiCategory, RiskLevel, RiskWeights, SEVERITY_LABEL, SINK_LABEL, Severity, SinkKind } from './models';

// O índice Risco Cidadão é calculado pela sentinela-api (GET /dashboard/citizen-risk). Aqui ficam só os
// textos e a apresentação dos pesos que a API devolve, para que o cálculo seja auditável no painel.

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  critical: 'Crítico',
  high: 'Alto',
  moderate: 'Moderado',
  low: 'Baixo',
};

export const RISK_LEVEL_MEANING: Record<RiskLevel, string> = {
  critical: 'Dados de cidadãos estão saindo do sistema agora. Não publique esta versão.',
  high: 'Há caminhos reais para vazamento. Corrija antes da próxima publicação.',
  moderate: 'Dados sensíveis estão expostos internamente. Planeje as correções.',
  low: 'Nenhum vazamento ativo encontrado. Mantenha a varredura no pipeline.',
};

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  critical: 'var(--critical)',
  high: 'var(--serious)',
  moderate: 'var(--warning)',
  low: 'var(--good)',
};

export interface WeightRow {
  label: string;
  value: number;
}

const rows = <K extends string>(weights: Record<K, number>, labels: Record<K, string>): WeightRow[] =>
  (Object.entries(weights) as [K, number][])
    .map(([k, value]) => ({ label: labels[k] ?? k, value }))
    .sort((a, b) => b.value - a.value);

/** Tabelas de pesos, na ordem do maior para o menor, com rótulos em pt-BR. */
export function weightTables(w: RiskWeights) {
  return {
    severity: rows<Severity>(w.severity, SEVERITY_LABEL),
    category: rows<PiiCategory>(w.category, CATEGORY_LABEL),
    sink: rows<SinkKind>(w.sink, SINK_LABEL),
    latentFactor: w.latentFactor,
    saturation: w.saturation,
  };
}
