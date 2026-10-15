import type { Database } from './domain';
export function createDemo(): Database {
  return {
    version: 1,
    resolutions: {},
    records: [
      {
        id: 'demo-char-ira',
        kind: 'character',
        origin: 'demo',
        title: 'Ira de la Sal',
        description:
          'Cartógrafa de las mareas suspendidas. Busca el puerto donde desapareció su hermana.',
        role: 'Cartógrafa · habitante terrestre',
      },
      {
        id: 'demo-char-narel',
        kind: 'character',
        origin: 'demo',
        title: 'Narel, el farero',
        description:
          'Custodio del faro de nácar. Conserva los nombres de las islas que la niebla ha borrado.',
        role: 'Guardián del faro',
      },
      {
        id: 'demo-rule-bridge',
        kind: 'rule',
        origin: 'demo',
        title: 'El precio del puente de bruma',
        description:
          'Durante la marea alta, el puente exige una llave de sal a cualquiera que lo cruce.',
        subjectId: '*',
        property: 'llave_de_sal',
        operator: 'eq',
        value: 'sí',
        condition: { property: 'cruce_en_marea_alta', value: 'sí' },
      },
      {
        id: 'demo-rule-light',
        kind: 'rule',
        origin: 'demo',
        title: 'La luz de Narel',
        description:
          'La llama que custodia Narel siempre es azul. Ningún combustible puede alterar su color.',
        subjectId: 'demo-char-narel',
        property: 'color_de_llama',
        operator: 'eq',
        value: 'azul',
        condition: null,
      },
      {
        id: 'demo-rule-ira',
        kind: 'rule',
        origin: 'demo',
        title: 'Un cuerpo anclado a la tierra',
        description:
          'Ira no puede respirar bajo el agua. Necesita una campana de aire para sumergirse.',
        subjectId: 'demo-char-ira',
        property: 'respira_bajo_agua',
        operator: 'eq',
        value: 'no',
        condition: null,
      },
      {
        id: 'demo-event-arrival',
        kind: 'event',
        origin: 'demo',
        title: 'La llegada a Nácar',
        description:
          'Ira atraviesa el puente al subir la marea y entrega la llave de sal que heredó de su madre.',
        subjectId: 'demo-char-ira',
        date: '0842-03-12',
        facts: [
          { property: 'cruce_en_marea_alta', value: 'sí' },
          { property: 'llave_de_sal', value: 'sí' },
          { property: 'respira_bajo_agua', value: 'no' },
        ],
      },
      {
        id: 'demo-event-red',
        kind: 'event',
        origin: 'demo',
        title: 'La noche de la llama roja',
        description:
          'Narel enciende el faro y una llama roja ilumina la bahía. Este detalle contradice deliberadamente el canon de demostración.',
        subjectId: 'demo-char-narel',
        date: '0842-03-19',
        facts: [
          { property: 'color_de_llama', value: 'roja' },
          { property: 'cruce_en_marea_alta', value: 'no' },
        ],
      },
      {
        id: 'demo-event-blue',
        kind: 'event',
        origin: 'demo',
        title: 'La vigilia azul',
        description:
          'Antes de la llegada de Ira, Narel mantiene encendida la llama azul mientras cuenta los barcos del horizonte.',
        subjectId: 'demo-char-narel',
        date: '0842-03-08',
        facts: [
          { property: 'color_de_llama', value: 'azul' },
          { property: 'cruce_en_marea_alta', value: 'no' },
        ],
      },
      {
        id: 'demo-event-map',
        kind: 'event',
        origin: 'demo',
        title: 'Un mapa sin orillas',
        description:
          'Ira encuentra un mapa escrito en una lengua olvidada. No hay información suficiente para comprobar su capacidad de respirar bajo el agua.',
        subjectId: 'demo-char-ira',
        date: '0842-03-23',
        facts: [{ property: 'hallazgo', value: 'mapa de las islas borradas' }],
      },
    ],
  };
}
