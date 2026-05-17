import { spawn } from 'node:child_process'

function run(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`)
    const child =
      process.platform === 'win32'
        ? spawn('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], {
            stdio: 'inherit',
          })
        : spawn('npm', args, { stdio: 'inherit' })
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

try {
  await run('Restaurando datos de demo', ['run', 'demo:reset'])
  await run('Generando PDFs de prueba', ['run', 'demo:pdfs'])
  console.log('\n✓ Demo preparada. Ya puedes iniciar la app con `npm run dev:stack`.')
} catch (error) {
  console.error('\n✗ No se pudo preparar la demo.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
