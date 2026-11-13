import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, AbstractControl, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SentinelaApi } from '../core/sentinela-api';
import { RULE_TESTER_SAMPLE } from '../core/mock-data';
import { CATEGORY_LABEL, PiiCategory, PiiRule, SEVERITY_LABEL, Severity, VALIDATOR_LABEL, Validator } from '../core/models';
import { ruleError, runRules } from '../core/pii-engine';
import { SeverityBadge } from '../shared/severity-badge';
import { Icon } from '../shared/icon';

const regexValidator = (c: AbstractControl): ValidationErrors | null => {
  const err = ruleError(c.value ?? '');
  return err ? { regex: err } : null;
};

@Component({
  selector: 'app-rules',
  imports: [ReactiveFormsModule, SeverityBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class RulesPage {
  protected readonly api = inject(SentinelaApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly categories = Object.entries(CATEGORY_LABEL) as [PiiCategory, string][];
  protected readonly severities = Object.entries(SEVERITY_LABEL) as [Severity, string][];
  protected readonly validators = Object.entries(VALIDATOR_LABEL) as [Validator, string][];
  protected readonly categoryLabel = CATEGORY_LABEL;
  protected readonly validatorLabel = VALIDATOR_LABEL;

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    categoria: ['IDENTIFICACAO' as PiiCategory],
    alvo: ['VALOR' as PiiRule['alvo']],
    padrao: ['', [regexValidator, Validators.maxLength(300)]],
    validador: ['NENHUM' as Validator],
    severidade: ['MEDIA' as Severity],
  });

  protected readonly sample = signal(RULE_TESTER_SAMPLE);
  protected readonly matches = computed(() => runRules(this.api.rules(), this.sample()));

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSave = computed(() => this.status() === 'VALID');

  protected onSample(e: Event): void {
    this.sample.set((e.target as HTMLTextAreaElement).value);
  }

  protected save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const id = `custom-${v.nome.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')}`;
    this.api.saveRule({ ...v, id, ativa: true, personalizada: true });
    this.form.reset();
  }
}
