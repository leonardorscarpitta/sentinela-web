import { PiiCategory, PiiFinding, Severity, SinkKind, TaintFlow } from './models';

// Pesos do índice "Risco Cidadão". A mesma tabela é exibida no painel para
// que o cálculo seja auditável por quem lê o relatório.
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICA: 10,
  ALTA: 6,
  MEDIA: 3,
  BAIXA: 1,
};

export const CATEGORY_WEIGHT: Record<PiiCategory, number> = {
  SAUDE: 1.5,
  CREDENCIAL: 1.4,
  FINANCEIRO: 1.3,
  IDENTIFICACAO: 1.2,
  CONTATO: 0.8,
};

export const EXPOSURE_WEIGHT: Record<SinkKind, number> = {
  API_EXTERNA: 1.6,
  RESPOSTA_HTTP: 1.4,
  LOG: 1.2,
  EXCECAO: 1.1,
  ARQUIVO: 1.0,
};

export const LATENT_FACTOR = 0.3;
export const SATURATION = 60;

export function flowWeight(f: TaintFlow): number {
  if (f.status === 'SANITIZADO') return 0;
  return SEVERITY_WEIGHT[f.severidade] * CATEGORY_WEIGHT[f.categoria] * EXPOSURE_WEIGHT[f.destino.tipo];
}

export function findingWeight(a: PiiFinding): number {
  return SEVERITY_WEIGHT[a.severidade] * CATEGORY_WEIGHT[a.categoria] * LATENT_FACTOR;
}

/** 0–100. Cresce rápido nos primeiros vazamentos e satura perto de 100. */
export function citizenRisk(achados: PiiFinding[], fluxos: TaintFlow[]): number {
  const raw =
    fluxos.reduce((s, f) => s + flowWeight(f), 0) + achados.reduce((s, a) => s + findingWeight(a), 0);
  return Math.round(100 * (1 - Math.exp(-raw / SATURATION)));
}

export type RiskLevel = 'CRITICO' | 'ALTO' | 'MODERADO' | 'BAIXO';

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICO';
  if (score >= 50) return 'ALTO';
  if (score >= 25) return 'MODERADO';
  return 'BAIXO';
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  CRITICO: 'Crítico',
  ALTO: 'Alto',
  MODERADO: 'Moderado',
  BAIXO: 'Baixo',
};

export const RISK_LEVEL_MEANING: Record<RiskLevel, string> = {
  CRITICO: 'Dados de cidadãos estão saindo do sistema agora. Não publique esta versão.',
  ALTO: 'Há caminhos reais para vazamento. Corrija antes da próxima publicação.',
  MODERADO: 'Dados sensíveis estão expostos internamente. Planeje as correções.',
  BAIXO: 'Nenhum vazamento ativo encontrado. Mantenha a varredura no pipeline.',
};
