import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
const backendPython =
  process.platform === 'win32'
    ? join(process.cwd(), 'backend', '.venv', 'Scripts', 'python.exe')
    : join(process.cwd(), 'backend', '.venv', 'bin', 'python')

function run(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`)
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${label} terminó con código ${code ?? 'desconocido'}`))
    })
  })
}

function runNpm(label, args) {
  if (process.platform === 'win32') {
    return run(label, 'cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`])
  }
  return run(label, 'npm', args)
}

if (!existsSync(backendPython)) {
  console.error(
    'No se encontró el entorno virtual del backend. Prepara `backend/.venv` antes de verificar la entrega.',
  )
  process.exit(1)
}

try {
  await runNpm('Build frontend', ['run', 'build'])
  await runNpm('Lint frontend', ['run', 'lint'])
  await runNpm('Pruebas unitarias frontend', ['run', 'test'])
  await run('Pruebas backend', backendPython, ['-m', 'pytest'], {
    cwd: join(process.cwd(), 'backend'),
  })
  await runNpm('Recorridos end-to-end', ['run', 'test:e2e'])
  console.log('\n✓ Verificación de entrega completada.')
} catch (error) {
  console.error('\n✗ La verificación de entrega encontró un problema.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
