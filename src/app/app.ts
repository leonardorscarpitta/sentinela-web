import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './core/auth';
import { OrgContext } from './core/org';
import { Icon } from './shared/icon';

type Theme = 'light' | 'dark';
const THEME_KEY = 'sentinela.theme';

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(Auth);
  protected readonly org = inject(OrgContext);
  private readonly router = inject(Router);

  protected readonly theme = signal<Theme>(
    storedTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  protected readonly orgs = computed(() => this.org.memberships() ?? []);

  constructor() {
    document.documentElement.dataset['theme'] = this.theme();
  }

  protected toggleTheme(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.dataset['theme'] = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* armazenamento indisponível: o tema vale só para esta sessão */
    }
  }

  protected switchOrg(e: Event): void {
    this.org.select((e.target as HTMLSelectElement).value);
    void this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.org.select(null);
    void this.auth.logout();
  }
}
