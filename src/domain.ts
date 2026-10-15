import { z } from 'zod';

export const textSchema = z.string().trim().min(1, 'Este campo es obligatorio.').max(2000);
export const propertySchema = z
  .string()
  .trim()
  .regex(
    /^[a-z][a-z0-9_]{0,49}$/,
    'Usa una clave como puede_cruzar: minúsculas, números y guiones bajos.',
  );
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const base = {
  id: textSchema,
  title: textSchema,
  description: textSchema,
  origin: z.enum(['demo', 'user']),
};
export const characterSchema = z.object({
  ...base,
  kind: z.literal('character'),
  role: textSchema,
});
export const factSchema = z.object({ property: propertySchema, value: textSchema });
export const ruleSchema = z.object({
  ...base,
  kind: z.literal('rule'),
  subjectId: textSchema,
  property: propertySchema,
  operator: z.enum(['eq', 'neq']),
  value: textSchema,
  condition: factSchema.nullable(),
});
export const eventSchema = z.object({
  ...base,
  kind: z.literal('event'),
  subjectId: textSchema,
  date: z.string().refine(validDate, 'Introduce una fecha válida entre los años 0001 y 9999.'),
  facts: z
    .array(factSchema)
    .min(1)
    .max(30)
    .refine(
      (f) => new Set(f.map((x) => x.property)).size === f.length,
      'No repitas propiedades en un acontecimiento.',
    ),
});
export const recordSchema = z.discriminatedUnion('kind', [
  characterSchema,
  ruleSchema,
  eventSchema,
]);
export const statusSchema = z.enum(['pending', 'confirmed', 'resolved', 'dismissed']);
export const databaseSchema = z
  .object({
    version: z.literal(1),
    records: z.array(recordSchema).max(10000),
    resolutions: z.record(statusSchema),
  })
  .superRefine((db, ctx) => {
    const ids = db.records.map((r) => r.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Hay identificadores duplicados.' });
    const characters = new Set(db.records.filter((r) => r.kind === 'character').map((r) => r.id));
    for (const r of db.records)
      if (
        r.kind !== 'character' &&
        !(r.kind === 'rule' && r.subjectId === '*') &&
        !characters.has(r.subjectId)
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Un registro hace referencia a un personaje inexistente.',
        });
  });
export type CanonRecord = z.infer<typeof recordSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type StoryEvent = z.infer<typeof eventSchema>;
export type Database = z.infer<typeof databaseSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Verdict = 'conflict' | 'compatible' | 'unknown' | 'not-applicable';
export const statuses: Record<Status, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
};
export const kinds = { rule: 'Regla', character: 'Personaje', event: 'Acontecimiento' };
export const subjectName = (id: string, records: CanonRecord[]) =>
  id === '*'
    ? 'Todos los personajes'
    : (records.find((r) => r.id === id)?.title ?? 'Personaje desconocido');
export const ruleExpression = (rule: Rule) =>
  `${rule.property} ${rule.operator === 'eq' ? '=' : '≠'} «${rule.value}»`;
export function compare(rule: Rule, event: StoryEvent): { verdict: Verdict; explanation: string } {
  if (rule.subjectId !== '*' && rule.subjectId !== event.subjectId)
    return { verdict: 'not-applicable', explanation: 'La regla corresponde a otro sujeto.' };
  if (rule.condition) {
    const condition = event.facts.find((f) => f.property === rule.condition!.property);
    if (!condition)
      return {
        verdict: 'unknown',
        explanation: `No se puede confirmar el conflicto: falta la propiedad «${rule.condition.property}» para evaluar la condición.`,
      };
    if (condition.value !== rule.condition.value)
      return {
        verdict: 'not-applicable',
        explanation: `No se cumple la condición ${rule.condition.property} = «${rule.condition.value}».`,
      };
  }
  const fact = event.facts.find((f) => f.property === rule.property);
  if (!fact)
    return {
      verdict: 'unknown',
      explanation: `No se puede confirmar el conflicto: el acontecimiento no registra «${rule.property}». La descripción no se utiliza como evidencia.`,
    };
  const compatible = rule.operator === 'eq' ? fact.value === rule.value : fact.value !== rule.value;
  return {
    verdict: compatible ? 'compatible' : 'conflict',
    explanation: compatible
      ? `El valor registrado «${fact.value}» cumple ${ruleExpression(rule)}.`
      : `La regla exige ${ruleExpression(rule)}, pero el acontecimiento registra ${rule.property} = «${fact.value}» para el mismo sujeto${rule.condition ? ` y cumple la condición ${rule.condition.property} = «${rule.condition.value}»` : ''}.`,
  };
}
// La clave incluye la evidencia completa: un cambio no hereda una decisión antigua.
export const evidenceKey = (rule: Rule, event: StoryEvent) =>
  JSON.stringify([
    [
      rule.id,
      rule.title,
      rule.description,
      rule.origin,
      rule.subjectId,
      rule.property,
      rule.operator,
      rule.value,
      rule.condition ? [rule.condition.property, rule.condition.value] : null,
    ],
    [
      event.id,
      event.title,
      event.description,
      event.origin,
      event.subjectId,
      event.date,
      [...event.facts]
        .sort((a, b) => a.property.localeCompare(b.property))
        .map((f) => [f.property, f.value]),
    ],
  ]);
export function analyze(records: CanonRecord[]) {
  const rules = records.filter((r): r is Rule => r.kind === 'rule');
  const events = records.filter((r): r is StoryEvent => r.kind === 'event');
  return events.flatMap((event) =>
    rules.map((rule) => ({ rule, event, key: evidenceKey(rule, event), ...compare(rule, event) })),
  );
}
export const sortedEvents = (records: CanonRecord[]) =>
  records
    .filter((r): r is StoryEvent => r.kind === 'event')
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.title.localeCompare(b.title, 'es') ||
        a.id.localeCompare(b.id),
    );
export function upsert(db: Database, record: CanonRecord): Database {
  const exists = db.records.some((r) => r.id === record.id);
  return databaseSchema.parse({
    ...db,
    records: exists
      ? db.records.map((r) => (r.id === record.id ? record : r))
      : [...db.records, record],
  });
}
export function removeRecord(db: Database, id: string): Database {
  if (db.records.some((r) => r.kind !== 'character' && r.subjectId === id))
    throw new Error(
      'Este personaje está vinculado a reglas o acontecimientos. Edita o elimina esas referencias primero.',
    );
  return { ...db, records: db.records.filter((r) => r.id !== id) };
}
export const formatDate = (date: string) =>
  `${date.slice(8, 10)} / ${date.slice(5, 7)} / ${date.slice(0, 4)}`;
