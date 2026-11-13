/**
 * Configuração de execução, lida de /config.json na inicialização (troca de ambiente sem rebuild).
 *
 * auth.mode:
 *  - "oidc": Keycloak (Authorization Code + PKCE);
 *  - "none": API em modo de desenvolvimento (AUTH_ENABLED=false), sem token;
 *  - "auto": pergunta à API (GET /me sem token responde 200 só quando a autenticação está desligada).
 */
export interface AppConfig {
  apiUrl: string;
  auth: {
    mode: 'auto' | 'oidc' | 'none';
    authority: string;
    clientId: string;
    scope: string;
  };
  /** Organização usada quando a autenticação está desligada (a API não lista organizações sem conta). */
  devOrganization: string;
}

const DEFAULTS: AppConfig = {
  apiUrl: '/api/v1',
  auth: {
    mode: 'auto',
    authority: 'https://auth.artemisappsec.localhost:9443/realms/artemisappsec',
    clientId: 'artemisappsec-web',
    scope: 'openid profile email',
  },
  devOrganization: 'acme',
};

let current: AppConfig = DEFAULTS;

export function config(): AppConfig {
  return current;
}

export async function loadConfig(): Promise<void> {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const raw = (await res.json()) as Partial<AppConfig>;
    current = { ...DEFAULTS, ...raw, auth: { ...DEFAULTS.auth, ...raw.auth } };
  } catch {
    /* sem config.json: valores padrão */
  }
}
