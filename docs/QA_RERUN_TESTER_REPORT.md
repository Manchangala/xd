# CurriculaPath — Rerun QA como tester de aplicaciones

Fecha local: 16 de mayo de 2026

## Objetivo de esta ronda

Se volvió a probar la aplicación con mentalidad de tester funcional y de diseñador: no solo verificar que compile, sino recorrer pantallas, botones, formularios, permisos, estados vacíos, errores esperados, PDF/OCR, chat/RAG, responsive y consola.

## Resultado ejecutivo

Estado al cierre de esta ronda: **aprobado para demo funcional**.

La verificación final quedó limpia:

- Build frontend: **OK**.
- Lint frontend: **OK**.
- Unit tests frontend: **7/7 OK**.
- Backend tests: **30/30 OK**.
- End-to-end tests: **21/21 OK**.
- Auditoría exploratoria botón por botón: **OK**.
- Barrido visual/responsive: **46 capturas, 0 issues**.

Comando final ejecutado:

```bash
npm run delivery:verify
```

Resultado: `✓ Verificación de entrega completada.`

## Flujos probados como usuario

### Público / acceso

- Login por rol: estudiante, administrador y asesor.
- Registro de estudiante nuevo.
- Registro con doble programa.
- Recuperación de contraseña.
- Validaciones de email inválido, contraseña corta y credenciales incorrectas.
- Fallback cuando la API configurada no responde: el registro cae a datos locales y no queda bloqueado.

### Estudiante

- Dashboard inicial de cuenta recién creada.
- Dashboard después de aprobar una materia.
- Accesos rápidos del dashboard.
- Perfil académico.
- Edición de carga máxima de créditos.
- Validación de segundo programa igual al principal.
- Edición del historial académico.
- Malla curricular.
- Filtros por búsqueda, semestre y estado.
- Detalle de materia.
- Marcar materia en curso.
- Ver dependencias.
- Enviar materia a simulación.
- Simulación de pérdida.
- Simulación de cancelación.
- Simulación de aplazamiento.
- Limpiar simulación.
- Guardar escenarios.
- Rutas alternativas.
- Timeline de rutas.
- Aplicar ruta mock.
- Comparar escenarios.
- Elegir mejor escenario.
- Doble programa.
- Materias compartidas.
- Chat académico con preguntas rápidas.
- Chat académico con pregunta escrita.
- Panel de contexto RAG.
- Configuración.
- Prueba de conexión LLM local mock.
- Página 404.
- Cierre de sesión.

### Administrador

- Panel de administración.
- Diagnóstico operativo.
- Gestión de usuarios.
- Reset de clave.
- Crear programa.
- Validar programa duplicado.
- Ver detalle de programa.
- Editar programa.
- Desactivar programa.
- Gestión de materias.
- Validar materia duplicada.
- Gestión de versiones de malla.
- Protección contra dejar un programa sin versión activa.
- Gestión de dependencias.
- Bloqueo de dependencia autorreferenciada.
- Carga PDF/OCR.
- Rechazo de archivo no PDF.
- PDF vacío o sin texto: no inventa materias y bloquea guardado.
- PDF con texto: detecta materias, dependencias y muestra grafo previo.
- Modo corrección de materias detectadas.
- Validación de materia sin código.
- Bloqueo de Aprobar/Guardar cuando hay errores de validación.

### Asesor

- Panel del asesor.
- Búsqueda de estudiante.
- Selección de estudiante.
- Vista de progreso.
- Simulaciones guardadas.
- Malla solo lectura.
- Restricción correcta de pantallas no permitidas.

### Responsive / móvil

- Menú móvil abre y navega.
- Rutas principales cargan en viewport móvil.
- No se detectaron desbordes horizontales relevantes.
- No se detectaron pantallas vacías.

## Hallazgos reales corregidos en esta ronda

### 1. Accesibilidad en recuperación de contraseña

La página funcionaba visualmente, pero los campos no estaban asociados formalmente a sus labels. Se corrigió agregando ids y `htmlFor` en:

```text
src/features/auth/pages/RecoverPasswordPage.tsx
```

Campos corregidos:

- Email.
- Código.
- Nueva contraseña.

### 2. Accesibilidad en perfil académico

La página funcionaba visualmente, pero algunos campos editables no estaban asociados formalmente a sus labels. Se corrigió en:

```text
src/features/profile/pages/ProfilePage.tsx
```

Campos corregidos:

- Semestre actual.
- Carga máxima por semestre.
- Programa principal.
- Segundo programa opcional.

## Falsos positivos detectados y descartados

Durante la auditoría aparecieron falsos positivos de prueba, no bugs de la app:

1. Textos duplicados en toasts: la prueba encontraba título y descripción a la vez.
2. Validaciones HTTP 422/409 intencionales: ocurren cuando se prueba programa duplicado, materia duplicada o datos inválidos. La app los muestra como error controlado.
3. Un `ERR_CONNECTION_RESET` aislado durante un barrido visual; al repetir el flujo de asesor de forma aislada no reapareció.

## Revisión visual/responsive

Se generaron capturas en:

```text
qa-artifacts/tester-final-rerun-visual-qa
```

Reporte JSON:

```text
qa-artifacts/tester-final-rerun-visual-qa/visual-qa-report.json
```

Resultado:

- 46 capturas generadas.
- 0 errores JS de página.
- 0 errores relevantes de consola.
- 0 HTTP 500.
- 0 pantallas vacías.
- 0 pantallas sin encabezado principal.
- 0 desbordes horizontales detectados.

## Nota honesta sobre OCR local

El diagnóstico OCR indica que **Tesseract no está instalado o no está disponible en PATH**. Eso no rompe la aplicación: la pantalla de carga PDF funciona, procesa PDFs con texto y muestra diagnóstico claro. Para OCR real sobre imágenes escaneadas, hay que instalar Tesseract localmente y reiniciar el backend.

## Estado actual

La aplicación queda en estado sólido para revisión funcional:

- Los recorridos principales funcionan.
- Los roles se respetan.
- Los formularios validan.
- Las pantallas no quedan vacías.
- La malla, simulación, rutas, comparación, PDF y chat fueron recorridos.
- Hay evidencia automática y visual de la prueba.

No prometo “cero bugs absolutos” porque ningún software serio se certifica así sin límites, pero sí puedo decir con honestidad: **en los flujos probados como usuario y tester, no quedó ningún error funcional abierto**.
