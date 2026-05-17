import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import net from 'node:net'
import { join } from 'node:path'

const rootDir = process.cwd()
const backendDir = join(rootDir, 'backend')
const pythonPath =
  process.platform === 'win32'
    ? join(backendDir, '.venv', 'Scripts', 'python.exe')
    : join(backendDir, '.venv', 'bin', 'python')

const run = (command, args = [], options = {}) =>
  spawnSync(command, args, {
    encoding: 'utf-8',
    shell: false,
    ...options,
  })

const canConnect = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(900)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })

const checks = []

const addCheck = ({ label, ok, severity = 'info', detail, action }) => {
  checks.push({ label, ok, severity, detail, action })
}

const versionOutput = (command, args) => {
  const result = run(command, args)
  return result.status === 0 ? result.stdout.trim() : ''
}

const npmVersionOutput = () => {
  if (process.platform === 'win32') {
    const result = run('cmd.exe', ['/d', '/s', '/c', 'npm --version'])
    return result.status === 0 ? result.stdout.trim() : ''
  }
  return versionOutput('npm', ['--version'])
}

addCheck({
  label: 'Proyecto',
  ok: existsSync(join(rootDir, 'package.json')) && existsSync(join(rootDir, 'src')),
  severity: 'error',
  detail: 'Estructura principal encontrada.',
  action: 'Ejecuta el doctor desde la raíz del proyecto CurriculaPath.',
})

addCheck({
  label: 'Dependencias frontend',
  ok: existsSync(join(rootDir, 'node_modules')),
  severity: 'error',
  detail: 'node_modules está disponible.',
  action: 'Ejecuta npm install antes de iniciar la app.',
})

addCheck({
  label: 'Node.js',
  ok: Boolean(versionOutput('node', ['--version'])),
  severity: 'error',
  detail: versionOutput('node', ['--version']) || 'No se pudo leer la versión de Node.js.',
  action: 'Instala Node.js LTS o confirma que esté en PATH.',
})

addCheck({
  label: 'npm',
  ok: Boolean(npmVersionOutput()),
  severity: 'error',
  detail: npmVersionOutput() || 'No se pudo leer la versión de npm.',
  action: 'En PowerShell usa npm.cmd si la política bloquea npm.ps1.',
})

addCheck({
  label: 'Entorno backend',
  ok: existsSync(pythonPath),
  severity: 'error',
  detail: existsSync(pythonPath) ? 'backend/.venv está disponible.' : 'No existe backend/.venv.',
  action: 'Crea el entorno con python -m venv backend/.venv e instala backend/requirements.txt.',
})

addCheck({
  label: 'Variables frontend',
  ok: existsSync(join(rootDir, '.env')) || existsSync(join(rootDir, '.env.example')),
  severity: 'warning',
  detail: existsSync(join(rootDir, '.env'))
    ? '.env encontrado.'
    : 'No hay .env local; se usarán valores por defecto.',
  action: 'Copia .env.example a .env si necesitas cambiar API, tema o fuente de datos.',
})

addCheck({
  label: 'Variables backend',
  ok: existsSync(join(backendDir, '.env')) || existsSync(join(backendDir, '.env.example')),
  severity: 'warning',
  detail: existsSync(join(backendDir, '.env'))
    ? 'backend/.env encontrado.'
    : 'No hay backend/.env local; se usarán valores por defecto.',
  action: 'Copia backend/.env.example a backend/.env antes de publicar o mover la demo.',
})

const tesseractCheck = run(process.platform === 'win32' ? 'where.exe' : 'which', ['tesseract'])
addCheck({
  label: 'OCR local',
  ok: tesseractCheck.status === 0,
  severity: 'warning',
  detail:
    tesseractCheck.status === 0
      ? `Tesseract detectado: ${tesseractCheck.stdout.trim().split(/\r?\n/)[0]}`
      : 'Tesseract no está disponible en PATH.',
  action: 'Solo hace falta instalarlo si vas a procesar mallas escaneadas como imagen.',
})

addCheck({
  label: 'PDFs de demo',
  ok:
    existsSync(join(rootDir, 'docs', 'demo-assets', 'malla_sistemas_texto_demo.pdf')) &&
    existsSync(join(rootDir, 'docs', 'demo-assets', 'malla_sistemas_escaneada_demo.pdf')),
  severity: 'warning',
  detail: 'Activos de demostración revisados.',
  action: 'Ejecuta npm run demo:pdfs para regenerar PDFs de prueba.',
})

const frontendRunning = await canConnect(5173)
const backendRunning = await canConnect(8000)

addCheck({
  label: 'Frontend local',
  ok: frontendRunning,
  severity: 'info',
  detail: frontendRunning ? 'Hay una app escuchando en http://127.0.0.1:5173.' : 'Puerto 5173 libre.',
  action: 'Si está libre, npm run dev:stack lo iniciará automáticamente.',
})

addCheck({
  label: 'Backend local',
  ok: backendRunning,
  severity: 'info',
  detail: backendRunning ? 'Hay una API escuchando en http://127.0.0.1:8000.' : 'Puerto 8000 libre.',
  action: 'Si está libre, npm run dev:stack lo iniciará automáticamente.',
})

const iconFor = (check) => {
  if (check.ok) return '✓'
  if (check.severity === 'error') return '✗'
  if (check.severity === 'warning') return '!'
  return '·'
}

console.log('\nCurriculaPath doctor\n')
for (const check of checks) {
  console.log(`${iconFor(check)} ${check.label}: ${check.detail}`)
  if (!check.ok && check.action) {
    console.log(`  Acción: ${check.action}`)
  }
}

const errors = checks.filter((check) => !check.ok && check.severity === 'error')
const warnings = checks.filter((check) => !check.ok && check.severity === 'warning')

console.log(
  `\nResumen: ${errors.length} error(es) críticos, ${warnings.length} advertencia(s).`,
)

if (errors.length) {
  console.log('Corrige los errores críticos antes de iniciar la demo.')
  process.exit(1)
}

console.log('El entorno está listo para iniciar o validar CurriculaPath.')
