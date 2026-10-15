import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { recordSchema, kinds, type CanonRecord } from './domain';

export function RecordForm({
  initial,
  kind,
  records,
  onSave,
  onCancel,
}: {
  initial?: CanonRecord;
  kind: CanonRecord['kind'];
  records: CanonRecord[];
  onSave: (record: CanonRecord) => void;
  onCancel: () => void;
}) {
  const characters = records.filter((r) => r.kind === 'character');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [role, setRole] = useState(initial?.kind === 'character' ? initial.role : '');
  const [subjectId, setSubjectId] = useState(
    initial && initial.kind !== 'character'
      ? initial.subjectId
      : kind === 'rule'
        ? '*'
        : (characters[0]?.id ?? ''),
  );
  const [property, setProperty] = useState(initial?.kind === 'rule' ? initial.property : '');
  const [value, setValue] = useState(initial?.kind === 'rule' ? initial.value : '');
  const [operator, setOperator] = useState<'eq' | 'neq'>(
    initial?.kind === 'rule' ? initial.operator : 'eq',
  );
  const [conditional, setConditional] = useState(initial?.kind === 'rule' && !!initial.condition);
  const [conditionProperty, setConditionProperty] = useState(
    initial?.kind === 'rule' ? (initial.condition?.property ?? '') : '',
  );
  const [conditionValue, setConditionValue] = useState(
    initial?.kind === 'rule' ? (initial.condition?.value ?? '') : '',
  );
  const [date, setDate] = useState(initial?.kind === 'event' ? initial.date : '');
  const [facts, setFacts] = useState(
    initial?.kind === 'event' ? initial.facts : [{ property: '', value: '' }],
  );
  const [error, setError] = useState('');
  const properties = [
    ...new Set(
      records.flatMap((r) =>
        r.kind === 'rule'
          ? [r.property, ...(r.condition ? [r.condition.property] : [])]
          : r.kind === 'event'
            ? r.facts.map((f) => f.property)
            : [],
      ),
    ),
  ];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const base = {
      id: initial?.id ?? crypto.randomUUID(),
      title,
      description,
      origin: initial?.origin ?? 'user',
      kind,
    };
    const candidate =
      kind === 'character'
        ? { ...base, role }
        : kind === 'rule'
          ? {
              ...base,
              subjectId,
              property,
              value,
              operator,
              condition: conditional
                ? { property: conditionProperty, value: conditionValue }
                : null,
            }
          : { ...base, subjectId, date, facts };
    const result = recordSchema.safeParse(candidate);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(' '));
      return;
    }
    onSave(result.data);
  };
  return (
    <form onSubmit={submit} className="record-form">
      <p className="muted">
        {initial
          ? 'Los cambios actualizarán las comprobaciones del canon.'
          : `Añade ${kind === 'rule' ? 'una regla' : 'un ' + kinds[kind].toLowerCase()} a tu archivo.`}{' '}
        {initial?.origin === 'demo' && 'Este registro conservará su etiqueta de demostración.'}
      </p>
      <label>
        Nombre o título
        <input
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dale un nombre a esta pieza de tu mundo"
        />
      </label>
      <label>
        Descripción
        <textarea
          required
          maxLength={2000}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Escribe el contexto narrativo…"
        />
      </label>
      {kind === 'character' ? (
        <label>
          Rol en el universo
          <input
            required
            maxLength={160}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ej. Exploradora del archipiélago"
          />
        </label>
      ) : (
        <label>
          Sujeto
          <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {kind === 'rule' && <option value="*">Todos los personajes</option>}
            {!characters.length && kind === 'event' && (
              <option value="">Crea un personaje primero</option>
            )}
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <datalist id="properties">
        {properties.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {kind === 'rule' && (
        <fieldset>
          <legend>Comportamiento del canon</legend>
          <div className="form-grid">
            <label>
              Propiedad o acción
              <input
                required
                list="properties"
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                placeholder="color_de_llama"
              />
            </label>
            <label>
              Condición del valor
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as 'eq' | 'neq')}
              >
                <option value="eq">Debe ser igual a</option>
                <option value="neq">Debe ser distinto de</option>
              </select>
            </label>
          </div>
          <label>
            Valor esperado
            <input
              required
              maxLength={160}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="azul"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={conditional}
              onChange={(e) => setConditional(e.target.checked)}
            />{' '}
            Aplicar solo cuando se cumpla una condición
          </label>
          {conditional && (
            <div className="form-grid">
              <label>
                Propiedad de la condición
                <input
                  required
                  list="properties"
                  value={conditionProperty}
                  onChange={(e) => setConditionProperty(e.target.value)}
                  placeholder="cruce_en_marea_alta"
                />
              </label>
              <label>
                Debe ser igual a
                <input
                  required
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="sí"
                />
              </label>
            </div>
          )}
        </fieldset>
      )}
      {kind === 'event' && (
        <>
          <label>
            Fecha dentro de la historia
            <input
              type="date"
              required
              min="0001-01-01"
              max="9999-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Hechos comprobables</legend>
            {facts.map((fact, i) => (
              <div className="fact-row" key={i}>
                <label>
                  Propiedad {i + 1}
                  <input
                    required
                    list="properties"
                    value={fact.property}
                    placeholder="color_de_llama"
                    onChange={(e) =>
                      setFacts(
                        facts.map((f, n) => (n === i ? { ...f, property: e.target.value } : f)),
                      )
                    }
                  />
                </label>
                <label>
                  Valor {i + 1}
                  <input
                    required
                    value={fact.value}
                    maxLength={160}
                    placeholder="azul"
                    onChange={(e) =>
                      setFacts(facts.map((f, n) => (n === i ? { ...f, value: e.target.value } : f)))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  disabled={facts.length === 1}
                  aria-label={`Quitar propiedad ${i + 1}`}
                  onClick={() => setFacts(facts.filter((_, n) => n !== i))}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <button
              className="button secondary small"
              type="button"
              disabled={facts.length >= 30}
              onClick={() => setFacts([...facts, { property: '', value: '' }])}
            >
              <Plus size={16} /> Añadir hecho
            </button>
          </fieldset>
        </>
      )}
      {kind !== 'character' && (
        <p className="help">
          Usa la misma clave y valor en reglas y acontecimientos. Se comparan valores exactos: «sí»
          y «Sí» son distintos. La descripción no se analiza.{' '}
          {kind === 'rule' &&
            !conditional &&
            'Esta regla se aplica siempre al sujeto seleccionado.'}
        </p>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="button primary"
          type="submit"
          disabled={kind === 'event' && !characters.length}
        >
          Guardar {kinds[kind].toLowerCase()}
        </button>
      </div>
    </form>
  );
}
