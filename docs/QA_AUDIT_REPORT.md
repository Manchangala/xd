# CurriculaPath — Informe de QA funcional y visual

Fecha de revisión: 16 de mayo de 2026

## Objetivo

Revisar CurriculaPath desde la perspectiva de usuario final y diseñador de producto: navegación, páginas, botones, formularios, permisos por rol, estados visuales, responsive, PDF/OCR, chat RAG y recorridos principales de estudiante, administrador y asesor.

## Alcance revisado

### Público

- Login.
- Registro de estudiante.
- Recuperación de contraseña.
- Página 404 pública.

### Estudiante

- Dashboard.
- Perfil académico.
- Malla curricular interactiva.
- Simulación.
- Rutas alternativas.
- Comparación de escenarios.
- Doble programa.
- Chat académico con RAG.
- Configuración.
- Página 404 autenticada.
- Menú móvil.

### Administrador

- Panel de administración.
- Gestión de usuarios.
- Gestión de programas.
- Gestión de materias.
- Diagnóstico OCR.
- Carga y procesamiento de PDF.
- Corrección manual de detecciones PDF.
- Aprobación y guardado de grafo.
- Configuración.
- Página 404 admin.

### Asesor

- Panel de asesoría.
- Búsqueda de estudiantes.
- Vista de progreso.
- Simulaciones guardadas.
- Malla solo lectura.
- Acceso restringido a administración.
- Configuración.
- Página 404 asesor.

## Validación visual

Se generaron capturas automáticas en escritorio y móvil para 48 vistas.

Ubicación:

```text
qa-artifacts/visual-qa
```

Mosaicos generados:

```text
qa-artifacts/visual-qa/contact-sheets/desktop-contact-sheet.png
qa-artifacts/visual-qa/contact-sheets/mobile-contact-sheet.png
```

Resultado del barrido visual:

- 48 vistas revisadas.
- 0 errores de consola detectados.
- 0 errores de carga detectados.
- 0 textos sospechosos tipo `undefined`, `NaN`, `Cannot read`, `No se pudo cargar` inesperado.
- 0 desbordes horizontales luego de la corrección aplicada.

## Hallazgos corregidos

### 1. Desborde horizontal en móvil en Perfil Académico

Problema:

- En `/perfil`, vista móvil, las tarjetas podían superar el ancho de pantalla por comportamiento de CSS Grid y contenido interno.

Corrección:

- Se ajustó el componente base `Card` para permitir reducción de ancho con `min-w-0`.

Archivo corregido:

```text
src/components/ui/card.tsx
```

Resultado:

- `/perfil` móvil ya no genera scroll horizontal.

### 2. Chat académico limpiaba el input en una condición de carrera

Problema:

- Si el usuario pulsaba una pregunta rápida y escribía otra pregunta antes de que terminara la primera respuesta, el input podía limpiarse al llegar la respuesta anterior.

Corrección:

- El input ahora solo se limpia si el mensaje actual sigue siendo el mismo que se envió.

Archivo corregido:

```text
src/features/ai-chat/pages/ChatPage.tsx
```

Resultado:

- El usuario puede seguir escribiendo mientras una respuesta previa termina sin perder su texto.

### 3. Chat intentaba usar endpoint LLM local aunque no estuviera conectado

Problema:

- En modo API, el frontend podía enviar endpoint/modelo local aunque la configuración indicara que el LLM no estaba conectado.

Corrección:

- Solo se envía endpoint/modelo si `llmConnected` está activo. Si no, usa fallback controlado del backend.

Archivo corregido:

```text
src/features/ai-chat/services/aiChatService.ts
```

Resultado:

- El chat no se bloquea intentando contactar un LLM local inexistente.

### 4. PDF escaneado sin OCR ya no inventa materias

Verificación:

- Se probó un PDF tipo captura/escaneado.
- La app no inventó materias MAT101/INF101.
- Mostró diagnóstico claro de OCR no disponible.
- Bloqueó aprobar/guardar grafo.

Resultado:

- El comportamiento es honesto: si no puede leer el PDF real, no simula detecciones falsas.

## Pruebas funcionales ejecutadas

Comando final:

```bash
npm run delivery:verify
```

Resultado:

- Build frontend: aprobado.
- Lint frontend: aprobado.
- Pruebas unitarias frontend: 7/7 aprobadas.
- Pruebas backend: 30/30 aprobadas.
- Recorridos E2E: 17/17 aprobados.

## Recorridos E2E cubiertos

- Registro de estudiante nuevo.
- Dashboard coherente para usuario recién creado.
- Registro con doble programa.
- Vista integrada de doble titulación.
- Dashboard, malla, simulación, rutas y comparación.
- Edición de perfil e historial académico.
- Chat RAG con preguntas rápidas y pregunta escrita.
- Recuperación de contraseña.
- Login con contraseña nueva.
- Navegación móvil.
- Simulación de pérdida.
- Simulación de cancelación.
- Simulación de aplazamiento.
- Limpiar simulación.
- Admin crea usuario.
- Admin ve detalle de usuario.
- Admin desactiva usuario.
- Admin reinicia clave.
- Admin crea programa.
- Admin ve detalle de programa.
- Admin edita programa.
- Admin desactiva programa.
- Admin crea materia.
- Admin ve detalle de materia.
- Admin edita materia.
- PDF escaneado sin OCR no inventa resultados.
- PDF con texto real detecta materias.
- Corrección manual de PDF.
- Aprobación y guardado de grafo PDF.
- Asesor busca estudiantes.
- Asesor ve progreso, escenarios y malla solo lectura.
- Acceso restringido a administración para asesor.
- Configuración y diagnóstico LLM local.
- Página 404 por rol.

## Estado honesto final

La aplicación quedó mucho más cubierta que antes. Los recorridos principales funcionan y la revisión automática visual no detecta errores en las rutas principales.

Aun así, ningún software puede declararse “imposible de romper”. Lo correcto es decir:

- Está lista para una demo seria.
- Los flujos principales están verificados.
- Hay pruebas automatizadas para evitar regresiones.
- El flujo manual de QA queda documentado para repetir la revisión antes de entregar.

## Archivos principales modificados durante esta auditoría

```text
docs/QA_DESIGNER_FLOW.md
docs/QA_AUDIT_REPORT.md
src/components/ui/card.tsx
src/features/ai-chat/pages/ChatPage.tsx
src/features/ai-chat/services/aiChatService.ts
e2e/full-user-journeys.spec.ts
e2e/pdf-ingestion.spec.ts
```
