import { Injectable, computed, signal } from '@angular/core';
import { Observable, concat, delay, map, of, timer } from 'rxjs';
import { DEFAULT_RULES, LATEST_VERSION, MOCK_SCANS, buildScan } from './mock-data';
import { PiiRule, Scan } from './models';

export type ScanSource = { tipo: 'APP_EXEMPLO' } | { tipo: 'UPLOAD_ZIP'; arquivo: File };

export interface ScanProgress {
  etapa: number;
  descricao: string;
  scanId?: string;
}

export const SCAN_STEPS = [
  'Lendo o pacote de código',
  'Mapeamento de PII (motor de parsing)',
  'Taint analysis: origens → destinos',
  'Tradução dos riscos via IA',
  'Calculando o Risco Cidadão',
];

/**
 * Fonte de dados do painel. Nesta versão de demonstração tudo é simulado em
 * memória; a troca para a sentinela-api mantém esta mesma interface.
 */
@Injectable({ providedIn: 'root' })
export class SentinelaApi {
  private readonly _scans = signal<Scan[]>(MOCK_SCANS);
  private readonly _rules = signal<PiiRule[]>(structuredClone(DEFAULT_RULES));

  readonly scans = this._scans.asReadonly();
  readonly rules = this._rules.asReadonly();
  readonly latest = computed(() => this._scans()[0]);

  scan(id: string): Scan | undefined {
    return this._scans().find((s) => s.id === id);
  }

  startScan(source: ScanSource): Observable<ScanProgress> {
    const steps = SCAN_STEPS.map((descricao, etapa) => timer(etapa === 0 ? 150 : 900).pipe(map(() => ({ etapa, descricao }))));
    const finish = of(null).pipe(
      delay(700),
      map(() => {
        const id = `SCN-${String(this._scans().length + 1).padStart(4, '0')}`;
        const scan = buildScan(LATEST_VERSION, id, new Date().toISOString(), source.tipo);
        if (source.tipo === 'UPLOAD_ZIP') scan.projeto = source.arquivo.name.replace(/\.zip$/i, '');
        this._scans.update((list) => [scan, ...list]);
        return { etapa: SCAN_STEPS.length, descricao: 'Concluída', scanId: id };
      }),
    );
    return concat(...steps, finish);
  }

  saveRule(rule: PiiRule): void {
    this._rules.update((list) => {
      const i = list.findIndex((r) => r.id === rule.id);
      return i === -1 ? [...list, rule] : list.map((r) => (r.id === rule.id ? rule : r));
    });
  }

  toggleRule(id: string): void {
    this._rules.update((list) => list.map((r) => (r.id === id ? { ...r, ativa: !r.ativa } : r)));
  }

  removeRule(id: string): void {
    this._rules.update((list) => list.filter((r) => r.id !== id || !r.personalizada));
  }
}
