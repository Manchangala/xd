import { chromium, expect } from '@playwright/test'

const FRONTEND = 'http://127.0.0.1:5173'
const API = 'http://127.0.0.1:8000/api/v1'
const BAD_API = 'http://127.0.0.1:8999/api/v1'
const stamp = Date.now()

const created = {
  apiStudentEmails: [],
  apiProgramCodes: [],
}
const hardErrors = []
const notes = []
const log = (text) => {
  notes.push(text)
  console.log(`? ${text}`)
}

function watch(page, label, { allowBadApi = false } = {}) {
  page.on('pageerror', (error) => hardErrors.push(`[${label}] Error JS: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/favicon/i.test(text)) return
    if (/status of 422|status of 409|Unprocessable Content|Conflict/i.test(text)) return
    if (allowBadApi && /8999|ERR_CONNECTION_REFUSED|Failed to load resource|Failed to fetch/i.test(text)) return
    hardErrors.push(`[${label}] Console error: ${text}`)
  })
  page.on('response', (response) => {
    const status = response.status()
    const url = response.url()
    if (status >= 500) hardErrors.push(`[${label}] HTTP ${status}: ${url}`)
  })
}

async function configure(page, dataSource = 'api', apiBaseUrl = API) {
  await page.goto(`${FRONTEND}/login`)
  await page.evaluate(({ dataSource, apiBaseUrl }) => {
    localStorage.clear()
    localStorage.setItem('curriculapath.settings', JSON.stringify({ dataSource, apiBaseUrl, theme: 'light' }))
  }, { dataSource, apiBaseUrl })
}

async function login(page, role, dataSource = 'api') {
  await configure(page, dataSource, dataSource === 'api' ? API : API)
  await page.reload()
  await page.getByRole('combobox').first().selectOption(role)
  await page.getByRole('button', { name: /Iniciar sesi/i }).click()
  if (role === 'student') await expect(page).toHaveURL(/\/dashboard$/)
  if (role === 'admin') await expect(page).toHaveURL(/\/admin$/)
  if (role === 'advisor') await expect(page).toHaveURL(/\/asesor$/)
}

async function publicStartupAndAuth() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  watch(page, 'public-startup', { allowBadApi: true })
  try {
    // Inicio limpio: registro debe cargar programas sin depender de backend.
    await page.goto(`${FRONTEND}/login`)
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${FRONTEND}/registro`)
    await expect(page.getByRole('heading', { name: /Registro de estudiante/i })).toBeVisible()
    await expect(page.getByText(/No se pudieron cargar los programas/i)).toHaveCount(0, { timeout: 12000 })
    await expect(page.locator('select').first()).toContainText(/Ingeniería de Sistemas|Ingenier/i)
    log('Inicio limpio: registro carga programas sin error')

    // Caso exacto de la captura: API guardada pero caída.
    await configure(page, 'api', BAD_API)
    await page.goto(`${FRONTEND}/registro`)
    await expect(page.getByText(/No se pudieron cargar los programas/i)).toHaveCount(0, { timeout: 12000 })
    await expect(page.locator('select').first()).toContainText(/Ingeniería de Sistemas|Ingenier/i)
    const settingsAfterFallback = await page.evaluate(() => JSON.parse(localStorage.getItem('curriculapath.settings') || '{}'))
    if (settingsAfterFallback.dataSource !== 'mock') throw new Error('El fallback no cambió a modo mock')
    log('API caída: registro cae a datos locales y no muestra error')

    // Registro local completo desde cero.
    const mockEmail = `ux.mock.public.${stamp}@curriculapath.edu`
    await page.locator('input').nth(0).fill(`UX Mock Público ${stamp}`)
    await page.locator('input').nth(1).fill(mockEmail)
    await page.locator('input').nth(2).fill('demo123')
    await page.locator('input').nth(3).fill(`UXM${String(stamp).slice(-7)}`)
    await page.locator('input').nth(4).fill('1')
    await page.locator('select').nth(0).selectOption('prog_systems')
    await page.locator('select').nth(1).selectOption('')
    await page.locator('input').nth(5).fill('20')
    await page.getByRole('button', { name: /Crear perfil/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: /panorama/i })).toBeVisible()
    await expect(page.getByText(/Sin promedio/i)).toBeVisible()
    log('Registro local: crea usuario y llega a dashboard sin promedio falso')

    // Recuperación en modo mock: código visible/autorrellenado y cambio de clave.
    await page.goto(`${FRONTEND}/recuperar-clave`)
    await page.getByLabel(/Email/i).fill('estudiante@curriculapath.edu')
    await page.getByRole('button', { name: /Generar código|Generar codigo|Enviar/i }).click()
    await expect(page.getByText(/Código generado|Codigo generado/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByLabel(/Nueva contraseña|Nueva contrasena/i).fill('demo123')
    const confirmButtons = page.getByRole('button', { name: /Cambiar contraseña|Cambiar contrasena|Confirmar/i })
    if (await confirmButtons.count()) {
      await confirmButtons.first().click()
      await expect(page.getByText(/Contraseña actualizada|Contrasena actualizada|clave actualizada/i)).toBeVisible({ timeout: 10000 })
    }
    log('Recuperación: flujo público responde y no deja pantalla muerta')

    // Login selector rol por rol en mock.
    await page.goto(`${FRONTEND}/login`)
    await page.getByRole('combobox').first().selectOption('admin')
    await expect(page.locator('input').first()).toHaveValue('admin@curriculapath.edu')
    await page.getByRole('combobox').first().selectOption('advisor')
    await expect(page.locator('input').first()).toHaveValue('asesor@curriculapath.edu')
    await page.getByRole('combobox').first().selectOption('student')
    await expect(page.locator('input').first()).toHaveValue('estudiante@curriculapath.edu')
    await page.getByRole('button', { name: /Iniciar sesi/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    log('Login mock: selector de roles actualiza credenciales y entra')
  } finally {
    await browser.close()
  }
}

async function createApiStudent(page, { doubleProgram = false } = {}) {
  const email = `ux.api.student.${stamp}.${created.apiStudentEmails.length}@curriculapath.edu`
  created.apiStudentEmails.push(email)
  await configure(page, 'api', API)
  await page.goto(`${FRONTEND}/registro`)
  await expect(page.locator('select').first()).toContainText(/Ingeniería de Sistemas|Ingenier/i)
  await page.locator('input').nth(0).fill(`UX API Student ${stamp}`)
  await page.locator('input').nth(1).fill(email)
  await page.locator('input').nth(2).fill('demo123')
  await page.locator('input').nth(3).fill(`UXA${String(stamp).slice(-7)}${created.apiStudentEmails.length}`)
  await page.locator('input').nth(4).fill('1')
  await page.locator('select').nth(0).selectOption('prog_systems')
  await page.locator('select').nth(1).selectOption(doubleProgram ? 'prog_business' : '')
  await page.locator('input').nth(5).fill('20')
  await page.getByRole('button', { name: /Crear perfil/i }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return email
}

async function saveScenario(page, name, type, courseId) {
  await page.goto(`${FRONTEND}/simulacion`)
  await expect(page.getByRole('heading', { name: /Simular pérdida|Simular perdida/i })).toBeVisible()
  await page.locator('select').nth(0).selectOption(courseId)
  await page.locator('select').nth(1).selectOption(type)
  await page.locator('input').first().fill(name)
  await page.getByRole('button', { name: /^Ejecutar$/i }).click()
  await expect(page.getByText(/Materias bloqueadas en cascada/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Rutas sugeridas/i)).toBeVisible()
  await page.getByRole('button', { name: /Guardar escenario/i }).click()
  await expect(page.getByText(/Escenario guardado/i)).toBeVisible({ timeout: 15000 })
}

async function studentButtonByButton() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  watch(page, 'student-api')
  try {
    await createApiStudent(page, { doubleProgram: true })
    await expect(page.getByText(/Sin promedio/i)).toBeVisible()
    await expect(page.getByText(/0\s*\/\s*162\s*créditos/i)).toBeVisible()
    log('Estudiante API: registro con doble programa y dashboard inicial correcto')

    // Dashboard quick actions.
    const quickActions = [
      [/Ver malla/i, /\/malla$/, /Malla curricular interactiva/i],
      [/Simular pérdida|Simular perdida/i, /\/simulacion$/, /Simular pérdida|Simular perdida/i],
      [/Rutas alternativas/i, /\/rutas$/, /Aún no hay rutas|Rutas alternativas/i],
      [/Comparar escenarios/i, /\/comparar$/, /Aún no hay escenarios suficientes|Comparar escenarios/i],
      [/Chat académico|Chat academico/i, /\/chat$/, /Chat académico|Chat academico/i],
    ]
    await page.goto(`${FRONTEND}/dashboard`)
    for (const [buttonName, urlRegex, pageText] of quickActions) {
      await page.goto(`${FRONTEND}/dashboard`)
      await page.getByRole('link', { name: buttonName }).first().click()
      await expect(page).toHaveURL(urlRegex)
      await expect(page.getByText(pageText).first()).toBeVisible({ timeout: 15000 })
    }
    log('Dashboard: todos los accesos rápidos navegan')

    // Perfil: validación, guardar y edición historial.
    await page.goto(`${FRONTEND}/perfil`)
    await expect(page.getByRole('heading', { name: /Perfil académico|Perfil academico/i })).toBeVisible()
    await page.locator('select').nth(1).selectOption('prog_systems')
    await page.getByRole('button', { name: /Guardar cambios/i }).click()
    await expect(page.getByText(/segundo programa debe ser diferente/i)).toBeVisible()
    await page.locator('select').nth(1).selectOption('prog_business')
    await page.getByLabel(/Carga máxima|Carga maxima/i).fill('22')
    await page.getByRole('button', { name: /Guardar cambios/i }).click()
    await expect(page.getByText(/Perfil guardado/i)).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder(/Buscar por código|Buscar por codigo/i).fill('calculo diferencial')
    await page.locator('tbody select').first().selectOption('aprobada')
    await expect(page.getByText(/Historial actualizado/i)).toBeVisible({ timeout: 10000 })
    log('Perfil: validación, guardado y edición de historial funcionan')

    // Dashboard recalculado.
    await page.goto(`${FRONTEND}/dashboard`)
    await expect(page.getByText(/4\s*\/\s*162\s*créditos/i)).toBeVisible({ timeout: 12000 })
    await expect(page.getByText(/4\.12/).first()).toBeVisible()
    log('Dashboard: créditos y promedio aparecen después de aprobar materia')

    // Malla: filtros, botones de detalle y navegación de simulación.
    await page.goto(`${FRONTEND}/malla`)
    await page.locator('input').first().fill('zzzzzz')
    await expect(page.getByText(/No hay materias que coincidan/i)).toBeVisible()
    await page.getByRole('button', { name: /Limpiar filtros/i }).click()
    await page.locator('input').first().fill('bases')
    await expect(page.getByText(/Bases de Datos/i).first()).toBeVisible()
    await page.getByRole('button', { name: /Ver dependencias/i }).click()
    await expect(page.getByText(/Materias dependientes/i)).toBeVisible()
    await page.getByRole('button', { name: /Marcar como en curso/i }).click()
    await expect(page.getByText(/Estado de materia actualizado/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Simular cancelación|Simular cancelacion/i }).click()
    await expect(page).toHaveURL(/\/simulacion\?course=.*type=cancelacion/)
    log('Malla: filtros, detalle, cambio de estado y botones de simulación funcionan')

    // Simulación: los tres eventos, limpiar, guardar dos escenarios.
    await page.goto(`${FRONTEND}/simulacion`)
    for (const eventType of ['perdida', 'cancelacion', 'aplazamiento']) {
      await page.locator('select').nth(0).selectOption('sys_inf102')
      await page.locator('select').nth(1).selectOption(eventType)
      await page.getByRole('button', { name: /^Ejecutar$/i }).click()
      await expect(page.getByText(/Materias bloqueadas en cascada/i)).toBeVisible({ timeout: 15000 })
      await page.getByRole('button', { name: /Limpiar simulación|Limpiar simulacion/i }).click()
      await expect(page.getByText(/Aún no hay simulación activa|Aun no hay simulacion activa/i)).toBeVisible()
    }
    await saveScenario(page, `UX pérdida ${stamp}`, 'perdida', 'sys_inf102')
    await saveScenario(page, `UX cancelación ${stamp}`, 'cancelacion', 'sys_inf201')
    log('Simulación: pérdida, cancelación, aplazamiento, limpiar y guardar funcionan')

    // Rutas y comparación.
    await page.goto(`${FRONTEND}/rutas`)
    await expect(page.getByRole('heading', { name: /Rutas alternativas/i })).toBeVisible()
    await page.getByRole('button', { name: /Ver timeline/i }).first().click()
    await expect(page.getByText(/Timeline visual/i)).toBeVisible()
    await page.getByRole('button', { name: /Aplicar ruta/i }).first().click()
    await expect(page.getByText(/marcada como preferida/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /Comparar/i }).first().click()
    await expect(page).toHaveURL(/\/comparar/)
    await expect(page.getByText(/Recomendación calculada|Recomendacion calculada/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Elegir mejor escenario/i }).click()
    await expect(page.getByText(/Mejor escenario elegido/i)).toBeVisible()
    log('Rutas y Comparar: timeline, aplicar, comparar y elegir funcionan')

    // Doble programa.
    await page.goto(`${FRONTEND}/doble-programa`)
    await expect(page.getByRole('heading', { name: /Planeación integrada|Planeacion integrada/i })).toBeVisible()
    await expect(page.getByText(/Ingeniería de Sistemas|Ingenier/i).first()).toBeVisible()
    await expect(page.getByText(/Administración de Empresas|Administracion de Empresas/i).first()).toBeVisible()
    await expect(page.getByText(/MAT101/i).first()).toBeVisible()
    log('Doble programa: muestra dos programas y materias compartidas')

    // Chat: botones rápidos + input.
    await page.goto(`${FRONTEND}/chat`)
    await expect(page.getByRole('heading', { name: /Chat académico|Chat academico/i })).toBeVisible({ timeout: 15000 })
    const quickQuestions = page.locator('button').filter({ hasText: /créditos|creditos|Bases de Datos|ruta|próximo|proximo|Cálculo|Calculo/i })
    const countQuick = Math.min(await quickQuestions.count(), 5)
    for (let i = 0; i < countQuick; i++) {
      await quickQuestions.nth(i).click()
      await page.waitForTimeout(700)
    }
    await page.getByPlaceholder(/Haz una pregunta/i).fill('Puedo tomar Bases de Datos?')
    await page.getByRole('button', { name: /Enviar pregunta/i }).click()
    await expect(page.getByText(/Bases de Datos/i).last()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Contexto recuperado por RAG/i)).toBeVisible()
    log('Chat: preguntas rápidas, envío manual y panel RAG funcionan')

    // Configuración, 404 y salir.
    await page.goto(`${FRONTEND}/configuracion`)
    await page.locator('select').first().selectOption('dark')
    await page.locator('select').first().selectOption('light')
    await page.getByRole('button', { name: /Guardar configuración|Guardar configuracion/i }).click()
    await expect(page.getByText(/Configuración guardada|Configuracion guardada/i)).toBeVisible()
    await page.getByRole('button', { name: /Probar conexión|Probar conexion/i }).click()
    await expect(page.getByText(/servidor no visible|servidor visible/i)).toBeVisible({ timeout: 15000 })
    await page.goto(`${FRONTEND}/ruta-inexistente`)
    await expect(page.getByText(/Ruta no encontrada/i)).toBeVisible()
    await page.getByRole('button', { name: /Volver al dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.getByRole('button', { name: /Salir/i }).click()
    await expect(page).toHaveURL(/\/login$/)
    log('Configuración, 404 y salir funcionan')
  } finally {
    await browser.close()
  }
}

async function advisorAndMobile() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  watch(page, 'advisor-mobile')
  try {
    await login(page, 'advisor', 'api')
    await expect(page.getByRole('heading', { name: /Panel del asesor/i })).toBeVisible()
    await page.getByPlaceholder(/Nombre o código|Nombre o codigo/i).fill('Maria')
    await expect(page.getByText(/María José|Maria Jose|202145678/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByText(/202145678/i).first().click()
    await expect(page.getByText(/Simulaciones guardadas/i)).toBeVisible()
    await page.goto(`${FRONTEND}/malla`)
    await expect(page.getByRole('heading', { name: /Malla curricular interactiva/i })).toBeVisible()
    await page.goto(`${FRONTEND}/chat`)
    await expect(page.getByText(/Acceso restringido/i)).toBeVisible()
    log('Asesor: búsqueda, detalle, malla y restricción de chat funcionan')

    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, 'student', 'api')
    await page.locator('button[aria-label^="Abrir"]').click()
    await expect(page.getByRole('link', { name: /Malla Curricular/i })).toBeVisible()
    await page.getByRole('link', { name: /Malla Curricular/i }).click()
    await expect(page).toHaveURL(/\/malla$/)
    await page.locator('button[aria-label^="Abrir"]').click()
    await page.getByRole('link', { name: /Configuración|Configuracion/i }).click()
    await expect(page).toHaveURL(/\/configuracion$/)
    log('Móvil: menú abre, navega y cierra correctamente')
  } finally {
    await browser.close()
  }
}

async function adminAndPdf() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  watch(page, 'admin-pdf')
  try {
    await login(page, 'admin', 'api')
    await expect(page.getByRole('heading', { name: /Panel de administración|Panel de administracion/i })).toBeVisible()
    await page.getByRole('button', { name: /Estado sistema/i }).click()
    await expect(page.getByText(/Diagnóstico operativo|Diagnostico operativo/i)).toBeVisible()
    await page.getByRole('button', { name: /Usuarios/i }).click()
    await expect(page.getByText(/admin@curriculapath.edu/i)).toBeVisible()
    await page.getByRole('button', { name: /Reset clave/i }).first().click()
    await expect(page.getByText(/Contraseña reiniciada|Contrasena reiniciada/i)).toBeVisible({ timeout: 10000 })
    log('Admin: sistema, usuarios y reset de clave funcionan')

    // Crear/desactivar programa temporal.
    const programCode = `UXP${String(stamp).slice(-5)}`
    created.apiProgramCodes.push(programCode)
    await page.getByRole('button', { name: /Programas/i }).click()
    await page.getByPlaceholder(/Código|Codigo/i).fill('INGSIS')
    await page.getByPlaceholder(/Nombre del programa/i).fill('Duplicado Sistemas')
    await page.getByPlaceholder(/Créditos|Creditos/i).fill('162')
    await page.locator('form').filter({ has: page.getByPlaceholder(/Nombre del programa/i) }).getByRole('button', { name: /^Crear$/i }).click()
    await expect(page.getByText(/No se pudo crear el programa/i)).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder(/Código|Codigo/i).fill(programCode)
    await page.getByPlaceholder(/Nombre del programa/i).fill(`Programa UX Botón ${stamp}`)
    await page.getByPlaceholder(/Créditos|Creditos/i).fill('99')
    await page.locator('form').filter({ has: page.getByPlaceholder(/Nombre del programa/i) }).getByRole('button', { name: /^Crear$/i }).click()
    await expect(page.getByText(/Programa creado/i).first()).toBeVisible({ timeout: 10000 })
    const tempRow = page.locator('tr').filter({ hasText: programCode })
    await tempRow.getByRole('button', { name: /Ver detalle/i }).click()
    await expect(page.getByText(new RegExp(programCode)).first()).toBeVisible()
    await tempRow.getByRole('button', { name: /Editar/i }).click()
    await page.getByPlaceholder(/Nombre del programa/i).fill(`Programa UX Botón Editado ${stamp}`)
    await page.getByRole('button', { name: /^Guardar$/i }).click()
    await expect(page.getByText(/Programa actualizado/i).first()).toBeVisible({ timeout: 10000 })
    await page.locator('tr').filter({ hasText: programCode }).getByRole('button', { name: /Desactivar/i }).click()
    await expect(page.locator('tr').filter({ hasText: programCode }).getByText(/Inactivo/i)).toBeVisible({ timeout: 10000 })
    log('Admin Programas: duplicado, crear, detalle, editar y desactivar funcionan')

    // Materias: validación duplicado + crear/edit temporal en versión activa.
    await page.getByRole('button', { name: /Materias/i }).click()
    await page.getByPlaceholder(/Código|Codigo/i).fill('INF101')
    await page.getByPlaceholder(/^Nombre$/i).fill('Programación duplicada')
    await page.getByPlaceholder(/Créditos|Creditos/i).fill('3')
    await page.getByPlaceholder(/Semestre/i).fill('1')
    await page.getByRole('button', { name: /Crear materia/i }).click()
    await expect(page.getByText(/No se pudo crear la materia/i)).toBeVisible({ timeout: 10000 })
    log('Admin Materias: duplicado muestra error claro')

    // Versiones: error esperado al desactivar única activa.
    await page.getByRole('button', { name: /Versiones/i }).click()
    await page.locator('div').filter({ hasText: /Plan 2025/ }).first().getByRole('button', { name: /Desactivar/i }).click().catch(async () => {
      await page.getByRole('button', { name: /Desactivar/i }).first().click()
    })
    await expect(page.getByText(/No se pudo actualizar la versión|No se pudo actualizar la version|al menos una versión activa|al menos una version activa/i).first()).toBeVisible({ timeout: 10000 })
    log('Admin Versiones: protege la única versión activa')

    // Dependencias: autorreferenciada bloqueada; crear/delete si no duplicada usando materias conocidas.
    await page.getByRole('button', { name: /Dependencias/i }).click()
    const firstValue = await page.locator('select').first().inputValue()
    await page.locator('select').nth(1).selectOption(firstValue)
    await expect(page.getByText(/Selecciona dos materias distintas/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Crear$/i })).toBeDisabled()
    log('Admin Dependencias: bloquea relación autorreferenciada')

    // PDF: no PDF, vacío, texto con corrección, aprobar bloqueo si hay materia inválida.
    await page.goto(`${FRONTEND}/admin/cargar-pdf`)
    await expect(page.getByRole('heading', { name: /Carga inteligente/i })).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles('README.md')
    await expect(page.getByText(/Solo se permiten archivos PDF/i)).toBeVisible()
    await page.locator('input[type="file"]').setInputFiles('docs/demo-assets/malla_vacia_demo.pdf')
    await page.getByRole('button', { name: /Procesar PDF/i }).click()
    await expect(page.getByText(/No se pudo extraer texto/i).first()).toBeVisible({ timeout: 25000 })
    await expect(page.getByRole('button', { name: /^Aprobar$/i })).toBeDisabled()
    await page.locator('input[type="file"]').setInputFiles('docs/demo-assets/malla_sistemas_texto_demo.pdf')
    await page.getByRole('button', { name: /Procesar PDF/i }).click()
    await expect(page.getByText(/Materias detectadas/i)).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/Dependencias detectadas/i)).toBeVisible()
    await expect(page.getByText(/Vista previa del grafo/i)).toBeVisible()
    await page.getByRole('button', { name: /Corregir/i }).click()
    await page.getByRole('button', { name: /Añadir materia|Anadir materia/i }).click()
    await expect(page.getByText(/materias sin/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Aprobar$/i })).toBeDisabled()
    log('Admin PDF: validaciones, procesamiento, revisión y bloqueo funcionan')
  } finally {
    await browser.close()
  }
}

async function main() {
  await publicStartupAndAuth()
  await studentButtonByButton()
  await advisorAndMobile()
  await adminAndPdf()
  if (hardErrors.length) {
    console.error('ERRORES_DUROS_DETECTADOS')
    for (const error of hardErrors) console.error(error)
    process.exit(1)
  }
  console.log('FULL_USER_AUDIT_OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})






