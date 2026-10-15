# Verificación ejecutada

Fecha: 13 de octubre de 2026. Entorno: Windows, Node 24.19.0, pnpm 11.25.0.

## Resultados

- **21 pruebas aprobadas** con Vitest 3.2.7: 16 pruebas del dominio/almacenamiento y 5 flujos de interfaz con React Testing Library y jsdom. Última ejecución funcional: 2 archivos aprobados, 21/21 pruebas, 16,08 s.
- `node node_modules/typescript/bin/tsc -b`: salida 0, sin errores, después del formateo final.
- `node node_modules/vite/bin/vite.js build`: salida 0. Compilación final completada en 5,84 s; generó `dist/`.
- El servidor local respondió HTTP **200** en `http://127.0.0.1:5173/`.
- Se abrió la aplicación real en el navegador integrado y se inspeccionaron la vista general, archivo, formulario y Prueba de Canon.
- Se revisó la presentación de escritorio y una configuración móvil de 390 × 844. En la vista móvil de alertas y archivo el ancho del documento fue 375 px frente a una ventana de 390 px: no se observó desbordamiento horizontal. Esto no equivale a una prueba en un teléfono físico.
- En el navegador real se marcó la contradicción de demostración como **Resuelta**, se recargó y se verificó el texto «Decisión humana: Resuelta». Después se devolvió a **Pendiente** para dejar la demostración lista.

## Funciones cubiertas por las pruebas

- Crear, consultar, buscar, editar y eliminar un personaje; cancelar y confirmar eliminación.
- Crear reglas y acontecimientos propios, editar sus valores y eliminar ambos desde la interfaz.
- Etiquetas/origen, filtro por origen y estado vacío.
- Contradicción explícita respaldada por regla y acontecimiento; compatibilidad sin alerta.
- No deducir contradicciones por palabras en la descripción.
- Sujetos específicos y universales, igualdad y desigualdad.
- Condición presente y verdadera, falsa o ausente.
- Información insuficiente cuando falta una propiedad.
- Orden por fecha narrativa, aunque difiera del orden de inserción; visualización de un nuevo evento anterior al resto.
- Fechas imposibles, años antiguos y años bisiestos.
- Validación de claves, propiedades duplicadas, identificadores duplicados y referencias inexistentes.
- Protección de personajes vinculados ante eliminación.
- Persistencia de registros y los cuatro estados humanos al serializar/leer.
- Persistencia de una decisión al desmontar/montar la interfaz.
- Revisión nueva al modificar evidencia, conservando identidad tras reordenar claves o validar el esquema.
- Manejo de archivos almacenados dañados sin sobrescribirlos.
- Errores simulados de cuota y acceso a almacenamiento.

## Fallos encontrados y corregidos

La primera prueba de recarga encontró que la identidad de una alerta dependía del orden de las claves JSON. La validación del almacenamiento reordenaba esas claves y la decisión reaparecía como pendiente. Se corrigió con una representación explícita, estable y ordenada de la evidencia, y se añadió una prueba de regresión. La prueba de interfaz y la recarga real pasaron después.

La primera compilación de Vite fue bloqueada por permisos al iniciar esbuild. La compilación y las pruebas se ejecutaron después con los permisos concedidos. pnpm inicialmente informó de scripts de esbuild pendientes; se declaró su autorización en `pnpm-workspace.yaml`, se completó la instalación y se verificó la compilación final.

## Sin verificar / pendiente

- El recorrido completo de descarga y posterior selección de un respaldo JSON en un navegador real: el intento de esperar el evento de descarga agotó el tiempo de la herramienta. La exportación/importación está implementada, pero no se afirma que ese recorrido haya pasado una prueba de extremo a extremo. Antes de usar datos importantes, exportar, revisar el JSON e importarlo en otro origen de prueba.
- No se probaron Safari, Firefox, teléfonos físicos, lectores de pantalla ni una auditoría formal de contraste/accesibilidad.
- Los errores de cuota y permisos se simularon: no se llenó el almacenamiento real ni se probaron todas las políticas de modo privado.
- No se hizo prueba de carga con miles de registros, conflictos de escritura simultánea ni despliegue público.

El núcleo solicitado está implementado. Multiversos, colaboración, calendarios inventados, reglas temporales, comparaciones numéricas, sincronización y PWA quedan fuera del alcance de este MVP.
