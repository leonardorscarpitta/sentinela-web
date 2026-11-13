import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { config } from './config';

/**
 * Sessão OpenID Connect com o Keycloak da sentinela-api: Authorization Code + PKCE (S256), cliente público.
 *
 * - Só o access token (15 min) e o id token ficam guardados, em sessionStorage (some ao fechar a aba);
 *   nada vai para localStorage. O realm não emite refresh token.
 * - Quando o token vence, o app volta ao Keycloak com prompt=none: se a sessão SSO ainda vale, o retorno é
 *   imediato e sem interação; senão, a tela "Entrar" aparece.
 * - Modo "none": a API roda com AUTH_ENABLED=false e nenhum token é enviado.
 */

interface Session {
  accessToken: string;
  idToken: string | null;
  expiresAt: number;
  name: string;
  username: string;
}

interface Pending {
  state: string;
  verifier: string;
  nonce: string;
  returnUrl: string;
  silent: boolean;
}

interface Endpoints {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  issuer: string;
}

const SESSION_KEY = 'sentinela.session';
const PENDING_KEY = 'sentinela.oidc';
const SILENT_KEY = 'sentinela.silentAt';
const SKEW_MS = 15_000;

export class LoginRequiredError extends Error {
  constructor(readonly returnUrl: string) {
    super('login_required');
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: a sessão vale só enquanto a página estiver aberta */
  }
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function random(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function claimsOf(jwt: string): Record<string, unknown> {
  const part = jwt.split('.')[1] ?? '';
  const bin = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  return JSON.parse(json) as Record<string, unknown>;
}

/** Só caminhos internos do app: evita redirecionamento aberto via returnUrl. */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/auth/') ? url : '/';
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly router = inject(Router);
  private endpoints: Endpoints | null = null;
  private readonly session = signal<Session | null>(read<Session>(SESSION_KEY));

  readonly mode = signal<'oidc' | 'none'>('oidc');

  readonly user = computed(() => {
    if (this.mode() === 'none') return { name: 'Desenvolvedor local', username: 'local-developer' };
    const s = this.session();
    return s ? { name: s.name, username: s.username } : null;
  });

  /** Define o modo; em "auto", a API responde GET /me sem token apenas quando a autenticação está desligada. */
  async init(): Promise<void> {
    const mode = config().auth.mode;
    if (mode !== 'auto') {
      this.mode.set(mode);
      return;
    }
    try {
      const res = await fetch(`${config().apiUrl}/me`, { headers: { Accept: 'application/json' } });
      this.mode.set(res.ok ? 'none' : 'oidc');
    } catch {
      this.mode.set('oidc');
    }
  }

  isAuthenticated(): boolean {
    return this.mode() === 'none' || this.accessToken() !== null;
  }

  hasExpiredSession(): boolean {
    return this.session() !== null && this.accessToken() === null;
  }

  accessToken(): string | null {
    const s = this.session();
    return s && s.expiresAt - SKEW_MS > Date.now() ? s.accessToken : null;
  }

  async login(returnUrl = '/', silent = false): Promise<void> {
    const ep = await this.discover();
    const pending: Pending = { state: random(16), verifier: random(32), nonce: random(16), returnUrl: safeReturnUrl(returnUrl), silent };
    write(PENDING_KEY, pending);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config().auth.clientId,
      redirect_uri: this.redirectUri(),
      scope: config().auth.scope,
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: await challenge(pending.verifier),
      code_challenge_method: 'S256',
      ui_locales: 'pt-BR',
    });
    if (silent) params.set('prompt', 'none');
    location.assign(`${ep.authorization_endpoint}?${params}`);
  }

  /** Conclui o retorno do Keycloak (/auth/callback) e devolve para onde o usuário ia. */
  async completeLogin(query: URLSearchParams): Promise<string> {
    const pending = read<Pending>(PENDING_KEY);
    write(PENDING_KEY, null);
    if (!pending || query.get('state') !== pending.state) throw new Error('Resposta de login inesperada (state inválido).');
    const error = query.get('error');
    if (error === 'login_required' || error === 'interaction_required') throw new LoginRequiredError(pending.returnUrl);
    if (error) throw new Error(`O Keycloak recusou o login (${error}).`);
    const code = query.get('code');
    if (!code) throw new Error('O Keycloak não devolveu o código de autorização.');

    const ep = await this.discover();
    const res = await fetch(ep.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri(),
        client_id: config().auth.clientId,
        code_verifier: pending.verifier,
      }),
    });
    if (!res.ok) throw new Error('Não foi possível trocar o código pelo token.');
    const token = (await res.json()) as { access_token: string; expires_in: number; id_token?: string };

    // O id token veio direto do endpoint de token (TLS); conferimos emissor, audiência e nonce.
    let name = '';
    let username = '';
    if (token.id_token) {
      const c = claimsOf(token.id_token);
      const aud = Array.isArray(c['aud']) ? c['aud'] : [c['aud']];
      if (c['iss'] !== ep.issuer || !aud.includes(config().auth.clientId) || c['nonce'] !== pending.nonce) {
        throw new Error('Token de identidade inválido.');
      }
      username = String(c['preferred_username'] ?? c['sub'] ?? '');
      name = String(c['name'] ?? username);
    }
    const session: Session = {
      accessToken: token.access_token,
      idToken: token.id_token ?? null,
      expiresAt: Date.now() + token.expires_in * 1000,
      name,
      username,
    };
    write(SESSION_KEY, session);
    write(SILENT_KEY, null);
    this.session.set(session);
    return pending.returnUrl;
  }

  /** Token vencido ou recusado: tenta o login silencioso uma vez por minuto; depois, a tela de entrada. */
  reauthenticate(returnUrl: string): void {
    if (this.mode() !== 'oidc') return;
    this.clear();
    const last = read<number>(SILENT_KEY) ?? 0;
    if (Date.now() - last > 60_000) {
      write(SILENT_KEY, Date.now());
      void this.login(returnUrl, true).catch(() => this.toLoginPage(returnUrl));
    } else {
      this.toLoginPage(returnUrl);
    }
  }

  async logout(): Promise<void> {
    const idToken = this.session()?.idToken;
    // Os tokens locais saem antes do redirecionamento: nada utilizável fica para trás.
    this.clear();
    write(SILENT_KEY, null);
    if (this.mode() !== 'oidc') return;
    try {
      const ep = await this.discover();
      if (ep.end_session_endpoint) {
        const params = new URLSearchParams({ post_logout_redirect_uri: `${location.origin}/`, client_id: config().auth.clientId });
        if (idToken) params.set('id_token_hint', idToken);
        location.assign(`${ep.end_session_endpoint}?${params}`);
        return;
      }
    } catch {
      /* Keycloak fora do ar: a sessão local já foi apagada */
    }
    void this.router.navigateByUrl('/entrar');
  }

  private toLoginPage(returnUrl: string): void {
    void this.router.navigate(['/entrar'], { queryParams: { returnUrl: safeReturnUrl(returnUrl) } });
  }

  private clear(): void {
    write(SESSION_KEY, null);
    this.session.set(null);
  }

  private redirectUri(): string {
    return `${location.origin}/auth/callback`;
  }

  private async discover(): Promise<Endpoints> {
    if (!this.endpoints) {
      const res = await fetch(`${config().auth.authority}/.well-known/openid-configuration`);
      if (!res.ok) throw new Error('Keycloak indisponível.');
      this.endpoints = (await res.json()) as Endpoints;
    }
    return this.endpoints;
  }
}
