import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'

const rootDir = process.cwd()
const backendDir = join(rootDir, 'backend')
const pythonPath =
  process.platform === 'win32'
    ? join(backendDir, '.venv', 'Scripts', 'python.exe')
    : join(backendDir, '.venv', 'bin', 'python')

if (!existsSync(pythonPath)) {
  console.error(
    'No se encontró el entorno virtual del backend. Crea backend/.venv e instala requirements.txt antes de usar npm run dev:stack.',
  )
  process.exit(1)
}

function runBackendStep(label, args, { allowFailure = false } = {}) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(pythonPath, args, {
    cwd: backendDir,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    if (allowFailure) {
      return false
    }
    console.error(`\nNo se pudo completar: ${label}.`)
    process.exit(result.status ?? 1)
  }

  return true
}

const migrated = runBackendStep('Aplicando migraciones del backend', ['-m', 'alembic', 'upgrade', 'head'], {
  allowFailure: true,
})

if (!migrated) {
  console.warn(
    '\nLa base local parece venir de una versión anterior. Se restaurará la demo con el esquema actual.',
  )
  runBackendStep('Restaurando base de demo actualizada', ['-m', 'app.db.reset_demo'])
  runBackendStep('Marcando migraciones como aplicadas', ['-m', 'alembic', 'stamp', 'head'])
} else {
  runBackendStep('Verificando datos semilla', ['-m', 'app.db.init_db'])
}

const children = [
  spawn(
    pythonPath,
    ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: backendDir,
      stdio: 'inherit',
    },
  ),
  spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1 --port 5173']
      : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
    {
      cwd: rootDir,
      stdio: 'inherit',
    },
  ),
]

const shutdown = (signal) => {
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown('SIGTERM')
      process.exit(code)
    }
  })
}
