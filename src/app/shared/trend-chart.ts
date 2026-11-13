import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface TrendPoint {
  rotulo: string;
  data: string;
  valor: number;
}

const W = 600;
const H = 220;
const PAD = { l: 36, r: 16, t: 16, b: 32 };

@Component({
  selector: 'app-trend-chart',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img" aria-label="Evolução do Risco Cidadão por versão"
        (mouseleave)="active.set(null)">
        @for (g of grid; track g) {
          <line [attr.x1]="pad.l" [attr.x2]="w - pad.r" [attr.y1]="y(g)" [attr.y2]="y(g)" class="grid" />
          <text [attr.x]="pad.l - 8" [attr.y]="y(g) + 4" text-anchor="end" class="axis">{{ g }}</text>
        }
        <path [attr.d]="path()" class="line" />
        @if (active(); as a) {
          <line [attr.x1]="a.x" [attr.x2]="a.x" [attr.y1]="pad.t" [attr.y2]="h - pad.b" class="cross" />
        }
        @for (p of pts(); track p.rotulo; let i = $index; let last = $last) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="active()?.i === i || last ? 6 : 4.5" class="pt" />
          <text [attr.x]="p.x" [attr.y]="h - 10" text-anchor="middle" class="axis">v{{ p.rotulo }}</text>
          @if (last) {
            <text [attr.x]="p.x - 10" [attr.y]="p.y - 12" text-anchor="end" class="label">{{ p.valor }}</text>
          }
          <rect [attr.x]="p.x - step() / 2" [attr.y]="0" [attr.width]="step()" [attr.height]="h" class="hit"
            (mouseenter)="active.set(p)" />
        }
      </svg>
      @if (active(); as a) {
        <div class="tip" [style.left.%]="(a.x / w) * 100" [style.top.%]="(a.y / h) * 100">
          <strong>v{{ a.rotulo }}</strong> · {{ a.data | date: 'dd/MM HH:mm' }}<br />
          Risco Cidadão: <strong>{{ a.valor }}</strong>
        </div>
      }
    </div>
    <table class="sr-only">
      <caption>Risco Cidadão por versão</caption>
      <tr><th>Versão</th><th>Data</th><th>Risco</th></tr>
      @for (p of points(); track p.rotulo) {
        <tr><td>{{ p.rotulo }}</td><td>{{ p.data | date: 'dd/MM/yyyy' }}</td><td>{{ p.valor }}</td></tr>
      }
    </table>
  `,
  styles: `
    :host { display: block; }
    .wrap { position: relative; }
    svg { width: 100%; height: auto; display: block; }
    .grid { stroke: var(--grid); stroke-width: 1; }
    .axis { fill: var(--muted); font-size: 12px; }
    .label { fill: var(--text); font-size: 13px; font-weight: 700; }
    .line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; }
    .pt { fill: var(--accent); stroke: var(--surface); stroke-width: 2; }
    .cross { stroke: var(--muted); stroke-dasharray: 3 3; }
    .hit { fill: transparent; }
    .tip { position: absolute; transform: translate(-50%, calc(-100% - 14px)); pointer-events: none;
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      padding: 6px 10px; font-size: .85rem; white-space: nowrap; box-shadow: 0 4px 12px rgb(0 0 0 / .12); }
  `,
})
export class TrendChart {
  readonly points = input.required<TrendPoint[]>();
  // O viewBox acompanha a largura real para o texto manter 12px no celular.
  private readonly width = signal(W);
  protected get w(): number {
    return this.width();
  }
  protected readonly h = H;

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const ro = new ResizeObserver(([e]) => this.width.set(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(host);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
  }
  protected readonly pad = PAD;
  protected readonly grid = [0, 25, 50, 75, 100];
  protected readonly active = signal<(TrendPoint & { x: number; y: number; i: number }) | null>(null);

  protected y(v: number): number {
    return PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);
  }

  protected readonly step = computed(() => (this.width() - PAD.l - PAD.r) / Math.max(1, this.points().length - 1));

  protected readonly pts = computed(() => {
    const n = this.points().length;
    const inner = this.width() - PAD.l - PAD.r - 24;
    return this.points().map((p, i) => ({
      ...p,
      i,
      x: PAD.l + 12 + (n === 1 ? inner / 2 : (i / (n - 1)) * inner),
      y: this.y(p.valor),
    }));
  });

  protected readonly path = computed(() =>
    this.pts()
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
  );
}
