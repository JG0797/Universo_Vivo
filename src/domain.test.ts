import { describe, expect, it } from 'vitest';
import {
  analyze,
  compare,
  databaseSchema,
  evidenceKey,
  eventSchema,
  removeRecord,
  sortedEvents,
  upsert,
  validDate,
  type Rule,
  type StoryEvent,
} from './domain';
import { createDemo } from './demo';
import { loadDatabase, saveDatabase, STORAGE_KEY } from './storage';

const db = createDemo();
const rule = db.records.find((r) => r.id === 'demo-rule-light') as Rule;
const red = db.records.find((r) => r.id === 'demo-event-red') as StoryEvent;
const blue = db.records.find((r) => r.id === 'demo-event-blue') as StoryEvent;
describe('Motor de canon', () => {
  it('detecta exactamente la contradicción documentada del ejemplo', () => {
    const conflicts = analyze(db.records).filter((r) => r.verdict === 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].rule.id).toBe(rule.id);
    expect(conflicts[0].event.id).toBe(red.id);
    expect(conflicts[0].explanation).toContain('azul');
    expect(conflicts[0].explanation).toContain('roja');
  });
  it('acepta un valor compatible sin alerta', () =>
    expect(compare(rule, blue).verdict).toBe('compatible'));
  it('no interpreta palabras de la descripción como evidencia', () =>
    expect(
      compare(rule, {
        ...red,
        description: 'llama roja azul contradictoria',
        facts: [{ property: 'lugar', value: 'faro' }],
      }).verdict,
    ).toBe('unknown'));
  it('distingue sujetos', () =>
    expect(compare(rule, { ...red, subjectId: 'demo-char-ira' }).verdict).toBe('not-applicable'));
  it('evalúa condición ausente, falsa y verdadera', () => {
    const conditional = { ...rule, condition: { property: 'noche', value: 'sí' } };
    expect(compare(conditional, red).verdict).toBe('unknown');
    expect(
      compare(conditional, { ...red, facts: [...red.facts, { property: 'noche', value: 'no' }] })
        .verdict,
    ).toBe('not-applicable');
    expect(
      compare(conditional, { ...red, facts: [...red.facts, { property: 'noche', value: 'sí' }] })
        .verdict,
    ).toBe('conflict');
  });
  it('admite reglas universales y desigualdad', () => {
    expect(compare({ ...rule, subjectId: '*' }, red).verdict).toBe('conflict');
    expect(compare({ ...rule, operator: 'neq' }, blue).verdict).toBe('conflict');
    expect(compare({ ...rule, operator: 'neq' }, red).verdict).toBe('compatible');
  });
  it('no hereda decisiones al editar evidencia', () =>
    expect(evidenceKey(rule, red)).not.toBe(evidenceKey(rule, { ...red, facts: blue.facts })));
  it('conserva la identidad de evidencia tras validar y reordenar claves', () => {
    const restored = databaseSchema.parse(db);
    expect(
      evidenceKey(
        restored.records.find((r) => r.id === rule.id) as Rule,
        restored.records.find((r) => r.id === red.id) as StoryEvent,
      ),
    ).toBe(evidenceKey(rule, red));
  });
});
describe('Archivo, fechas y validación', () => {
  it('crea, edita y elimina sin modificar el original', () => {
    const record = { ...blue, id: 'user-event', origin: 'user' as const };
    const added = upsert(db, record);
    expect(added.records).toHaveLength(db.records.length + 1);
    const updated = upsert(added, { ...record, title: 'Título editado' });
    expect(updated.records.find((r) => r.id === record.id)?.title).toBe('Título editado');
    expect(removeRecord(updated, record.id).records).toEqual(db.records);
    expect(db.records).toHaveLength(9);
  });
  it('protege referencias de personajes y rechaza IDs duplicados', () => {
    expect(() => removeRecord(db, 'demo-char-ira')).toThrow('vinculado');
    expect(databaseSchema.safeParse({ ...db, records: [...db.records, rule] }).success).toBe(false);
    expect(databaseSchema.safeParse({ ...db, records: [red] }).success).toBe(false);
  });
  it('ordena por fecha narrativa, independientemente de inserción', () =>
    expect(sortedEvents(db.records).map((e) => e.date)).toEqual([
      '0842-03-08',
      '0842-03-12',
      '0842-03-19',
      '0842-03-23',
    ]));
  it('valida años antiguos, bisiestos y fechas imposibles', () => {
    expect(validDate('0001-01-01')).toBe(true);
    expect(validDate('0844-02-29')).toBe(true);
    for (const value of ['0000-01-01', '0842-02-29', '2026-04-31', '2026-13-01', '8-1-1'])
      expect(validDate(value)).toBe(false);
  });
  it('rechaza propiedades duplicadas, vacías y sin formato', () => {
    expect(eventSchema.safeParse({ ...red, facts: [...red.facts, red.facts[0]] }).success).toBe(
      false,
    );
    expect(
      eventSchema.safeParse({ ...red, facts: [{ property: 'color llama', value: '' }] }).success,
    ).toBe(false);
  });
});
describe('Persistencia y recuperación', () => {
  it('recupera registros y cada estado humano al recargar', () => {
    for (const status of ['pending', 'confirmed', 'resolved', 'dismissed'] as const) {
      const next = { ...db, resolutions: { [evidenceKey(rule, red)]: status } };
      saveDatabase(localStorage, next);
      expect(loadDatabase(localStorage).db).toEqual(next);
    }
    localStorage.clear();
  });
  it('no sobrescribe un archivo dañado', () => {
    localStorage.setItem(STORAGE_KEY, '{incompleto');
    expect(loadDatabase(localStorage).error).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{incompleto');
    localStorage.clear();
  });
  it('comunica fallos de cuota o de acceso', () => {
    expect(() =>
      saveDatabase(
        {
          setItem: () => {
            throw new Error();
          },
        },
        db,
      ),
    ).toThrow('No se pudo guardar');
    expect(
      loadDatabase({
        getItem: () => {
          throw new Error();
        },
      }).error,
    ).toBeTruthy();
  });
});
