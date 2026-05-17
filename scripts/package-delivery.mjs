import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { basename, join, resolve } from 'node:path'

const rootDir = process.cwd()
const releaseRoot = resolve(rootDir, 'release')
const bundleName = 'CurriculaPath_entrega'
const bundleDir = resolve(releaseRoot, bundleName)
const zipPath = resolve(releaseRoot, `${bundleName}.zip`)

const includeEntries = [
  '.env.example',
  '.gitignore',
  'backend',
  'docs',
  'e2e',
  'public',
  'scripts',
  'src',
  'EMPAQUETAR_ENTREGA.cmd',
  'ENTREGA_LISTA.cmd',
  'INICIAR_DEMO.cmd',
  'REVISAR_ENTORNO.cmd',
  'VERIFICAR_DEMO.cmd',
  'eslint.config.js',
  'index.html',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'postcss.config.js',
  'README.md',
  'tailwind.config.js',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts',
]

const ignoredSegments = new Set([
  '.venv',
  '.pytest_cache',
  '__pycache__',
  'node_modules',
  'dist',
  'storage',
  'playwright-report',
  'test-results',
  'release',
])

const ignoredFileNames = new Set([
  '.env',
  'curriculapath.db',
  'curriculapath_e2e.db',
])

const shouldCopy = (source) => {
  const relative = source.slice(rootDir.length + 1)
  const segments = relative.split(/[\\/]/)
  return (
    !segments.some((segment) => ignoredSegments.has(segment)) &&
    !ignoredFileNames.has(basename(source))
  )
}

function runPowerShell(script) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { stdio: 'inherit' },
    )
    child.on('error', rejectPromise)
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(`PowerShell terminó con código ${code ?? 'desconocido'}`))
    })
  })
}

await mkdir(releaseRoot, { recursive: true })

if (!bundleDir.startsWith(releaseRoot) || !zipPath.startsWith(releaseRoot)) {
  throw new Error('Ruta de salida fuera de la carpeta release; empaquetado cancelado.')
}

await rm(bundleDir, { recursive: true, force: true })
await rm(zipPath, { force: true })
await mkdir(bundleDir, { recursive: true })

for (const entry of includeEntries) {
  const source = join(rootDir, entry)
  if (!existsSync(source)) continue
  const destination = join(bundleDir, entry)
  await cp(source, destination, {
    recursive: true,
    filter: shouldCopy,
  })
}

if (process.platform === 'win32') {
  await runPowerShell(
    `Compress-Archive -LiteralPath '${bundleDir}' -DestinationPath '${zipPath}' -Force`,
  )
}

console.log(`\n✓ Carpeta de entrega creada en ${bundleDir}`)
if (existsSync(zipPath)) {
  console.log(`✓ ZIP de entrega creado en ${zipPath}`)
}
