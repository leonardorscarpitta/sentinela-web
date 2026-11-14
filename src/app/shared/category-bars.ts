import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface CategoryBar {
  rotulo: string;
  valor: number;
  detalhe: string;
}

@Component({
  selector: 'app-category-bars',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (b of bars(); track b.rotulo) {
        <li [attr.title]="b.rotulo + ': ' + b.detalhe">
          <span class="name">{{ b.rotulo }}</span>
          <span class="track"><span class="fill" [style.width.%]="(b.valor / max()) * 100"></span></span>
          <span class="val">{{ b.valor | number: '1.0-1' }}</span>
          <small>{{ b.detalhe }}</small>
        </li>
      }
    </ul>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
    li { display: grid; grid-template-columns: 110px 1fr 44px; align-items: center; column-gap: 10px; }
    .name { font-weight: 700; }
    .track { height: 14px; background: var(--surface-2); border-radius: 0 4px 4px 0; }
    .fill { display: block; height: 100%; min-width: 2px; background: var(--accent); border-radius: 0 4px 4px 0; transition: width .5s ease; }
    .val { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
    small { grid-column: 2 / 4; color: var(--muted); }
  `,
})
export class CategoryBars {
  readonly bars = input.required<CategoryBar[]>();
  protected readonly max = computed(() => Math.max(1, ...this.bars().map((b) => b.valor)));
}
