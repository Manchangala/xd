# Guía rápida de demo — CurriculaPath

Esta guía ayuda a mostrar CurriculaPath como un producto navegable de punta a punta, no solo como un conjunto de pantallas.

## Antes de abrir la demo

Con la aplicación detenida, deja todo limpio:

```bash
npm run doctor
npm run demo:prepare
```

Luego levanta frontend + backend:

```bash
npm run dev:stack
```

Y valida que la demo esté sana:

```bash
npm run demo:check
```

Si el chequeo OCR sale como pendiente, la demo sigue funcionando para PDFs con texto nativo; solo los PDFs escaneados requieren la configuración adicional descrita en `docs/OCR_WINDOWS.md`.

## 1. Entrar como estudiante

Usa:

- Email: `estudiante@curriculapath.edu`
- Contraseña: `demo123`

Recorrido sugerido:

1. **Dashboard**: mostrar avance, créditos, alertas y materias disponibles.
2. **Malla curricular**: seleccionar `INF102 Programación II`, revisar prerrequisitos y dependientes.
3. **Simulación**: simular pérdida de `Programación II` y explicar el impacto directo/indirecto.
4. **Rutas alternativas**: abrir la ruta acelerada, balanceada y pausada.
5. **Comparar escenarios**: contrastar dos escenarios y mostrar la recomendación calculada.
6. **Doble programa**: explicar materias compartidas y efecto transversal.
7. **Chat académico**: usar las preguntas rápidas para mostrar RAG real fundamentado en malla, historial, escenarios y documentos procesados.

Frases útiles al explicar:

- “La interfaz no se rehizo al pasar del mock al backend; la capa de servicios ya estaba preparada.”
- “La simulación no es solo visual: ya calcula bloqueos directos e indirectos desde el grafo.”
- “El chat recupera contexto del programa principal del estudiante y luego responde con datos académicos reales.”

## 2. Entrar como administrador

Usa:

- Email: `admin@curriculapath.edu`
- Contraseña: `demo123`

Recorrido sugerido:

1. **Administración**:
   - crear un programa,
   - editar una materia,
   - crear una versión,
   - activar/desactivar una versión,
   - crear o eliminar una dependencia.
2. **Carga PDF**:
   - subir un PDF,
   - ejecutar el pipeline,
   - revisar el diagnóstico visible de OCR local,
   - explicar el diagnóstico del documento procesado,
   - abrir `Corregir`,
   - editar materias o dependencias,
   - aprobar manualmente,
   - guardar grafo en la versión de malla seleccionada.

Si quieres mostrar la robustez del flujo, explica que el guardado ya rechaza:

- materias sin código,
- códigos duplicados,
- dependencias inválidas,
- ciclos de prerrequisitos.

### Archivos PDF de prueba

Ahora el flujo ya usa el contenido real del PDF:

- `docs/demo-assets/malla_sistemas_texto_demo.pdf`: detecta materias y dependencias.
- `docs/demo-assets/malla_vacia_demo.pdf`: muestra el flujo de error/revisión porque no hay contenido que convertir a grafo.
- `docs/demo-assets/malla_sistemas_escaneada_demo.pdf`: sirve para demostrar el caso OCR; requiere tener OCR local instalado para extraer texto desde la imagen. La pantalla muestra si el motor está listo, si falta el idioma español y qué corregir.

Si procesas primero el PDF escaneado sin OCR disponible, luego puedes configurar OCR, pulsar **Actualizar diagnóstico** y usar **Reintentar OCR** sin volver a subir el archivo.

## 3. Entrar como asesor

Usa:

- Email: `asesor@curriculapath.edu`
- Contraseña: `demo123`

Recorrido sugerido:

1. Buscar un estudiante.
2. Mostrar progreso solo lectura.
3. Revisar simulaciones guardadas.
4. Mostrar materias disponibles y notas de asesoría.

## 4. Mensaje clave para sustentar

> “CurriculaPath ya funciona como un sistema fullstack demostrable: el estudiante explora su malla como grafo, simula impactos académicos, compara rutas, procesa PDFs de malla y consulta un chat RAG preparado para LLM local.”

## 5. Si algo se ensucia durante la práctica

- Si guardaste escenarios, cambiaste datos administrativos o probaste el chat muchas veces, detén la app y ejecuta `npm run demo:reset`.
- Si quieres confirmar el estado antes de presentar, ejecuta `npm run demo:check`.
- Si el OCR de imágenes no está listo, presenta primero el flujo con un PDF que ya tenga texto y muestra que el diagnóstico y el reintento OCR ya están implementados sin depender de servicios cloud.
