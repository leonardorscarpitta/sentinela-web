import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Painel · Sentinela Cidadã', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
  { path: 'varreduras', title: 'Varreduras · Sentinela Cidadã', loadComponent: () => import('./pages/scans').then((m) => m.ScansPage) },
  { path: 'varreduras/nova', title: 'Nova varredura · Sentinela Cidadã', loadComponent: () => import('./pages/new-scan').then((m) => m.NewScanPage) },
  { path: 'varreduras/:id', title: 'Relatório · Sentinela Cidadã', loadComponent: () => import('./pages/scan-detail').then((m) => m.ScanDetailPage) },
  { path: 'regras', title: 'Regras de PII · Sentinela Cidadã', loadComponent: () => import('./pages/rules').then((m) => m.RulesPage) },
  { path: '**', redirectTo: '' },
];
