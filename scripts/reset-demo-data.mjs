import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const backendDir = join(process.cwd(), 'backend')
const pythonPath =
  process.platform === 'win32'
    ? join(backendDir, '.venv', 'Scripts', 'python.exe')
    : join(backendDir, '.venv', 'bin', 'python')

if (!existsSync(pythonPath)) {
  console.error(
    'No se encontró backend/.venv. Configura el backend antes de restaurar la demo.',
  )
  process.exit(1)
}

const child = spawn(pythonPath, ['-m', 'app.db.reset_demo'], {
  cwd: backendDir,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
