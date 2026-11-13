import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SentinelaApi } from '../core/sentinela-api';
import { OrgContext } from '../core/org';
import { problemStatus } from '../core/http';
import { CATEGORY_LABEL, FindingStatus, KIND_LABEL, SINK_LABEL, STATUS_LABEL } from '../core/models';
import { SeverityBadge } from '../shared/severity-badge';
import { StatusBadge } from '../shared/status-badge';
import { FlowCard } from '../shared/flow-card';
import { AlertCard } from '../shared/alert-card';
import { Problem } from '../shared/problem';
import { Icon } from '../shared/icon';

// Transições permitidas pela API (FindingStatus.allowedTargets).
const NEXT: Record<FindingStatus, FindingStatus[]> = {
  open: ['triaged', 'falsePositive', 'accepted', 'fixed'],
  triaged: ['open', 'falsePositive', 'accepted', 'fixed'],
  falsePositive: ['open'],
  accepted: ['open'],
  fixed: ['open'],
};

const EVENT_LABEL: Record<string, string> = {
  detected: 'Detectado',
  statusChanged: 'Status alterado',
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

@Component({
  selector: 'app-finding-detail',
  imports: [DatePipe, RouterLink, SeverityBadge, StatusBadge, FlowCard, AlertCard, Problem, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finding-detail.html',
  styleUrl: './finding-detail.scss',
})
export class FindingDetailPage {
  private readonly api = inject(SentinelaApi);
  protected readonly org = inject(OrgContext);

  readonly id = input.required<string>();
  protected readonly details = this.api.finding(this.id);
  protected readonly finding = computed(() => (this.details.hasValue() ? this.details.value().finding : null));
  protected readonly privacy = computed(() => this.finding()?.privacy ?? null);

  // Só achados de privacidade têm alerta ao cidadão; 404 = ainda não gerado.
  protected readonly alert = this.api.citizenAlert(() => (this.privacy() ? this.id() : null));
  protected readonly alertMissing = computed(() => problemStatus(this.alert.error()) === 404);
  protected readonly generating = signal(false);
  protected readonly alertError = signal<unknown>(null);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly categoryLabel = CATEGORY_LABEL;
  protected readonly sinkLabel = SINK_LABEL;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly eventLabel = EVENT_LABEL;

  /* ---------- mudança de status ---------- */
  protected readonly targets = computed(() => {
    const f = this.finding();
    return f ? NEXT[f.status] ?? [] : [];
  });
  protected readonly target = linkedSignal<FindingStatus | ''>(() => this.targets()[0] ?? '');
  protected readonly note = signal('');
  protected readonly expiresAt = signal('');
  protected readonly saving = signal(false);
  protected readonly statusError = signal<unknown>(null);
  protected readonly minDate = isoDate(new Date(Date.now() + 86_400_000));
  protected readonly maxDate = isoDate(new Date(Date.now() + 365 * 86_400_000));

  /** Mesmas regras da API: aceitar risco exige justificativa (≥ 10) e validade futura de até 1 ano. */
  protected readonly statusInvalid = computed(() => {
    const t = this.target();
    if (!t) return 'Escolha o novo status.';
    if (this.note().length > 1000) return 'A observação passa de 1000 caracteres.';
    if (t === 'accepted') {
      if (this.note().trim().length < 10) return 'Justifique a aceitação do risco (mínimo 10 caracteres).';
      const d = this.expiresAt();
      if (!d || d < this.minDate || d > this.maxDate) return 'Informe uma validade entre amanhã e 1 ano.';
    }
    return null;
  });

  protected value(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected pickTarget(e: Event): void {
    const v = this.value(e) as FindingStatus;
    this.target.set(this.targets().includes(v) ? v : '');
  }

  protected generate(): void {
    this.generating.set(true);
    this.alertError.set(null);
    this.api.generateCitizenAlert(this.id()).subscribe({
      next: (a) => {
        this.generating.set(false);
        this.alert.set(a);
      },
      error: (e: unknown) => {
        this.generating.set(false);
        this.alertError.set(e);
      },
    });
  }

  protected saveStatus(): void {
    const status = this.target();
    if (!status || this.statusInvalid()) return;
    this.saving.set(true);
    this.statusError.set(null);
    const note = this.note().trim() || undefined;
    this.api
      .changeStatus(this.id(), { status, note, expiresAt: status === 'accepted' ? this.expiresAt() : undefined })
      .subscribe({
        next: (d) => {
          this.saving.set(false);
          this.note.set('');
          this.details.set(d);
        },
        error: (e: unknown) => {
          this.saving.set(false);
          this.statusError.set(e);
        },
      });
  }
}
