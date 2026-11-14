import { Routes } from '@angular/router';
import { authGuard, orgGuard } from './core/org';

const T = (s: string) => `${s} · Sentinela Cidadã`;

export const routes: Routes = [
  { path: 'entrar', title: T('Entrar'), loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  { path: 'auth/callback', title: T('Entrando'), loadComponent: () => import('./pages/callback').then((m) => m.CallbackPage) },
  { path: 'regras', title: T('Regras de PII'), loadComponent: () => import('./pages/rules').then((m) => m.RulesPage) },
  {
    path: 'organizacoes',
    title: T('Organizações'),
    canActivate: [authGuard],
    loadComponent: () => import('./pages/organizations').then((m) => m.OrganizationsPage),
  },
  {
    path: '',
    canActivate: [authGuard, orgGuard],
    children: [
      { path: '', title: T('Painel'), loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
      { path: 'repositorios', title: T('Repositórios'), loadComponent: () => import('./pages/repositories').then((m) => m.RepositoriesPage) },
      { path: 'repositorios/:name', title: T('Repositório'), loadComponent: () => import('./pages/repository-detail').then((m) => m.RepositoryDetailPage) },
      { path: 'varreduras', title: T('Varreduras'), loadComponent: () => import('./pages/runs').then((m) => m.RunsPage) },
      { path: 'varreduras/:number', title: T('Varredura'), loadComponent: () => import('./pages/run-detail').then((m) => m.RunDetailPage) },
      { path: 'achados', title: T('Achados'), loadComponent: () => import('./pages/findings').then((m) => m.FindingsPage) },
      { path: 'achados/:id', title: T('Achado'), loadComponent: () => import('./pages/finding-detail').then((m) => m.FindingDetailPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
