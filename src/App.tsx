import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GitBranch,
  LayoutDashboard,
  Orbit,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Pencil,
  AlertTriangle,
  Database as DatabaseIcon,
} from 'lucide-react';
import {
  analyze,
  databaseSchema,
  formatDate,
  kinds,
  removeRecord,
  ruleExpression,
  sortedEvents,
  statuses,
  subjectName,
  upsert,
  type CanonRecord,
  type Database,
  type Status,
} from './domain';
import { createDemo } from './demo';
import { loadDatabase, saveDatabase, STORAGE_KEY } from './storage';
import { Modal } from './Modal';
import { RecordForm } from './RecordForm';

type Page = 'home' | 'archive' | 'check' | 'timeline';
const nav = [
  { id: 'home', label: 'Vista general', icon: LayoutDashboard },
  { id: 'archive', label: 'Archivo del canon', icon: BookOpen },
  { id: 'check', label: 'Prueba de Canon', icon: ShieldCheck },
  { id: 'timeline', label: 'Línea temporal', icon: GitBranch },
] as const;
const typeIcons = { rule: BookOpen, character: Users, event: Clock3 };
function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [loaded] = useState(() => {
    try {
      return loadDatabase(window.localStorage);
    } catch {
      return {
        db: { version: 1, records: [], resolutions: {} } as Database,
        error:
          'El navegador ha bloqueado el almacenamiento local. Habilítalo para guardar tus datos.',
      };
    }
  });
  const [db, setDb] = useState(loaded.db);
  const [error, setError] = useState(loaded.error);
  const [blocked, setBlocked] = useState(!!loaded.error);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [type, setType] = useState<'all' | CanonRecord['kind']>('all');
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState('all');
  const [checkFilter, setCheckFilter] = useState('conflict');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editor, setEditor] = useState<{ kind: CanonRecord['kind']; initial?: CanonRecord } | null>(
    null,
  );
  const [detail, setDetail] = useState<CanonRecord | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);
  const [help, setHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const closeHelp = useCallback(() => setHelp(false), []);
  useEffect(() => {
    if (!loaded.error) {
      try {
        saveDatabase(localStorage, loaded.db);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }, [loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      const result = loadDatabase(localStorage);
      setDb(result.db);
      setError(result.error);
      setBlocked(!!result.error);
      setToast('El archivo se actualizó desde otra pestaña.');
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);
  const commit = (next: Database, message: string, recovery = false) => {
    if (blocked && !recovery) {
      setError(
        'Para proteger el archivo dañado, importa un respaldo válido antes de guardar nuevos cambios. Puedes exportar el archivo almacenado desde el aviso.',
      );
      return false;
    }
    try {
      saveDatabase(localStorage, next);
      setDb(next);
      setError(null);
      setBlocked(false);
      setToast(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const results = analyze(db.records);
  const conflicts = results.filter((r) => r.verdict === 'conflict');
  const pending = conflicts.filter((r) =>
    ['pending', 'confirmed'].includes(db.resolutions[r.key] ?? 'pending'),
  );
  const events = sortedEvents(db.records);
  const counts = {
    rule: db.records.filter((r) => r.kind === 'rule').length,
    character: db.records.filter((r) => r.kind === 'character').length,
    event: events.length,
  };
  const filtered = db.records.filter(
    (r) =>
      (type === 'all' || type === r.kind) &&
      (origin === 'all' || origin === r.origin) &&
      `${r.title} ${r.description} ${r.id}`
        .toLocaleLowerCase('es')
        .includes(query.toLocaleLowerCase('es')),
  );
  const goto = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0 });
  };
  const requestDelete = (record: CanonRecord) =>
    setConfirm({
      title: `Eliminar ${kinds[record.kind].toLowerCase()}`,
      description: `¿Quieres eliminar «${record.title}»? Esta acción no se puede deshacer. Sus comparaciones dejarán de aparecer.`,
      action: () => {
        try {
          if (commit(removeRecord(db, record.id), 'Registro eliminado.')) setDetail(null);
        } catch (e) {
          setError((e as Error).message);
        }
      },
    });
  const saveRecord = (record: CanonRecord) => {
    try {
      if (commit(upsert(db, record), 'Registro guardado. Las comprobaciones están actualizadas.'))
        setEditor(null);
    } catch {
      setError('Revisa los campos y el sujeto: el registro no se pudo validar.');
    }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('El archivo supera el límite de 5 MB.');
      const next = databaseSchema.parse(JSON.parse(await file.text()));
      setConfirm({
        title: 'Importar respaldo',
        description: `El respaldo contiene ${next.records.length} registros. Reemplazará el archivo actual y sus decisiones. Exporta primero si quieres conservarlos.`,
        action: () => {
          commit(next, 'Respaldo importado.', true);
        },
      });
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes('5 MB')
          ? e.message
          : 'No se pudo importar. Selecciona un respaldo JSON válido de Universo Vivo (versión 1), con identificadores únicos y referencias completas.',
      );
    }
  };
  const badge = (r: CanonRecord) => (
    <span className={`badge ${r.origin === 'demo' ? 'demo' : 'own'}`}>
      {r.origin === 'demo' ? 'Demostración' : 'Tu creación'}
    </span>
  );
  const recordCard = (r: CanonRecord) => {
    const Icon = typeIcons[r.kind];
    return (
      <article className="record-card" key={r.id}>
        <div className="card-top">
          <span className={`type-icon ${r.kind}`}>
            <Icon size={20} />
          </span>
          {badge(r)}
        </div>
        <span className="eyebrow">{kinds[r.kind]}</span>
        <button className="title-button" onClick={() => setDetail(r)}>
          <h3>{r.title}</h3>
        </button>
        <p>{r.description}</p>
        <div className="record-meta">
          {r.kind === 'rule' ? (
            <code>{ruleExpression(r)}</code>
          ) : r.kind === 'character' ? (
            r.role
          ) : (
            <>
              <Clock3 size={14} />
              {formatDate(r.date)}
            </>
          )}
        </div>
        <div className="card-footer">
          <button className="text-button" onClick={() => setDetail(r)}>
            Ver registro <ArrowRight size={14} />
          </button>
          <div>
            <button
              className="icon-button"
              aria-label={`Editar ${r.title}`}
              onClick={() => setEditor({ kind: r.kind, initial: r })}
            >
              <Pencil size={15} />
            </button>
            <button
              className="icon-button delete"
              aria-label={`Eliminar ${r.title}`}
              onClick={() => requestDelete(r)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            goto('home');
          }}
        >
          <span className="brand-symbol">
            <Orbit size={30} />
          </span>
          <span>
            universo<span className="brand-light">vivo</span>
            <small>EL HOGAR DE TUS HISTORIAS</small>
          </span>
        </a>
        <div className="workspace-label">ESPACIO DE ESCRITURA</div>
        <nav aria-label="Navegación principal">
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? 'nav-item active' : 'nav-item'}
              onClick={() => goto(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === 'check' && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-orbit">✧</span>
          <p>
            Todo gran mundo
            <br />
            empieza con una idea.
            <br />
            <strong>El tuyo merece continuidad.</strong>
          </p>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Guía y almacenamiento
          </button>
          <span>
            <span className="green-dot" /> Sin IA · sin conexión requerida*
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Mi espacio <ChevronRight size={14} />
            <strong>{nav.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-label">
              <DatabaseIcon size={14} /> Archivo local
            </span>
            <span className="avatar">UV</span>
          </div>
        </header>
        <main>
          {error && (
            <div className="notice error" role="alert">
              <div>{error}</div>
              {blocked && (
                <button
                  className="text-button"
                  onClick={() => {
                    try {
                      download(
                        localStorage.getItem(STORAGE_KEY) ?? '',
                        'universo-vivo-recuperacion.json',
                      );
                    } catch {
                      setError('El navegador no permite leer el archivo almacenado.');
                    }
                  }}
                >
                  Exportar archivo almacenado
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Cerrar mensaje de error"
                onClick={() => setError(null)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {page === 'home' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow green">TU IMAGINACIÓN, CON COHERENCIA</div>
                  <h1>Cada mundo tiene sus reglas.</h1>
                  <p>Dales un lugar. Conecta sus historias. Cuida lo que lo hace único.</p>
                </div>
                <button className="button secondary" onClick={() => setHelp(true)}>
                  <CircleHelp size={17} /> Cómo funciona
                </button>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <span className="green-dot" /> UNIVERSO VIVO
                  </span>
                  <h2>
                    Imagina sin límites.
                    <br />
                    <em>Escribe con continuidad.</em>
                  </h2>
                  <p>
                    Tu canon, tus personajes y tu historia en un mismo lugar. Encuentra
                    contradicciones respaldadas por hechos y decide cómo resolverlas.
                  </p>
                  <button className="button light" onClick={() => goto('archive')}>
                    Explorar mi canon <ArrowRight size={17} />
                  </button>
                  <span className="hero-caption">La última palabra siempre es tuya.</span>
                </div>
                <div className="orbital-art" aria-hidden="true">
                  <div className="orbit-ring ring-one" />
                  <div className="orbit-ring ring-two" />
                  <div className="orbit-ring ring-three" />
                  <div className="planet">
                    <div className="planet-lines" />
                  </div>
                  <span className="moon moon-one" />
                  <span className="moon moon-two" />
                  <span className="star star-one">✦</span>
                  <span className="star star-two">✧</span>
                  <span className="art-label label-one">01 — EL CANON</span>
                  <span className="art-label label-two">UN MUNDO. INFINITAS HISTORIAS.</span>
                </div>
              </section>
              <section className="stats" aria-label="Resumen del archivo">
                {(
                  [
                    {
                      kind: 'rule',
                      label: 'Reglas del universo',
                      caption: 'Los cimientos de tu mundo',
                      icon: BookOpen,
                    },
                    {
                      kind: 'character',
                      label: 'Personajes',
                      caption: 'Quienes dan vida a la historia',
                      icon: Users,
                    },
                    {
                      kind: 'event',
                      label: 'Acontecimientos',
                      caption: 'Cada momento importa',
                      icon: Clock3,
                    },
                  ] as const
                ).map((s) => (
                  <button
                    className="stat-card"
                    key={s.kind}
                    onClick={() => {
                      setType(s.kind);
                      goto('archive');
                    }}
                  >
                    <span className={`type-icon ${s.kind}`}>
                      <s.icon size={20} />
                    </span>
                    <strong>
                      {counts[s.kind]}
                      <span>{s.label}</span>
                    </strong>
                    <small>{s.caption}</small>
                  </button>
                ))}
                <button className="stat-card alert-stat" onClick={() => goto('check')}>
                  <span className="type-icon alert">
                    <ShieldCheck size={21} />
                  </span>
                  <strong>
                    {pending.length}
                    <span>Alertas por revisar</span>
                  </strong>
                  <small>
                    {pending.length ? 'Tu criterio completa el canon' : 'No hay alertas abiertas'}
                  </small>
                </button>
              </section>
              <section className="home-columns">
                <div className="demo-panel">
                  <div className="section-heading">
                    <h2>Un mundo para empezar</h2>
                    <span className="badge demo">Demostración original</span>
                  </div>
                  <div className="demo-content">
                    <div className="island-art" aria-hidden="true">
                      <span className="lighthouse" />
                      <span className="sea-line sea-one" />
                      <span className="sea-line sea-two" />
                      <span className="island-star">✦</span>
                    </div>
                    <div>
                      <span className="eyebrow green">LAS ISLAS QUE OLVIDÓ EL MAR</span>
                      <h3>El archipiélago de Nácar</h3>
                      <p>
                        Puentes de bruma, llaves de sal y un faro cuya luz nunca cambia… ¿o sí?
                        Explora este pequeño universo creado para probar la continuidad.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setOrigin('demo');
                          setType('all');
                          setQuery('');
                          goto('archive');
                        }}
                      >
                        Explorar la demostración <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="demo-foot">
                    <CircleHelp size={15} /> Datos ficticios de ejemplo, identificados en cada
                    registro.
                  </div>
                </div>
                <div className="review-panel">
                  <div className="section-heading">
                    <h2>Una mirada al canon</h2>
                    <ShieldCheck size={20} />
                  </div>
                  {conflicts.length ? (
                    <>
                      <span className="badge warning">
                        {conflicts.length}{' '}
                        {conflicts.length === 1
                          ? 'contradicción detectada'
                          : 'contradicciones detectadas'}
                      </span>
                      <h3>{conflicts[0].event.title}</h3>
                      <p>La evidencia registrada no cumple «{conflicts[0].rule.title}».</p>
                      <button className="button secondary" onClick={() => goto('check')}>
                        Revisar evidencia <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>Tu archivo está listo para crecer</h3>
                      <p>
                        {db.records.length
                          ? 'No hay contradicciones explícitas. Consulta también las comparaciones sin evidencia suficiente.'
                          : 'Crea un personaje, define una regla y registra tu primer acontecimiento.'}
                      </p>
                      <button className="text-button" onClick={() => goto('check')}>
                        Abrir Prueba de Canon <ArrowRight size={16} />
                      </button>
                    </>
                  )}
                </div>
              </section>
              <div className="bottom-note">
                <Sparkles size={17} />
                <p>
                  <strong>Un asistente de continuidad, con los pies en la tierra.</strong>{' '}
                  Comparamos campos estructurados. No adivinamos el significado de tu historia.
                </p>
              </div>
            </>
          )}
          {page === 'archive' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow green">LA MEMORIA DE TU UNIVERSO</div>
                  <h1>Archivo del canon</h1>
                  <p>Construye las piezas de tu mundo, una historia a la vez.</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(JSON.stringify(db, null, 2), 'universo-vivo-respaldo.json')
                    }
                  >
                    <ArrowDownToLine size={17} /> Exportar
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setEditor({ kind: type === 'all' ? 'character' : type })}
                  >
                    <Plus size={18} /> Nuevo registro
                  </button>
                </div>
              </div>
              <div className="archive-toolbar">
                <div className="tabs" aria-label="Tipo de registro">
                  {(['all', 'rule', 'character', 'event'] as const).map((t) => (
                    <button
                      className={type === t ? 'selected' : ''}
                      key={t}
                      onClick={() => setType(t)}
                    >
                      {t === 'all'
                        ? 'Todos'
                        : t === 'rule'
                          ? 'Reglas'
                          : t === 'character'
                            ? 'Personajes'
                            : 'Acontecimientos'}
                      <span>{t === 'all' ? db.records.length : counts[t]}</span>
                    </button>
                  ))}
                </div>
                <div className="filters">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Buscar en el archivo"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar en tu universo…"
                    />
                  </label>
                  <select
                    aria-label="Filtrar por origen"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  >
                    <option value="all">Todos los orígenes</option>
                    <option value="user">Mis creaciones</option>
                    <option value="demo">Demostración</option>
                  </select>
                </div>
              </div>
              <div className="record-grid">{filtered.map(recordCard)}</div>
              {!filtered.length && (
                <Empty
                  title="Aquí comienza otra historia"
                  text={
                    db.records.length
                      ? 'No hay registros con estos filtros. Prueba otra búsqueda o crea una pieza nueva.'
                      : 'Empieza por crear un personaje. Después podrás vincular sus reglas y acontecimientos.'
                  }
                  action={
                    <button
                      className="button primary"
                      onClick={() => setEditor({ kind: type === 'all' ? 'character' : type })}
                    >
                      <Plus size={17} /> Crear registro
                    </button>
                  }
                />
              )}
              <div className="archive-tools">
                <button className="text-button" onClick={() => fileInput.current?.click()}>
                  <ArrowUpFromLine size={16} /> Importar respaldo
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setConfirm({
                      title: 'Cargar demostración',
                      description:
                        'Se añadirán los registros originales que falten. Tus creaciones y las ediciones existentes se conservarán.',
                      action: () => {
                        const existing = new Set(db.records.map((r) => r.id));
                        commit(
                          {
                            ...db,
                            records: [
                              ...db.records,
                              ...createDemo().records.filter((r) => !existing.has(r.id)),
                            ],
                          },
                          'Demostración disponible.',
                        );
                      },
                    })
                  }
                >
                  Cargar demostración
                </button>
                <button
                  className="text-button danger"
                  onClick={() =>
                    setConfirm({
                      title: 'Quitar demostración',
                      description:
                        'Se eliminarán solo los registros etiquetados como demostración. Si tus creaciones usan sus personajes, tendrás que cambiar esas referencias primero.',
                      action: () => {
                        const next = {
                          ...db,
                          records: db.records.filter((r) => r.origin !== 'demo'),
                        };
                        if (!databaseSchema.safeParse(next).success) {
                          setError(
                            'Tus creaciones usan personajes de demostración. Cambia sus sujetos antes de quitar la demostración.',
                          );
                          return;
                        }
                        commit(next, 'Demostración eliminada.');
                      },
                    })
                  }
                >
                  Quitar demostración
                </button>
              </div>
            </>
          )}
          {page === 'check' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow green">LA COHERENCIA ESTÁ EN LOS DETALLES</div>
                  <h1>Prueba de Canon</h1>
                  <p>Comprobaciones automáticas. Evidencia visible. Decisiones humanas.</p>
                </div>
                <span className="live-pill">
                  <span className="green-dot" /> Actualizado con tu archivo
                </span>
              </div>
              <div className="notice info">
                <ShieldCheck size={22} />
                <div>
                  <strong>Solo hechos que se pueden comparar</strong>
                  <p>
                    Se comparan sujetos y valores exactos. Una descripción no demuestra una
                    contradicción. Resolver una alerta registra tu decisión; no cambia el canon.
                  </p>
                </div>
              </div>
              <div className="check-summary">
                {[
                  { value: 'conflict', label: 'Contradicciones', icon: AlertTriangle },
                  { value: 'compatible', label: 'Compatibles', icon: Check },
                  { value: 'unknown', label: 'Sin evidencia suficiente', icon: CircleHelp },
                  { value: 'not-applicable', label: 'No aplican', icon: GitBranch },
                ].map((f) => (
                  <button
                    className={checkFilter === f.value ? 'selected' : ''}
                    key={f.value}
                    onClick={() => setCheckFilter(f.value)}
                  >
                    <f.icon size={19} />
                    <strong>{results.filter((r) => r.verdict === f.value).length}</strong>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
              {checkFilter === 'conflict' && (
                <div className="result-toolbar">
                  <p>{conflicts.length} comparaciones con evidencia incompatible</p>
                  <select
                    aria-label="Filtrar por estado de alerta"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    {Object.entries(statuses).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="results-list">
                {results
                  .filter(
                    (r) =>
                      r.verdict === checkFilter &&
                      (checkFilter !== 'conflict' ||
                        statusFilter === 'all' ||
                        (db.resolutions[r.key] ?? 'pending') === statusFilter),
                  )
                  .map((r) => (
                    <article className={`result-card ${r.verdict}`} key={r.key}>
                      <div className="result-heading">
                        <span
                          className={`badge ${r.verdict === 'conflict' ? 'warning' : r.verdict === 'compatible' ? 'own' : 'neutral'}`}
                        >
                          {r.verdict === 'conflict'
                            ? 'Contradicción explícita'
                            : r.verdict === 'compatible'
                              ? 'Compatible'
                              : r.verdict === 'unknown'
                                ? 'No se puede confirmar el conflicto'
                                : 'Fuera del alcance de la regla'}
                        </span>
                        {r.verdict === 'conflict' && (
                          <label className="status-select">
                            Estado
                            <select
                              aria-label={`Estado de ${r.event.title} con ${r.rule.title}`}
                              value={db.resolutions[r.key] ?? 'pending'}
                              onChange={(e) =>
                                commit(
                                  {
                                    ...db,
                                    resolutions: {
                                      ...db.resolutions,
                                      [r.key]: e.target.value as Status,
                                    },
                                  },
                                  'Decisión guardada. El canon no se ha modificado.',
                                )
                              }
                            >
                              {Object.entries(statuses).map(([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                      <div className="evidence-grid">
                        <div>
                          <span className="eyebrow">
                            REGLA ORIGINAL {r.rule.origin === 'demo' && '· DEMOSTRACIÓN'}
                          </span>
                          <button className="title-button" onClick={() => setDetail(r.rule)}>
                            <h3>{r.rule.title}</h3>
                          </button>
                          <p>{r.rule.description}</p>
                          <code>{ruleExpression(r.rule)}</code>
                          <small>
                            Sujeto: {subjectName(r.rule.subjectId, db.records)}
                            {r.rule.condition
                              ? ` · Si ${r.rule.condition.property} = «${r.rule.condition.value}»`
                              : ' · Siempre'}
                          </small>
                        </div>
                        <div>
                          <span className="eyebrow">
                            ACONTECIMIENTO {r.event.origin === 'demo' && '· DEMOSTRACIÓN'}
                          </span>
                          <button className="title-button" onClick={() => setDetail(r.event)}>
                            <h3>{r.event.title}</h3>
                          </button>
                          <p>{r.event.description}</p>
                          <div className="fact-chips">
                            {r.event.facts.map((f) => (
                              <code key={f.property}>
                                {f.property} = «{f.value}»
                              </code>
                            ))}
                          </div>
                          <small>
                            {subjectName(r.event.subjectId, db.records)} ·{' '}
                            {formatDate(r.event.date)}
                          </small>
                        </div>
                      </div>
                      <div className="explanation">
                        <CircleHelp size={17} />
                        <p>{r.explanation}</p>
                      </div>
                      {r.verdict === 'conflict' &&
                        ['resolved', 'dismissed'].includes(db.resolutions[r.key]) && (
                          <p className="decision-note">
                            Decisión humana: {statuses[db.resolutions[r.key]]}. La incompatibilidad
                            sigue documentada mientras estos valores permanezcan en el archivo.
                          </p>
                        )}
                    </article>
                  ))}
              </div>
              {!results.some(
                (r) =>
                  r.verdict === checkFilter &&
                  (checkFilter !== 'conflict' ||
                    statusFilter === 'all' ||
                    (db.resolutions[r.key] ?? 'pending') === statusFilter),
              ) && (
                <Empty
                  title={
                    checkFilter === 'conflict'
                      ? 'Sin alertas en esta vista'
                      : 'Sin comparaciones en esta categoría'
                  }
                  text="Las comprobaciones necesitan reglas y acontecimientos vinculados a personajes. La ausencia de alertas no garantiza que toda la historia sea coherente."
                  action={
                    <button className="button secondary" onClick={() => goto('archive')}>
                      Ir al archivo <ArrowRight size={16} />
                    </button>
                  }
                />
              )}
            </>
          )}
          {page === 'timeline' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow green">EL HILO DE TU HISTORIA</div>
                  <h1>Línea temporal</h1>
                  <p>Cada acontecimiento en su lugar, según la fecha dentro de tu mundo.</p>
                </div>
                <button className="button primary" onClick={() => setEditor({ kind: 'event' })}>
                  <Plus size={18} /> Nuevo acontecimiento
                </button>
              </div>
              <div className="timeline-intro">
                <Clock3 size={18} />
                <span>
                  {events.length} acontecimientos · Del más antiguo al más reciente · Calendario
                  gregoriano, años 0001–9999
                </span>
              </div>
              <div className="timeline">
                {events.map((e, i) => (
                  <article className="timeline-item" key={e.id}>
                    <div className="timeline-date">
                      <span>{e.date.slice(0, 4)}</span>
                      <strong>{formatDate(e.date).slice(0, 7)}</strong>
                    </div>
                    <div className="timeline-node" />
                    <div className="timeline-card">
                      <div className="card-top">
                        <span className="eyebrow">
                          CAPÍTULO DEL MUNDO / {String(i + 1).padStart(2, '0')}
                        </span>
                        {badge(e)}
                      </div>
                      <button className="title-button" onClick={() => setDetail(e)}>
                        <h3>{e.title}</h3>
                      </button>
                      <p>{e.description}</p>
                      <div className="timeline-footer">
                        <span>
                          <Users size={14} />
                          {subjectName(e.subjectId, db.records)}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => setEditor({ kind: 'event', initial: e })}
                        >
                          Editar acontecimiento <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!events.length && (
                <Empty
                  title="Toda historia tiene un comienzo"
                  text="Añade un acontecimiento con su fecha narrativa para empezar a trazar la historia de tu universo."
                  action={
                    <button className="button primary" onClick={() => setEditor({ kind: 'event' })}>
                      Crear acontecimiento
                    </button>
                  }
                />
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              universo vivo <span className="footer-star">✧</span> Hecho para imaginar.
            </span>
            <button onClick={() => setHelp(true)}>
              Tus datos viven en este navegador <ArrowRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Seleccionar respaldo"
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {editor && (
        <Modal
          title={
            editor.initial
              ? `Editar ${kinds[editor.kind].toLowerCase()}`
              : 'Nueva pieza del universo'
          }
          onClose={closeEditor}
        >
          {!editor.initial && (
            <div className="tabs editor-tabs">
              {(['character', 'rule', 'event'] as const).map((k) => (
                <button
                  key={k}
                  className={editor.kind === k ? 'selected' : ''}
                  onClick={() => setEditor({ kind: k })}
                >
                  {kinds[k]}
                </button>
              ))}
            </div>
          )}
          <RecordForm
            key={editor.initial?.id ?? editor.kind}
            kind={editor.kind}
            initial={editor.initial}
            records={db.records}
            onSave={saveRecord}
            onCancel={closeEditor}
          />
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
        </Modal>
      )}
      {detail && (
        <Modal title={detail.title} onClose={closeDetail}>
          <div className="detail-body">
            {badge(detail)}
            <p>{detail.description}</p>
            <dl>
              <dt>Identificador</dt>
              <dd className="mono">{detail.id}</dd>
              <dt>Tipo</dt>
              <dd>{kinds[detail.kind]}</dd>
              {detail.kind === 'character' ? (
                <>
                  <dt>Rol</dt>
                  <dd>{detail.role}</dd>
                </>
              ) : (
                <>
                  <dt>Sujeto</dt>
                  <dd>{subjectName(detail.subjectId, db.records)}</dd>
                  {detail.kind === 'rule' ? (
                    <>
                      <dt>Valor requerido</dt>
                      <dd>
                        <code>{ruleExpression(detail)}</code>
                      </dd>
                      <dt>Cuándo se aplica</dt>
                      <dd>
                        {detail.condition
                          ? `${detail.condition.property} = «${detail.condition.value}»`
                          : 'Siempre'}
                      </dd>
                    </>
                  ) : (
                    <>
                      <dt>Fecha narrativa</dt>
                      <dd>{formatDate(detail.date)}</dd>
                      <dt>Hechos</dt>
                      <dd className="fact-chips">
                        {detail.facts.map((f) => (
                          <code key={f.property}>
                            {f.property} = «{f.value}»
                          </code>
                        ))}
                      </dd>
                    </>
                  )}
                </>
              )}
            </dl>
            <div className="form-actions">
              <button
                className="button secondary danger"
                onClick={() => {
                  setDetail(null);
                  requestDelete(detail);
                }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setEditor({ kind: detail.kind, initial: detail });
                  setDetail(null);
                }}
              >
                <Pencil size={16} /> Editar registro
              </button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={closeConfirm}>
          <p className="confirmation-text">{confirm.description}</p>
          <div className="form-actions">
            <button className="button secondary" onClick={closeConfirm}>
              Cancelar
            </button>
            <button
              className="button primary"
              onClick={() => {
                confirm.action();
                setConfirm(null);
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Tu mundo, bajo tu control" onClose={closeHelp}>
          <div className="guide">
            <h3>1. Define el canon</h3>
            <p>
              Crea personajes y reglas con sujeto, propiedad y valor. Puedes limitar una regla a una
              condición explícita.
            </p>
            <h3>2. Registra lo que sucede</h3>
            <p>
              Añade acontecimientos con hechos comparables y su fecha narrativa. Usa las mismas
              claves y valores que en tus reglas.
            </p>
            <h3>3. Revisa y decide</h3>
            <p>
              Prueba de Canon se actualiza al guardar. Distingue contradicciones, compatibilidad,
              falta de evidencia y reglas que no aplican. Tú puedes confirmar, resolver o descartar
              cada alerta; también devolverla a pendiente.
            </p>
            <h3>Almacenamiento local</h3>
            <p>
              Los datos y decisiones se guardan en localStorage de este navegador y dirección web.
              No hay cuenta, servidor, sincronización entre dispositivos ni copias automáticas.
              Borrar datos del navegador los elimina; el modo privado puede descartarlos al
              cerrarse. El espacio es limitado y no está cifrado por la aplicación.
            </p>
            <p>
              Exporta respaldos JSON desde el archivo. Importar reemplaza el contenido actual tras
              una confirmación. *Una vez cargada la aplicación, las funciones principales no
              necesitan servicios externos; para abrirla de nuevo debes mantener el servidor local
              funcionando. No es una PWA instalable.
            </p>
            <h3>Alcance del MVP</h3>
            <p>
              Un archivo de universo por navegador. Igualdad o desigualdad de textos exactos, un
              sujeto por acontecimiento y una condición opcional por regla. No interpreta prosa,
              causalidad, fechas de vigencia ni calendarios inventados. Los estados humanos
              documentan decisiones y no corrigen reglas.
            </p>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setHelp(false);
                  fileInput.current?.click();
                }}
              >
                <ArrowUpFromLine size={16} /> Importar respaldo
              </button>
              <button
                className="button primary"
                onClick={() => download(JSON.stringify(db, null, 2), 'universo-vivo-respaldo.json')}
              >
                <ArrowDownToLine size={16} /> Exportar respaldo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FileText size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
