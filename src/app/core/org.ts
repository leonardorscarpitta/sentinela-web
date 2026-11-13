import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import { config } from './config';
import { Membership, Permission } from './models';

const ORG_KEY = 'sentinela.org';
const ALL: Permission[] = ['viewFindings', 'triage', 'pipelines', 'integrations', 'team', 'billing'];

function stored(): string | null {
  try {
    return sessionStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

/** Organização ativa: o slug vai no cabeçalho X-Artemis-Organization das chamadas da organização. */
@Injectable({ providedIn: 'root' })
export class OrgContext {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  readonly memberships = signal<Membership[] | null>(null);
  readonly slug = signal<string | null>(stored());
  readonly current = computed(() => this.memberships()?.find((m) => m.slug === this.slug()) ?? null);

  can(permission: Permission): boolean {
    return this.current()?.permissions.includes(permission) ?? false;
  }

  async load(): Promise<Membership[]> {
    let list: Membership[];
    if (this.auth.mode() === 'none') {
      // Sem autenticação a API não lista organizações; ela age como dona da organização do cabeçalho.
      const slug = config().devOrganization;
      list = [{ slug, name: slug, role: 'owner', permissions: ALL, features: [] }];
    } else {
      list = await firstValueFrom(this.http.get<Membership[]>(`${config().apiUrl}/me/organizations`));
    }
    this.memberships.set(list);
    if (!list.some((m) => m.slug === this.slug())) this.select(list.length === 1 ? list[0].slug : null);
    return list;
  }

  select(slug: string | null): void {
    this.slug.set(slug);
    try {
      if (slug) sessionStorage.setItem(ORG_KEY, slug);
      else sessionStorage.removeItem(ORG_KEY);
    } catch {
      /* sem armazenamento: vale para esta página */
    }
  }

  forget(): void {
    const slug = this.slug();
    this.memberships.update((l) => l?.filter((m) => m.slug !== slug) ?? null);
    this.select(null);
  }
}

/** Exige sessão: token válido, login silencioso quando venceu, ou a tela "Entrar". */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  if (auth.isAuthenticated()) return true;
  if (auth.hasExpiredSession()) {
    auth.reauthenticate(state.url);
    return false;
  }
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
};

/** Exige uma organização escolhida. */
export const orgGuard: CanActivateFn = async () => {
  const org = inject(OrgContext);
  const router = inject(Router);
  try {
    if (org.memberships() === null) await org.load();
  } catch {
    return router.createUrlTree(['/organizacoes']);
  }
  return org.current() ? true : router.createUrlTree(['/organizacoes']);
};
