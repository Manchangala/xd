const baseUrl = 'http://127.0.0.1:8000'
const frontendUrl = 'http://127.0.0.1:5173/login'

const users = [
  ['estudiante', 'estudiante@curriculapath.edu'],
  ['administrador', 'admin@curriculapath.edu'],
  ['asesor', 'asesor@curriculapath.edu'],
]

async function expectOk(label, action) {
  try {
    const value = await action()
    console.log(`✓ ${label}`)
    return value
  } catch (error) {
    console.error(`✗ ${label}`)
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return null
  }
}

const frontendReady = await expectOk('Frontend disponible', async () => {
  const response = await fetch(frontendUrl)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return true
})

const backendReady = await expectOk('Backend saludable', async () => {
  const response = await fetch(`${baseUrl}/health`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return true
})

if (!frontendReady || !backendReady) {
  console.log('\nSugerencia: ejecuta `npm run dev:stack` y luego vuelve a correr `npm run demo:check`.')
  process.exit(process.exitCode ?? 1)
}

for (const [label, email] of users) {
  await expectOk(`Login ${label}`, async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'demo123' }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  })
}

await expectOk('Diagnóstico OCR accesible', async () => {
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@curriculapath.edu',
      password: 'demo123',
    }),
  })
  if (!login.ok) throw new Error(`Login admin HTTP ${login.status}`)
  const { accessToken } = await login.json()
  const response = await fetch(`${baseUrl}/api/v1/admin/ocr/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const status = await response.json()
  console.log(
    `  OCR: ${status.readyForScannedPdfs ? 'listo' : 'pendiente'} · ${status.message}`,
  )
})
