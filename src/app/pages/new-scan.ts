import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SCAN_STEPS, ScanSource, SentinelaApi } from '../core/sentinela-api';
import { Icon } from '../shared/icon';

const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

@Component({
  selector: 'app-new-scan',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Nova varredura</h1>
          <p>Analise o código de uma CitizenTech antes de publicá-la.</p>
        </div>
      </div>

      @if (step() === null) {
        <div class="grid grid-2">
          <div class="card option">
            <app-icon name="code" [size]="28" />
            <h2>App de exemplo: Bairro Vivo</h2>
            <p class="text-2">
              CitizenTech fictícia de zeladoria e triagem de saúde comunitária, com vazamentos de propósito para
              demonstrar o motor. Usa apenas dados simulados.
            </p>
            <button class="btn btn-primary" (click)="run({ tipo: 'APP_EXEMPLO' })">
              <app-icon name="shield" /> Varrer app de exemplo
            </button>
          </div>

          <div class="card option">
            <app-icon name="upload" [size]="28" />
            <h2>Enviar código (.zip)</h2>
            <p class="text-2">
              Projeto Java com arquivos <code>.java</code>, <code>.properties</code>, <code>.yml</code> e
              <code>.sql</code>. Limite de 10 MB. O pacote é lido em memória e nunca é executado.
            </p>
            <label class="drop" [class.over]="dragOver()" (dragover)="$event.preventDefault(); dragOver.set(true)"
              (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
              <input type="file" accept=".zip,application/zip" class="sr-only" (change)="onPick($event)" />
              <span>{{ file()?.name ?? 'Arraste o .zip aqui ou clique para escolher' }}</span>
            </label>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button class="btn btn-primary" [disabled]="!file()" (click)="run({ tipo: 'UPLOAD_ZIP', arquivo: file()! })">
              <app-icon name="shield" /> Varrer pacote
            </button>
          </div>
        </div>
      } @else {
        <div class="card progress" aria-live="polite">
          <h2>Analisando…</h2>
          <ol>
            @for (s of steps; track $index) {
              <li [class.done]="$index < step()!" [class.current]="$index === step()">
                <span class="mark">
                  @if ($index < step()!) {
                    <app-icon name="check" [size]="16" />
                  } @else {
                    {{ $index + 1 }}
                  }
                </span>
                {{ s }}
              </li>
            }
          </ol>
        </div>
      }
    </section>
  `,
  styles: `
    .option { display: grid; gap: 12px; align-content: start; color: var(--accent-ink); }
    .option h2, .option p { color: var(--text); margin: 0; }
    .option p { color: var(--text-2); }
    .option .btn { justify-self: start; }
    .drop { display: grid; place-items: center; min-height: 110px; padding: 16px; text-align: center; cursor: pointer;
      border: 2px dashed var(--border); border-radius: var(--radius); color: var(--text-2); }
    .drop.over, .drop:hover { border-color: var(--accent); background: var(--accent-soft); }
    .drop:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; }
    .progress ol { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 12px; }
    .progress li { display: flex; gap: 12px; align-items: center; color: var(--muted); }
    .progress li.done { color: var(--text); }
    .progress li.current { color: var(--text); font-weight: 700; }
    .mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid var(--border); font-size: .85rem; }
    li.done .mark { background: var(--good); border-color: var(--good); color: #fff; }
    li.current .mark { border-color: var(--accent); animation: pulse 1s ease-in-out infinite alternate; }
    @keyframes pulse { to { background: var(--accent-soft); } }
    @media (prefers-reduced-motion: reduce) { li.current .mark { animation: none; } }
  `,
})
export class NewScanPage {
  private readonly api = inject(SentinelaApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = SCAN_STEPS;
  protected readonly step = signal<number | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly dragOver = signal(false);

  protected onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.accept(input.files?.[0]);
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    this.accept(e.dataTransfer?.files[0]);
  }

  private async accept(f: File | undefined): Promise<void> {
    this.file.set(null);
    this.error.set(null);
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) return this.error.set('Envie um arquivo .zip.');
    if (f.size > MAX_ZIP_BYTES) return this.error.set('O pacote passa de 10 MB.');
    const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
    if (!ZIP_MAGIC.every((b, i) => head[i] === b)) return this.error.set('O arquivo não é um .zip válido.');
    this.file.set(f);
  }

  protected run(source: ScanSource): void {
    this.step.set(0);
    this.api
      .startScan(source)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.step.set(p.etapa);
        if (p.scanId) this.router.navigate(['/varreduras', p.scanId]);
      });
  }
}
