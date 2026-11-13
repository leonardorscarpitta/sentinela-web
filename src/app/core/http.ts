import { HttpErrorResponse, HttpInterceptorFn, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { config } from './config';
import { Auth } from './auth';
import { OrgContext } from './org';

export const ORG_HEADER = 'X-Artemis-Organization';

/** Rotas da API que não pertencem a uma organização (não levam o cabeçalho). */
const UNSCOPED = /^\/(me|organizations|admin|limits|pipeline\/stages)(\/|$|\?)/;

type Params = Record<string, string | number | boolean | null | undefined>;

export function apiUrl(path: string, params?: Params): string {
  const base = `${config().apiUrl}${path}`;
  if (!params) return base;
  let p = new HttpParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Caminho relativo à API ("/findings?x=1") ou null quando a URL não é da API.
 * Compara origem e prefixo inteiros: hosts parecidos nunca recebem o token.
 */
export function apiPath(url: string): string | null {
  const base = new URL(config().apiUrl, location.origin);
  const target = new URL(url, location.origin);
  const prefix = base.pathname.replace(/\/$/, '');
  if (target.origin !== base.origin) return null;
  if (target.pathname !== prefix && !target.pathname.startsWith(`${prefix}/`)) return null;
  return target.pathname.slice(prefix.length) + target.search;
}

/** Envia token e organização para a API e reage a sessão vencida ou organização perdida. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPath(req.url);
  if (path === null) return next(req);
  const auth = inject(Auth);
  const org = inject(OrgContext);
  const router = inject(Router);

  const headers: Record<string, string> = { 'Accept-Language': 'pt-BR' };
  if (auth.mode() === 'oidc') {
    const token = auth.accessToken();
    if (!token) {
      auth.reauthenticate(router.url);
      return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  const slug = org.slug();
  if (slug && !UNSCOPED.test(path)) headers[ORG_HEADER] = slug;

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && auth.mode() === 'oidc') {
          auth.reauthenticate(router.url);
        } else if (problemCode(error) === 'organization-not-found') {
          org.forget();
          void router.navigate(['/organizacoes']);
        }
      }
      return throwError(() => error);
    }),
  );
};

/** Corpo RFC 7807 devolvido pela API. */
export interface ProblemDetail {
  title?: string;
  detail?: string;
  status?: number;
  code?: string;
  permission?: string;
  feature?: string;
  errors?: Record<string, string>;
}

function body(error: unknown): ProblemDetail | null {
  const b = (error as { error?: unknown } | null)?.error;
  return b && typeof b === 'object' ? (b as ProblemDetail) : null;
}

export function problemCode(error: unknown): string | null {
  return body(error)?.code ?? null;
}

export function problemStatus(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}

const BY_CODE: Record<string, string> = {
  'feature-not-enabled': 'Este recurso não está habilitado para a organização. Peça aos administradores da plataforma para ativar a IA (aiTriage).',
  'ai-unavailable': 'A tradução por IA está desligada neste servidor (ANTHROPIC_API_KEY não configurada).',
  'ai-busy': 'A IA está ocupada no momento. Tente de novo em alguns segundos.',
  'ai-limit': 'O limite diário de traduções por IA da organização foi atingido. Ele renova à meia-noite (UTC).',
  'ai-failed': 'A IA não conseguiu gerar o alerta desta vez (nada foi salvo). Tente novamente.',
  'not-privacy-finding': 'Alertas ao cidadão só existem para achados de privacidade.',
  'organization-not-found': 'Organização não encontrada ou você não é mais membro dela.',
  'organization-required': 'Escolha uma organização para continuar.',
  forbidden: 'Seu papel na organização não permite esta ação.',
  'access-check-limit': 'Limite de 30 testes de acesso por hora atingido. Aguarde e tente de novo.',
  'deploy-keys-disabled': 'Chaves de deploy estão desativadas no servidor (DEPLOY_KEY_ENCRYPTION_KEY ausente).',
  unauthenticated: 'Sua sessão terminou. Entre novamente.',
};

/** Mensagem em pt-BR para qualquer erro HTTP da API. */
export function problemMessage(error: unknown): string {
  const status = problemStatus(error);
  const p = body(error);
  if (p?.code && BY_CODE[p.code]) return BY_CODE[p.code];
  if (status === 0) return 'Não foi possível falar com a sentinela-api. Verifique se ela está no ar.';
  if (status >= 200 && status < 300) return 'A resposta não veio da sentinela-api (confira o API_PROXY_TARGET do proxy).';
  if (status === 400 && p?.errors) {
    return `Dados inválidos: ${Object.entries(p.errors)
      .map(([k, v]) => `${k} ${v}`)
      .join('; ')}`;
  }
  if (status === 401) return BY_CODE['unauthenticated'];
  const raw = (error as { error?: unknown } | null)?.error;
  if (status === 403 && typeof raw === 'string' && raw.includes('CORS')) {
    return 'A API recusou a origem deste endereço (CORS). Abra o app em http://localhost:4200 ou inclua o endereço em CORS_ALLOWED_ORIGINS.';
  }
  if (status === 403) return BY_CODE['forbidden'];
  if (status === 404) return 'Não encontrado.';
  if (status === 409) return `Operação recusada pela API${p?.detail ? `: ${p.detail}` : '.'}`;
  if (status === 429) return 'Muitas solicitações. Aguarde um pouco e tente de novo.';
  if (status >= 500) return 'A sentinela-api encontrou um erro. Tente novamente em instantes.';
  return p?.detail ?? p?.title ?? `Erro ${status}.`;
}
