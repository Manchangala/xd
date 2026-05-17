# CurriculaPath — Flujo manual de QA para diseñador

Este documento sirve para probar CurriculaPath como si fueras un usuario real y también como diseñador revisando consistencia visual, navegación, estados y comportamiento. La idea no es solo confirmar que la app abre, sino validar que cada pantalla se sienta terminada, clara y sin botones muertos.

## 1. Preparación antes de probar

### 1.1 Abrir el proyecto

Desde Git Bash, ubícate en la carpeta del proyecto:

```bash
cd /c/Users/GABITO/Documents/Codex/2026-05-15/files-mentioned-by-the-user-curriculapath
```

Si estás usando la copia del escritorio:

```bash
cd "/c/Users/GABITO/OneDrive/Escritorio/Front End/files-mentioned-by-the-user-curriculapath"
```

### 1.2 Instalar dependencias

```bash
npm install
```

### 1.3 Ejecutar aplicación completa

Para probar frontend + backend local:

```bash
npm run dev:stack
```

Luego abre:

```text
http://127.0.0.1:5173/login
```

### 1.4 Credenciales demo

En la pantalla de login puedes usar el selector de rol. Las credenciales visibles son:

- Estudiante: `estudiante@curriculapath.edu` / `demo123`
- Administrador: `admin@curriculapath.edu` / `demo123`
- Asesor: `asesor@curriculapath.edu` / `demo123`

## 2. Revisión global de diseño

En cada pantalla revisa:

- Que no haya textos rotos, caracteres raros o palabras cortadas.
- Que no aparezcan mensajes tipo “No se pudo cargar” salvo en errores controlados.
- Que las tarjetas tengan alineación coherente.
- Que los botones importantes sean visibles y tengan respuesta.
- Que los formularios muestren validaciones claras.
- Que los estados de carga, vacío y error sean entendibles.
- Que el menú lateral marque correctamente la sección activa.
- Que el botón “Salir” funcione.
- Que la app sea usable en pantalla grande y pantalla reducida.

## 3. Flujo de estudiante nuevo

### 3.1 Crear cuenta

1. En `/login`, pulsa “Crear cuenta de estudiante”.
2. Cambia nombre, email y código para simular usuario nuevo.
3. Selecciona Ingeniería de Sistemas como programa principal.
4. Deja segundo programa vacío.
5. Pulsa “Crear perfil”.

Resultado esperado:

- Debe redirigir a `/dashboard`.
- El dashboard debe mostrar el nombre nuevo.
- El avance debe ser 0%.
- El promedio debe decir “Sin promedio”.
- Debe existir malla curricular base asignada.
- No debe aparecer promedio inventado.

### 3.2 Cuenta nueva con doble programa

1. Repite el registro.
2. Selecciona Ingeniería de Sistemas como principal.
3. Selecciona Administración de Empresas como segundo programa.
4. Crea el perfil.
5. Entra a `/doble-programa`.

Resultado esperado:

- Deben verse dos programas.
- Debe mostrar avance independiente.
- Debe mostrar materias compartidas.
- No debe aparecer estado vacío.

## 4. Flujo estudiante existente

### 4.1 Dashboard

Ruta: `/dashboard`

Revisar:

- Cards de avance, promedio, aprobadas, en curso, bloqueadas y graduación.
- Gráfico de avance por semestre.
- Acciones rápidas.
- Alertas académicas.
- Materias disponibles próximo semestre.

Acciones:

- Pulsar “Ver malla”.
- Pulsar “Simular pérdida”.
- Pulsar “Rutas alternativas”.
- Pulsar “Comparar escenarios”.
- Pulsar “Chat académico”.

Resultado esperado:

- Cada acción debe navegar a su pantalla.
- No debe haber botones muertos.

### 4.2 Perfil académico

Ruta: `/perfil`

Acciones:

1. Cambiar carga máxima de créditos.
2. Guardar cambios.
3. Buscar una materia por código, por ejemplo `INF101`.
4. Cambiar su estado a aprobada, en curso, pendiente o bloqueada.

Resultado esperado:

- Debe aparecer notificación de guardado.
- El historial debe actualizarse.
- No debe romper dashboard/malla luego del cambio.

### 4.3 Malla curricular

Ruta: `/malla`

Acciones:

1. Buscar `Programación II`.
2. Filtrar por semestre.
3. Filtrar por estado.
4. Seleccionar una materia.
5. Revisar panel lateral.
6. Pulsar “Marcar como aprobada”.
7. Pulsar “Marcar como en curso”.
8. Pulsar “Ver dependencias”.
9. Pulsar “Simular pérdida”.

Resultado esperado:

- El grafo debe verse.
- El nodo seleccionado debe tener detalle.
- Los colores deben corresponder a estados.
- Las dependencias deben aparecer.
- Simular pérdida debe llevar a `/simulacion` con materia seleccionada.

### 4.4 Simulación

Ruta: `/simulacion`

Acciones:

1. Elegir materia.
2. Elegir evento: pérdida, cancelación o aplazamiento.
3. Ejecutar simulación.
4. Revisar vista antes/después.
5. Revisar materias bloqueadas directas e indirectas.
6. Guardar escenario.
7. Limpiar simulación.

Resultado esperado:

- Debe mostrar impacto en cascada.
- Debe mostrar rutas sugeridas.
- Guardar escenario debe confirmar.
- Limpiar debe restaurar la pantalla.

### 4.5 Rutas alternativas

Ruta: `/rutas`

Acciones:

1. Revisar ruta acelerada.
2. Revisar ruta balanceada.
3. Revisar ruta pausada.
4. Pulsar “Aplicar ruta”.
5. Pulsar “Comparar”.

Resultado esperado:

- Debe mostrar timeline.
- Debe mostrar carga/dificultad/duración.
- Comparar debe llevar a `/comparar`.

### 4.6 Comparar escenarios

Ruta: `/comparar`

Acciones:

1. Cambiar escenario A.
2. Cambiar escenario B.
3. Revisar tabla.
4. Revisar gráfico.
5. Pulsar “Elegir mejor escenario”.

Resultado esperado:

- Debe resaltar diferencias.
- Debe mostrar confirmación de selección.

### 4.7 Chat académico

Ruta: `/chat`

Acciones:

1. Pulsar cada pregunta rápida.
2. Escribir una pregunta propia.
3. Enviar.
4. Revisar respuesta.
5. Revisar contexto RAG.
6. Revisar fuentes.

Preguntas sugeridas:

- ¿Qué materias puedo cursar el próximo semestre?
- ¿Qué pasa si pierdo Cálculo II?
- ¿Cuántos créditos me faltan?
- ¿Puedo tomar Bases de Datos?
- ¿Cuál ruta me conviene?

Resultado esperado:

- Debe responder sin bloquear el input.
- Debe mostrar contexto recuperado.
- Debe aclarar que usa datos académicos.
- No debe fingir IA real si está usando fallback/mock.

## 5. Flujo administrador

### 5.1 Panel admin

Ruta: `/admin`

Revisar:

- Resumen de estudiantes, programas, materias y completitud.
- Tabs o secciones de gestión.
- Actividad reciente.

Acciones:

1. Crear usuario.
2. Crear programa.
3. Crear materia.
4. Revisar acciones de editar/desactivar/ver detalle si existen.

Resultado esperado:

- Cada creación debe confirmarse.
- La tabla debe actualizarse.
- No debe aparecer información duplicada de forma confusa.

### 5.2 Carga PDF / OCR / grafo

Ruta: `/admin/cargar-pdf`

Acciones:

1. Subir un PDF escaneado o captura.
2. Pulsar “Procesar PDF”.
3. Revisar diagnóstico.
4. Verificar que no invente materias si no puede leer el PDF.
5. Subir un PDF con texto real.
6. Procesar.
7. Revisar materias detectadas.
8. Revisar dependencias detectadas.
9. Pulsar “Aprobar”.
10. Pulsar “Guardar grafo”.

Resultado esperado:

- PDF escaneado sin OCR: debe mostrar error/diagnóstico claro y bloquear guardar.
- PDF con texto real: debe detectar materias y permitir guardar.
- Debe quedar claro qué es procesamiento real y qué depende de OCR local/backend.

## 6. Flujo asesor

Ruta: `/asesor`

Acciones:

1. Login como asesor.
2. Buscar estudiante por nombre.
3. Buscar estudiante por código.
4. Abrir estudiante.
5. Revisar progreso.
6. Revisar simulaciones guardadas.
7. Revisar malla solo lectura.

Resultado esperado:

- No debe permitir editar como asesor.
- Debe mostrar información útil para asesoría.
- Si no hay coincidencias, debe mostrar estado vacío claro.

## 7. Configuración

Ruta: `/configuracion`

Acciones:

1. Cambiar tema si está disponible.
2. Cambiar URL base API.
3. Cambiar proveedor/modelo LLM local.
4. Probar conexión.
5. Guardar configuración.

Resultado esperado:

- Debe guardar preferencias.
- Si el LLM local no existe, debe explicar que no hay servidor disponible.
- No debe romper el chat.

## 8. Seguridad visual por rol

Verifica:

- Estudiante no ve administración.
- Admin ve administración y carga PDF.
- Asesor no puede entrar a admin.
- Ruta inexistente muestra 404.
- Botón de volver en 404 lleva a una ruta válida según rol.

## 9. Revisión responsive

Probar al menos:

- Escritorio grande.
- Laptop mediana.
- Móvil o ancho reducido.

Revisar:

- Sidebar o navegación móvil.
- Tarjetas apiladas correctamente.
- Tablas con scroll si hace falta.
- Grafo usable o al menos visible.
- No hay textos montados sobre otros.

## 10. Lista de errores a reportar

Para cada error encontrado, registrar:

- Página.
- Rol.
- Paso exacto.
- Qué se esperaba.
- Qué pasó.
- Captura si aplica.
- Prioridad: alta, media o baja.

## 11. Criterio final

La app está lista para demo cuando:

- Todas las rutas principales abren.
- Los flujos principales se pueden completar.
- No hay pantallas vacías inesperadas.
- Los mensajes de error son claros.
- Los botones visibles hacen algo.
- La carga PDF no inventa información.
- El chat no se bloquea.
- El diseño es consistente y presentable.
