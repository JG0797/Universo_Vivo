# Universo Vivo

MVP original para un hackathon de Vibe Coding. Aplicación local de continuidad narrativa, escrita desde cero con React, TypeScript y Vite. Interfaz y contenido en español. No utiliza APIs de IA, servidor de datos, cuentas ni servicios de pago. Las ilustraciones son CSS original; los iconos pertenecen a Lucide y las tipografías son las disponibles en el sistema. No se reutilizó código ni contenido de otros proyectos.

## Requisitos e instalación

Usa **Node.js 24.x** y **pnpm 11.25.0**. El entorno comprobado es Node **24.21.0** con pnpm **11.25.0**. `package.json` declara la rama de Node en `engines` y la versión exacta de pnpm en `packageManager`.

Comprueba que ambos estén disponibles en tu terminal:

```sh
node --version
pnpm --version
```

Abre una terminal en la carpeta que contiene `package.json`. Todos los comandos siguientes se ejecutan desde esa carpeta y no dependen de rutas personales ni de un sistema operativo específico.

```sh
pnpm install --frozen-lockfile
```

La instalación utiliza las versiones de `pnpm-lock.yaml` sin actualizar el archivo de bloqueo. Conserva ese archivo en el repositorio. Puede requerir Internet si las dependencias no están en la caché local. No mezcles instalaciones de npm y pnpm para evitar crear un segundo archivo de bloqueo.

## Desarrollo local

```sh
pnpm dev
```

Abre **http://127.0.0.1:5173/**. Mantén abierta la terminal; `Ctrl+C` detiene el servidor. Si el puerto está ocupado, Vite imprime el puerto alternativo. Usa siempre la misma dirección y puerto para acceder al mismo almacenamiento. La aplicación no hace peticiones a servicios externos durante su uso.

## Verificación y producción

```sh
pnpm test
pnpm build
pnpm preview
```

`pnpm test` ejecuta Vitest una vez y termina. `pnpm build` comprueba TypeScript y, solo si pasa, genera la compilación de Vite en `dist/`. `pnpm preview` sirve esa compilación localmente, normalmente en **http://127.0.0.1:4173/**; no es un servidor para producción. Detén la vista previa con `Ctrl+C`.

No abras `dist/index.html` con `file://`: sírvelo por HTTP. Desarrollo y vista previa usan puertos distintos, por lo que sus archivos locales son independientes; exporta/importa el respaldo para trasladarlos. No se ha publicado en un alojamiento externo.

## Archivos privados y preparación del despliegue

`.gitignore` excluye dependencias, compilaciones, cachés, cobertura, temporales, respaldos de la aplicación y patrones habituales de secretos. No guardes credenciales en el código, en `public/` ni en ejemplos. `.env.example`, si se añade, debe contener solo nombres de variables y valores ficticios. Una regla de exclusión no protege un archivo que ya estuviera versionado ni detecta secretos con nombres inesperados: revisa siempre el contenido antes de publicarlo.

Los datos de `localStorage` están en el navegador, no en los archivos del proyecto. Guarda tus respaldos en `backups/` o `respaldos/`, o fuera de la carpeta del proyecto. Cambiarles el nombre puede hacer que dejen de coincidir con los patrones de exclusión.

La salida para un alojamiento estático es `dist/`; no se necesita un servidor de aplicación ni variables secretas. La configuración actual supone servir la aplicación desde la raíz del dominio. Publicarla en una subruta, como una página de proyecto de GitHub Pages, requerirá revisar `base` en Vite antes del despliegue. Esta preparación no inicializa Git ni configura publicación automática.

## Recorrido de demostración

El primer inicio carga **El archipiélago de Nácar**, creado exclusivamente para este proyecto: dos personajes, tres reglas y cuatro acontecimientos. Todos muestran la etiqueta **Demostración**. Los registros nuevos muestran **Tu creación**. Editar una pieza de demostración conserva su origen.

1. Abre **Archivo del canon**. Consulta a Ira de la Sal y a Narel; prueba las pestañas, búsqueda por título/descripción/ID y filtro por origen.
2. En **Prueba de Canon**, el archivo inicial produce **una contradicción**: la regla «La luz de Narel» exige `color_de_llama = azul`, pero «La noche de la llama roja» registra `roja` para Narel.
3. **La vigilia azul** es compatible con esa regla. La llegada de Ira cumple la regla condicional del puente y su regla de respiración. Hay tres comparaciones compatibles en total.
4. **Un mapa sin orillas** no aporta los hechos necesarios para dos reglas: se muestra que no se puede confirmar el conflicto. Otras seis comparaciones no aplican por sujeto o condición.
5. Cambia una alerta a confirmada, resuelta o descartada y recarga. La decisión debe conservarse. Puedes devolverla a pendiente. No se modifica ninguna regla.
6. En **Línea temporal**, comprueba el orden: 08, 12, 19 y 23 de marzo de 0842, aunque los registros se insertaron en otro orden.
7. Crea un personaje propio, una regla y un acontecimiento con la misma propiedad. Cambia el valor del acontecimiento para ver cómo pasa de compatible a contradictorio.
8. Exporta un respaldo JSON. Importarlo requiere confirmar que sustituirá el archivo actual. Puedes quitar la demostración y trabajar solo con tus registros; se impide quitar personajes referenciados por tus creaciones.

Los recuentos de este recorrido proceden de comparaciones del motor sobre datos ficticios de demostración, no de análisis de textos ni de un universo real del usuario.

## Modelo y reglas del detector

- Cada registro tiene identificador estable, tipo, título, descripción y origen.
- Personaje: rol narrativo.
- Regla: sujeto (personaje o todos), clave de propiedad, operador igual/distinto, valor esperado y una condición opcional de igualdad.
- Acontecimiento: un sujeto, fecha narrativa y lista de hechos únicos `{ property, value }`.
- Las propiedades usan minúsculas ASCII, números y guion bajo (`color_de_llama`). Los valores son texto exacto y sensible a mayúsculas/acentos; se recortan espacios exteriores al guardar. No se interpretan números, sinónimos, negaciones ni palabras de la descripción.
- Sujeto distinto: no aplica. Condición falsa: no aplica. Condición ausente o propiedad ausente: evidencia insuficiente. Sujeto y condición aplicables con valor incompatible: contradicción explícita.
- Fechas gregorianas válidas entre 0001 y 9999, sin hora ni zona horaria, ordenadas por `AAAA-MM-DD`. En caso de empate se usa título e identificador. No se incluyen calendarios ficticios ni años negativos.
- Una decisión está vinculada a la evidencia completa y ordenada de regla y acontecimiento. Editar su contenido genera una nueva comparación pendiente. La etiqueta humana no altera ni elimina los hechos incompatibles.
- «Resuelta» documenta la revisión humana; para corregir la incompatibilidad en los datos hay que editar manualmente el canon o el acontecimiento.

## Persistencia y límites

Se utiliza `localStorage`, clave `universo-vivo:v1`, con validación de esquema versión 1. Los cambios se guardan antes de reflejarse en la interfaz. Ante fallo de cuota o permisos se explica el error y no se aplica la operación. Un archivo dañado no se sobrescribe: se ofrece exportar su contenido e importar un respaldo válido.

Los datos pertenecen a este navegador, perfil y origen (protocolo, host y puerto). No hay sincronización entre dispositivos, cuenta, copia automática ni cifrado propio. Al borrar el almacenamiento del navegador se pierden; en modo privado pueden desaparecer al cerrar. El espacio disponible depende del navegador. Se recomienda exportar respaldos con frecuencia y evitar ediciones simultáneas desde distintas pestañas: se escuchan cambios externos, pero no existe resolución de conflictos entre escrituras concurrentes.

La importación valida referencias, IDs únicos, fechas, estados y propiedades antes de solicitar confirmación; acepta archivos hasta 5 MB y hasta 10.000 registros. Estos límites de validación no garantizan buen rendimiento con ese volumen: el motor compara cada regla con cada acontecimiento y está pensado para archivos pequeños. No se ha realizado una prueba de carga.

Las funciones principales operan en el navegador sin servicios externos una vez cargadas. Para abrir la página de nuevo hace falta el servidor local. No se ha implementado un service worker ni instalación PWA.

## Estructura

```text
src/
  App.tsx           Navegación, vistas y coordinación de operaciones
  RecordForm.tsx    Formularios y edición de campos estructurados
  Modal.tsx         Diálogo con teclado y gestión del foco
  domain.ts         Esquemas, CRUD, comparaciones y orden temporal
  storage.ts        Lectura, validación y escritura local
  demo.ts           Universo ficticio original
  styles.css        Diseño responsive e ilustraciones originales
  domain.test.ts    Pruebas del motor, fechas y almacenamiento
  App.test.tsx      Pruebas de interacción con DOM simulado
```

## Alcance pendiente

Fuera de este MVP: múltiples universos, colaboración, backend, autenticación, calendarios personalizados, reglas con vigencia temporal o múltiples condiciones, análisis de prosa, comparaciones numéricas y recuperación automática. La interpretación literaria siempre corresponde al escritor.

Consulta `VERIFICACION.md` para distinguir las comprobaciones ejecutadas de las limitaciones de verificación.
