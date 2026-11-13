import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS = {
  shield: 'M12 3l7 3v6c0 4.4-3 8.3-7 9-4-.7-7-4.6-7-9V6l7-3z',
  alert: 'M12 4l9 16H3L12 4zm0 6v4m0 3v.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  upload: 'M12 16V4m0 0l-5 5m5-5l5 5M4 20h16',
  code: 'M9 7l-5 5 5 5m6-10l5 5-5 5',
  arrow: 'M5 12h14m-5-5l5 5-5 5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  rules: 'M4 6h10M4 12h16M4 18h7m9-12l-3 3-1.5-1.5',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zm0-4v2m0 14v2M3 12h2m14 0h2M5.6 5.6L7 7m10 10l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  download: 'M12 4v12m0 0l-5-5m5 5l5-5M4 20h16',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  flow: 'M6 6h.01M18 18h.01M6 6c0 6 12 6 12 12',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none' },
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="d()" /></svg>`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  protected readonly d = computed(() => PATHS[this.name()]);
}
