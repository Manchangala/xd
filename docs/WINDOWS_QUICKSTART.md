# Inicio rápido en Windows — CurriculaPath

Esta guía evita los dos tropiezos más comunes en Windows:

1. PowerShell bloquea `npm.ps1`.
2. Git Bash usa rutas distintas a `C:\...`.

## Opción más simple

Desde el Explorador de archivos, abre la carpeta del proyecto y haz doble clic en:

- `REVISAR_ENTORNO.cmd`
- `INICIAR_DEMO.cmd`

El primero revisa dependencias, entorno backend, OCR local, PDFs de demo y puertos. El segundo:

1. limpia la demo,
2. genera los PDFs de prueba,
3. levanta frontend y backend.

Cuando termine de arrancar, abre:

```text
http://127.0.0.1:5173
```

Para revisar si todo quedó listo, haz doble clic en:

- `VERIFICAR_DEMO.cmd`

Para revisar si el proyecto completo está listo para entregar, haz doble clic en:

- `ENTREGA_LISTA.cmd`

Para generar un ZIP limpio listo para compartir, haz doble clic en:

- `EMPAQUETAR_ENTREGA.cmd`

## Si prefieres terminal

### PowerShell

Usa `npm.cmd`, no `npm`:

```powershell
cd "C:\Users\GABITO\Documents\Codex\2026-05-15\files-mentioned-by-the-user-curriculapath"
npm.cmd install
npm.cmd run dev
```

Para la demo completa:

```powershell
npm.cmd run doctor
npm.cmd run demo:prepare
npm.cmd run dev:stack
```

### Git Bash

Usa rutas tipo Unix y comillas si hay espacios:

```bash
cd "/c/Users/GABITO/Documents/Codex/2026-05-15/files-mentioned-by-the-user-curriculapath"
npm install
npm run dev
```

## Si la demo no abre

1. Confirma que exista `package.json` en la carpeta actual.
2. Si usas PowerShell, prueba `npm.cmd` en lugar de `npm`.
3. Si usas Git Bash, no escribas `C:\...`; usa `/c/...`.
4. Ejecuta `npm.cmd run doctor` para ver si falta entorno backend, dependencias, OCR o PDFs de demo.
5. Ejecuta `VERIFICAR_DEMO.cmd` o `npm.cmd run demo:check`.

## Nota

Los scripts `.cmd` no reemplazan la instalación inicial:

```powershell
npm.cmd install
```

Y el backend necesita haber sido preparado una vez siguiendo `backend/README.md`.
