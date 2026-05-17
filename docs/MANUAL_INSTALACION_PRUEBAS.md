# Manual de instalación y pruebas — CurriculaPath

Este manual explica cómo montar CurriculaPath en un PC Windows y qué pruebas ejecutar para confirmar que todo funciona.

## 1. Requisitos previos

Instala o confirma que existan:

- **Node.js LTS o superior** con npm.
- **Python 3.11+**. El proyecto fue probado con Python 3.13.
- **Git Bash** o PowerShell.
- Navegador moderno: Edge, Chrome o Firefox.
- Opcional para OCR de PDFs escaneados: **Tesseract OCR**.
- Opcional para IA local real: **Ollama**, **LM Studio** o servidor local compatible con OpenAI.

> Nota: OCR y LLM local no son obligatorios para que el sistema funcione. Si no están instalados, CurriculaPath muestra diagnóstico y usa fallback controlado.

## 2. Ubicación del proyecto

Si estás usando la carpeta actual del proyecto:

```text
C:\Users\GABITO\Documents\Codex\2026-05-15\files-mentioned-by-the-user-curriculapath
```

En **PowerShell**:

```powershell
cd "C:\Users\GABITO\Documents\Codex\2026-05-15\files-mentioned-by-the-user-curriculapath"
```

En **Git Bash**:

```bash
cd "/c/Users/GABITO/Documents/Codex/2026-05-15/files-mentioned-by-the-user-curriculapath"
```

Si vas a usar el ZIP de entrega, descomprímelo primero y entra a la carpeta `CurriculaPath_entrega`.

## 3. Instalación desde cero

### 3.1 Instalar dependencias del frontend

En PowerShell:

```powershell
npm.cmd install
```

En Git Bash:

```bash
npm install
```

Si PowerShell muestra un error sobre `npm.ps1` o políticas de ejecución, usa siempre `npm.cmd`.

### 3.2 Crear entorno del backend

En PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

En Git Bash:

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
cd ..
```

### 3.3 Preparar base de datos y datos demo

Desde la raíz del proyecto:

```powershell
npm.cmd run demo:prepare
```

O en Git Bash:

```bash
npm run demo:prepare
```

Este comando restaura datos semilla y genera PDFs de prueba.

## 4. Arranque del proyecto

La forma recomendada es levantar frontend y backend juntos.

En PowerShell:

```powershell
npm.cmd run dev:stack
```

En Git Bash:

```bash
npm run dev:stack
```

Luego abre:

```text
http://127.0.0.1:5173
```

La API queda en:

```text
http://127.0.0.1:8000
```

## 5. Credenciales de prueba

| Rol | Email | Contraseña |
| --- | --- | --- |
| Estudiante | `estudiante@curriculapath.edu` | `demo123` |
| Administrador | `admin@curriculapath.edu` | `demo123` |
| Asesor | `asesor@curriculapath.edu` | `demo123` |

## 6. Pruebas rápidas para saber si todo abre

En otra terminal, con `dev:stack` corriendo:

```powershell
npm.cmd run doctor
npm.cmd run demo:check
```

En Git Bash:

```bash
npm run doctor
npm run demo:check
```

Resultado esperado:

- Frontend disponible.
- Backend saludable.
- Login estudiante OK.
- Login administrador OK.
- Login asesor OK.
- Diagnóstico OCR accesible.

Si OCR aparece como pendiente por Tesseract, no es un fallo crítico. Solo significa que los PDFs escaneados como imagen necesitan instalar OCR local.

## 7. Prueba completa automatizada

Ejecuta:

```powershell
npm.cmd run delivery:verify
```

O en Git Bash:

```bash
npm run delivery:verify
```

Este comando ejecuta:

1. Build del frontend.
2. Lint del frontend.
3. Tests unitarios del frontend.
4. Tests del backend.
5. Recorridos end-to-end con navegador.

Resultado esperado:

- Frontend build OK.
- Lint OK.
- Tests frontend: 4/4.
- Tests backend: 29/29.
- E2E: 6/6.

## 8. Pruebas manuales recomendadas

### 8.1 Estudiante

Entra como estudiante y revisa:

1. `/dashboard`
   - Ver progreso, créditos, promedio, alertas y materias disponibles.
2. `/malla`
   - Ver grafo.
   - Seleccionar Programación II.
   - Confirmar detalle, prerrequisitos y dependientes.
3. `/simulacion`
   - Seleccionar Programación II.
   - Ejecutar simulación de pérdida.
   - Confirmar materias bloqueadas directas e indirectas.
4. `/rutas`
   - Revisar ruta acelerada, balanceada y pausada.
5. `/comparar`
   - Comparar dos escenarios.
6. `/doble-programa`
   - Revisar avance por programa y materias compartidas.
7. `/chat`
   - Preguntar: `¿Cuántos créditos me faltan?`
   - Preguntar: `¿Qué pasa si pierdo Programación II?`
   - Confirmar que aparece contexto recuperado por RAG.

### 8.2 Administrador

Entra como administrador y revisa:

1. `/admin`
   - Ver resumen.
   - Ver estado sistema.
   - Ver actividad reciente.
   - Crear/editar usuario, programa, materia o versión.
2. `/admin/cargar-pdf`
   - Subir `docs/demo-assets/malla_sistemas_texto_demo.pdf`.
   - Procesar PDF.
   - Revisar texto extraído.
   - Revisar materias detectadas.
   - Revisar dependencias detectadas.
   - Aprobar y guardar grafo.
3. Probar archivo inválido.
   - Subir algo que no sea PDF.
   - Debe rechazarlo.

### 8.3 Asesor académico

Entra como asesor y revisa:

1. `/asesor`
   - Buscar `María`.
   - Abrir estudiante.
   - Ver progreso solo lectura.
   - Revisar escenarios guardados y notas.

### 8.4 Configuración

Entra a `/configuracion`:

1. Cambia tema claro/oscuro.
2. Revisa fuente de datos `API real`.
3. Prueba conexión LLM local.
4. Si no tienes Ollama/LM Studio activo, debe decir `servidor no visible` sin romper la pantalla.

## 9. Pruebas OCR

Archivos incluidos:

```text
docs/demo-assets/malla_sistemas_texto_demo.pdf
docs/demo-assets/malla_sistemas_escaneada_demo.pdf
docs/demo-assets/malla_vacia_demo.pdf
```

Pruebas:

1. PDF con texto:
   - Debe extraer materias y dependencias.
2. PDF vacío:
   - Debe mostrar error/revisión manual.
3. PDF escaneado:
   - Si Tesseract no está instalado, debe mostrar diagnóstico de OCR pendiente.
   - Si Tesseract está instalado con idioma español, debe intentar OCR real.

## 10. Pruebas LLM local

### Con Ollama

1. Instala Ollama.
2. Ejecuta un modelo, por ejemplo:

```bash
ollama run gemma3
```

3. En `/configuracion` usa:

```text
Endpoint: http://localhost:11434
Modelo: Gemma
```

4. Pulsa **Probar conexión**.

Resultado esperado:

- Servidor visible.
- Modelo resuelto.
- Estado conectado.

### Con LM Studio o servidor OpenAI-compatible

1. Inicia el servidor local de LM Studio.
2. Usa el endpoint local correspondiente, normalmente algo como:

```text
http://localhost:1234
```

3. En `/configuracion`, selecciona:

```text
Proveedor: LM Studio / OpenAI compatible
Modelo: Otro
```

Resultado esperado:

- CurriculaPath detecta `/v1/models`.
- Usa el primer modelo disponible si seleccionas `Otro`.

## 11. Pruebas de seguridad y permisos

Estas ya están cubiertas por pruebas automáticas, pero puedes validarlas manualmente:

1. Entrar como estudiante e intentar abrir `/admin`.
   - Debe bloquear o redirigir.
2. Entrar como asesor.
   - Debe mostrar asesoría, no administración.
3. Cerrar sesión.
   - Las rutas protegidas deben pedir login.
4. Usar contraseña incorrecta.
   - Login debe fallar.

## 12. Empaquetar entrega

Para generar carpeta y ZIP limpios:

```powershell
npm.cmd run delivery:bundle
```

El resultado queda en:

```text
release/CurriculaPath_entrega/
release/CurriculaPath_entrega.zip
```

El paquete excluye:

- `node_modules`
- `dist`
- `backend/.venv`
- bases locales
- storage de documentos
- reportes de pruebas

## 13. Problemas comunes

### `npm.ps1 no se puede cargar`

Usa:

```powershell
npm.cmd install
npm.cmd run dev:stack
```

### `Could not read package.json`

Estás en la carpeta equivocada. Debes estar en la raíz del proyecto, donde existe `package.json`.

### En Git Bash no funciona `cd C:\...`

Usa ruta Unix:

```bash
cd "/c/Users/GABITO/Documents/Codex/2026-05-15/files-mentioned-by-the-user-curriculapath"
```

### El puerto 8000 o 5173 está ocupado

Cierra terminales anteriores o reinicia el equipo. Luego vuelve a ejecutar:

```powershell
npm.cmd run dev:stack
```

### OCR pendiente

No bloquea el sistema. Solo instala Tesseract si necesitas procesar PDFs escaneados como imagen.

### LLM local no conectado

No bloquea el sistema. El chat usa fallback controlado. Para generación real, enciende Ollama o LM Studio y prueba conexión desde `/configuracion`.

## 14. Orden recomendado antes de presentar

```powershell
npm.cmd run doctor
npm.cmd run demo:prepare
npm.cmd run dev:stack
```

En otra terminal:

```powershell
npm.cmd run demo:check
npm.cmd run delivery:verify
```

Si todo pasa, el proyecto está listo para demo.
