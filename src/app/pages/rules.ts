import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CATEGORY_LABEL, PiiCategory, SEVERITY_LABEL, SINK_LABEL, Severity } from '../core/models';
import { FLOW_RULES, RULE_TESTER_SAMPLE, RuleTarget, RulesCatalog, SANITIZERS, VALIDATOR_LABEL, Validator } from '../core/pii-rules';
import { ruleError, runRules } from '../core/pii-engine';
import { SeverityBadge } from '../shared/severity-badge';
import { Icon } from '../shared/icon';

const regexValidator = (c: AbstractControl): ValidationErrors | null => {
  const err = ruleError(c.value ?? '');
  return err ? { regex: err } : null;
};

const MAX_SAMPLE = 20_000;

@Component({
  selector: 'app-rules',
  imports: [ReactiveFormsModule, SeverityBadge, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class RulesPage {
  protected readonly catalog = inject(RulesCatalog);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly categories = Object.entries(CATEGORY_LABEL) as [PiiCategory, string][];
  protected readonly severities = Object.entries(SEVERITY_LABEL) as [Severity, string][];
  protected readonly validators = Object.entries(VALIDATOR_LABEL) as [Validator, string][];
  protected readonly categoryLabel = CATEGORY_LABEL;
  protected readonly validatorLabel = VALIDATOR_LABEL;
  protected readonly sinkLabel = SINK_LABEL;
  protected readonly flowRules = FLOW_RULES;
  protected readonly sanitizers = SANITIZERS;

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    categoria: ['identification' as PiiCategory],
    alvo: ['valor' as RuleTarget],
    padrao: ['', [regexValidator, Validators.maxLength(300)]],
    validador: ['none' as Validator],
    severidade: ['medium' as Severity],
  });

  protected readonly sample = signal(RULE_TESTER_SAMPLE);
  protected readonly matches = computed(() => runRules(this.catalog.rules(), this.sample()));

  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  protected readonly canSave = computed(() => this.status() === 'VALID');

  protected onSample(e: Event): void {
    this.sample.set((e.target as HTMLTextAreaElement).value.slice(0, MAX_SAMPLE));
  }

  protected save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const slug = v.nome.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
    this.catalog.add({ ...v, id: `custom-${slug}`, ativa: true, personalizada: true });
    this.form.reset();
  }
}
