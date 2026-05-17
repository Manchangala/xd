import { existsSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const backendDir = join(process.cwd(), 'backend')
const dbPath = join(backendDir, 'curriculapath_e2e.db')
const storagePath = join(backendDir, 'storage', 'e2e-documents')
const port = '8001'
const pythonPath =
  process.platform === 'win32'
    ? join(backendDir, '.venv', 'Scripts', 'python.exe')
    : join(backendDir, '.venv', 'bin', 'python')

if (existsSync(dbPath)) rmSync(dbPath)
if (existsSync(storagePath)) rmSync(storagePath, { recursive: true, force: true })

const child = spawn(
  pythonPath,
  ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', port],
  {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: 'sqlite:///./curriculapath_e2e.db',
      DOCUMENT_STORAGE_DIR: 'storage/e2e-documents',
      FRONTEND_ORIGINS: 'http://localhost:5174,http://127.0.0.1:5174',
    },
    stdio: 'inherit',
  },
)

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
child.on('exit', (code) => process.exit(code ?? 0))
