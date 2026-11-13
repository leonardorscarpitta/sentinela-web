import { PiiRule, Validator } from './models';

const digits = (s: string) => s.replace(/\D/g, '');

export function isValidCpf(value: string): boolean {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function isValidCns(value: string): boolean {
  const d = digits(value);
  if (d.length !== 15 || !/^[12789]/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += Number(d[i]) * (15 - i);
  return sum % 11 === 0;
}

export function isValidLuhn(value: string): boolean {
  const d = digits(value);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

const VALIDATORS: Record<Validator, (v: string) => boolean> = {
  NENHUM: () => true,
  CPF_DV: isValidCpf,
  CNS_DV: isValidCns,
  LUHN: isValidLuhn,
};

/** Mantém separadores e os 2 últimos caracteres; o resto vira '*'. */
export function mask(value: string): string {
  const keep = 2;
  let seen = 0;
  const total = value.replace(/[^\p{L}\p{N}]/gu, '').length;
  return value.replace(/[\p{L}\p{N}]/gu, (c) => (++seen > total - keep ? c : '*'));
}

export interface RuleMatch {
  regra: PiiRule;
  linha: number;
  valorMascarado: string;
  validado: boolean;
}

export function compileRule(rule: Pick<PiiRule, 'padrao' | 'alvo'>): RegExp {
  const flags = rule.alvo === 'IDENTIFICADOR' ? 'gi' : 'g';
  return new RegExp(rule.padrao, flags);
}

export function ruleError(padrao: string): string | null {
  if (!padrao.trim()) return 'Informe um padrão.';
  try {
    const re = new RegExp(padrao);
    if (re.test('')) return 'O padrão aceita texto vazio e geraria falsos positivos.';
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const IDENTIFIER_RE = /\b[A-Za-z_$][\w$]*\b/g;

/**
 * Prévia local do motor: VALOR procura dados literais (e confirma com o
 * validador); IDENTIFICADOR procura nomes de campos/variáveis sensíveis.
 */
export function runRules(rules: PiiRule[], text: string): RuleMatch[] {
  const out: RuleMatch[] = [];
  const lines = text.split('\n');
  for (const regra of rules.filter((r) => r.ativa)) {
    const re = compileRule(regra);
    lines.forEach((content, idx) => {
      if (regra.alvo === 'VALOR') {
        for (const m of content.matchAll(re)) {
          const validado = VALIDATORS[regra.validador](m[0]);
          if (regra.validador !== 'NENHUM' && !validado) continue;
          // Em "chave=valor" a chave não é sensível: só o valor é mascarado.
          const kv = /^([^=:]+[=:]\s*)(.+)$/.exec(m[0]);
          const valorMascarado = kv ? kv[1] + mask(kv[2]) : mask(m[0]);
          out.push({ regra, linha: idx + 1, valorMascarado, validado });
        }
      } else {
        for (const id of content.match(IDENTIFIER_RE) ?? []) {
          re.lastIndex = 0;
          if (re.test(id)) out.push({ regra, linha: idx + 1, valorMascarado: id, validado: true });
        }
      }
    });
  }
  return out.sort((a, b) => a.linha - b.linha);
}
