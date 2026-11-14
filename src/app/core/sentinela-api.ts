import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './http';
import { OrgContext } from './org';
import {
  ChangeStatus,
  CitizenAlert,
  CitizenRisk,
  DashboardSummary,
  FindingDetails,
  FindingFilter,
  FindingSummary,
  RepositoryAccess,
  RepositoryDetails,
  RepositorySummary,
  RunDetails,
  RunView,
} from './models';

const enc = encodeURIComponent;

/**
 * Fonte de dados do app: a sentinela-api. Leituras são `httpResource` (sinais; chame nos campos do
 * componente) e recarregam quando os parâmetros ou a organização mudam. Escritas são Observables.
 * Atenção: `value()` de um recurso com erro lança exceção; leia com `hasValue()` antes.
 */
@Injectable({ providedIn: 'root' })
export class SentinelaApi {
  private readonly http = inject(HttpClient);
  private readonly org = inject(OrgContext);

  private get<T>(url: () => string | undefined) {
    return httpResource<T>(() => (this.org.slug() ? url() : undefined));
  }

  /* ---------- painel ---------- */

  citizenRisk(repository: () => string | null) {
    return this.get<CitizenRisk>(() => apiUrl('/dashboard/citizen-risk', { repository: repository() }));
  }

  summary() {
    return this.get<DashboardSummary>(() => apiUrl('/dashboard/summary'));
  }

  /* ---------- repositórios ---------- */

  repositories() {
    return this.get<RepositorySummary[]>(() => apiUrl('/repositories'));
  }

  repository(name: () => string) {
    return this.get<RepositoryDetails>(() => apiUrl(`/repositories/${enc(name())}`));
  }

  access(name: () => string) {
    return this.get<RepositoryAccess>(() => apiUrl(`/repositories/${enc(name())}/access`));
  }

  connect(url: string, branch: string): Observable<RepositoryDetails> {
    // Pipeline vazio = estágios padrão da organização (inclui o estágio "pii").
    return this.http.post<RepositoryDetails>(apiUrl('/repositories'), {
      url,
      branch,
      stack: null,
      settings: {
        schedule: 'manual',
        automaticActions: [],
        dockerfileMode: 'recommended',
        customDockerfile: null,
        folders: [],
        containerImage: null,
        stack: null,
      },
      pipeline: [],
    });
  }

  checkAccess(name: string): Observable<RepositoryAccess> {
    return this.http.post<RepositoryAccess>(apiUrl(`/repositories/${enc(name)}/access/checks`), null);
  }

  rotateKey(name: string): Observable<RepositoryAccess> {
    return this.http.post<RepositoryAccess>(apiUrl(`/repositories/${enc(name)}/access/key`), null);
  }

  scan(name: string): Observable<RunDetails> {
    return this.http.post<RunDetails>(apiUrl(`/repositories/${enc(name)}/scans`), null);
  }

  /* ---------- varreduras ---------- */

  runs(repository: () => string | null) {
    return this.get<RunView[]>(() => apiUrl('/pipeline-runs', { repository: repository() }));
  }

  run(number: () => number) {
    return this.get<RunDetails>(() => apiUrl(`/pipeline-runs/${number()}`));
  }

  rerun(number: number): Observable<RunDetails> {
    return this.http.post<RunDetails>(apiUrl(`/pipeline-runs/${number}/rerun`), null);
  }

  cancel(number: number): Observable<RunDetails> {
    return this.http.post<RunDetails>(apiUrl(`/pipeline-runs/${number}/cancel`), null);
  }

  /* ---------- achados ---------- */

  findings(filter: () => FindingFilter) {
    return this.get<FindingSummary[]>(() => apiUrl('/findings', { ...filter() }));
  }

  finding(id: () => string) {
    return this.get<FindingDetails>(() => apiUrl(`/findings/${enc(id())}`));
  }

  changeStatus(id: string, body: ChangeStatus): Observable<FindingDetails> {
    return this.http.post<FindingDetails>(apiUrl(`/findings/${enc(id)}/status`), body);
  }

  /** Alerta já gerado (404 quando ainda não existe; nunca chama a IA). */
  citizenAlert(id: () => string | null) {
    return this.get<CitizenAlert>(() => {
      const v = id();
      return v ? apiUrl(`/findings/${enc(v)}/citizen-alert`) : undefined;
    });
  }

  /** Gera (ou devolve do cache) o alerta via Claude. */
  generateCitizenAlert(id: string): Observable<CitizenAlert> {
    return this.http.post<CitizenAlert>(apiUrl(`/findings/${enc(id)}/citizen-alert`), null);
  }
}
