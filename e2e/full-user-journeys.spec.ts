import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.setTimeout(60_000)

async function enableApiMode(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'curriculapath.settings',
      JSON.stringify({
        apiBaseUrl: 'http://127.0.0.1:8001/api/v1',
        dataSource: 'api',
      }),
    )
  })
}

async function loginAs(page: Page, role: 'student' | 'admin' | 'advisor') {
  await enableApiMode(page)
  await page.reload()
  await page.getByRole('combobox').selectOption(role)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(
    role === 'admin' ? /\/admin$/ : role === 'advisor' ? /\/asesor$/ : /\/dashboard$/,
  )
}

async function expectNoBrokenPage(page: Page) {
  await expect(page.getByText('No se pudo cargar')).toHaveCount(0)
  await expect(page.getByText('Error')).toHaveCount(0)
}

test('usuario nuevo se registra, ve dashboard coherente y navega a su malla base', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  await enableApiMode(page)
  await page.goto('/registro')

  await expect(page.getByRole('heading', { name: 'Registro de estudiante' })).toBeVisible()
  await page.locator('input[name="nombre"]').fill(`Estudiante QA ${suffix}`)
  await page.locator('input[name="email"]').fill(`qa${suffix}@curriculapath.edu`)
  await page.locator('input[name="password"]').fill('demo123')
  await page.locator('input[name="codigoEstudiantil"]').fill(`2026${suffix}`)
  await page.locator('input[name="semestreActual"]').fill('1')
  await page.locator('input[name="cargaMaximaCreditos"]').fill('20')
  await page.getByRole('button', { name: 'Crear perfil' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Estudiante QA ' + suffix })).toBeVisible()
  await expect(page.getByText('Sin promedio')).toBeVisible()
  await expect(page.getByText('0 / 162 créditos')).toBeVisible()
  await page.getByRole('link', { name: 'Ver malla' }).click()
  await expect(page).toHaveURL(/\/malla$/)
  await expect(page.getByRole('heading', { name: 'Malla curricular interactiva' })).toBeVisible()
  await expect(page.getByText('Mostrando')).toBeVisible()
  await expect(page.getByText('Cálculo Diferencial')).toBeVisible()
})

test('usuario nuevo con doble programa ve planeación integrada sin pantallas vacías', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  await enableApiMode(page)
  await page.goto('/registro')

  await page.locator('input[name="nombre"]').fill(`Doble Programa QA ${suffix}`)
  await page.locator('input[name="email"]').fill(`doble.qa${suffix}@curriculapath.edu`)
  await page.locator('input[name="password"]').fill('demo123')
  await page.locator('input[name="codigoEstudiantil"]').fill(`DP${suffix}`)
  await page.locator('input[name="semestreActual"]').fill('1')
  await page.locator('select[name="programaPrincipalId"]').selectOption('prog_systems')
  await page.locator('select[name="programaSecundarioId"]').selectOption('prog_business')
  await page.getByRole('button', { name: 'Crear perfil' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/doble-programa')
  await expect(page.getByRole('heading', { name: 'Planeación integrada de doble titulación' })).toBeVisible()
  await expect(page.getByText('Ingeniería de Sistemas')).toBeVisible()
  await expect(page.getByText('Administración de Empresas')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Materias compartidas' })).toBeVisible()
  await expect(page.getByText('Simulación visual de afectación cruzada')).toBeVisible()
  await expectNoBrokenPage(page)
})

test('estudiante recorre dashboard, malla, simulación, rutas y comparación sin errores', async ({ page }) => {
  await loginAs(page, 'student')
  await expect(page.getByRole('heading', { name: 'Tu panorama académico' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Ver malla' }).click()
  await expect(page).toHaveURL(/\/malla$/)
  await page.getByPlaceholder('Buscar por código o nombre').fill('Programación II')
  await expect(page.getByRole('heading', { name: 'Programación II' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver dependencias' }).click()
  await expect(page.getByText('Materias dependientes')).toBeVisible()
  await page.getByRole('button', { name: 'Marcar como en curso' }).click()
  await expect(page.getByText('Estado de materia actualizado')).toBeVisible()
  await page.getByRole('button', { name: 'Simular pérdida' }).click()

  await expect(page).toHaveURL(/\/simulacion/)
  await expect(page.getByRole('heading', { name: 'Simular pérdida, cancelación o aplazamiento' })).toBeVisible()
  await page.locator('input').fill(`Escenario QA ${Date.now().toString().slice(-5)}`)
  await page.getByRole('button', { name: 'Ejecutar' }).click()
  await expect(page.getByText('Materias bloqueadas en cascada')).toBeVisible()
  await expect(page.getByText('Rutas sugeridas')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar escenario' }).click()
  await expect(page.getByText('Escenario guardado')).toBeVisible()

  await page.goto('/rutas')
  await expect(page.getByRole('heading', { name: 'Rutas alternativas' })).toBeVisible()
  await expect(page.getByText('Timeline visual')).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar ruta' }).first().click()
  await expect(page.getByText('marcada como preferida')).toBeVisible()
  await page.getByRole('button', { name: 'Comparar' }).first().click()
  await expect(page).toHaveURL(/\/comparar/)
  await expect(page.getByRole('heading', { name: 'Comparar escenarios' })).toBeVisible()
  await page.getByRole('button', { name: 'Elegir mejor escenario' }).click()
  await expect(page.getByText('Mejor escenario elegido')).toBeVisible()
  await expectNoBrokenPage(page)
})

test('estudiante actualiza perfil e historial académico desde la interfaz', async ({ page }) => {
  await loginAs(page, 'student')
  await page.goto('/perfil')

  await expect(page.getByRole('heading', { name: 'Perfil académico' })).toBeVisible()
  await page.locator('input[type="number"]').nth(1).fill('18')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Perfil guardado')).toBeVisible()

  await page.getByPlaceholder('Buscar por código o nombre').fill('INF101')
  const row = page.getByRole('row', { name: /Programación I\s+INF101/ })
  await expect(row).toBeVisible()
  await row.locator('select').selectOption('aprobada')
  await expect(page.getByText('Historial actualizado')).toBeVisible()
  await expectNoBrokenPage(page)
})

test('chat académico responde preguntas rápidas y pregunta escrita con contexto RAG', async ({ page }) => {
  await loginAs(page, 'student')
  await page.goto('/chat')

  await expect(page.getByRole('heading', { name: 'Chat académico con IA local' })).toBeVisible()
  await page.getByRole('button', { name: '¿Qué materias puedo cursar el próximo semestre?' }).click()
  await expect(page.getByText('Contexto recuperado por RAG')).toBeVisible()
  await page.getByPlaceholder('Haz una pregunta académica').fill('¿Puedo tomar Bases de Datos?')
  await page.getByRole('button', { name: 'Enviar pregunta' }).click()
  await expect(page.getByText('Bases de Datos')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Grafo curricular')).toBeVisible()
})

test('recuperación de contraseña y menú móvil completan el recorrido de acceso', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  const email = `recover.qa${suffix}@curriculapath.edu`
  await enableApiMode(page)
  await page.goto('/registro')

  await page.locator('input[name="nombre"]').fill(`Recuperación QA ${suffix}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('demo123')
  await page.locator('input[name="codigoEstudiantil"]').fill(`RC${suffix}`)
  await page.getByRole('button', { name: 'Crear perfil' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('button', { name: 'Salir' }).click()

  await page.goto('/recuperar-clave')
  await page.locator('input[name="email"]').fill(email)
  await page.getByRole('button', { name: 'Generar código de recuperación' }).click()
  await expect(page.getByText('Código demo visible')).toBeVisible()
  await page.locator('input[name="newPassword"]').fill('nuevo123')
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole('combobox').selectOption('student')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('nuevo123')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel(/Abrir/).click()
  const mobileMenu = page.locator('.fixed.inset-0')
  await expect(mobileMenu.getByText('CurriculaPath')).toBeVisible()
  await mobileMenu.getByRole('link', { name: 'Rutas Alternativas' }).click()
  await expect(page).toHaveURL(/\/rutas$/)
})

test('simulación permite probar pérdida, cancelación, aplazamiento y limpiar resultado', async ({ page }) => {
  await loginAs(page, 'student')
  await page.goto('/simulacion')
  await expect(page.getByRole('heading', { name: 'Simular pérdida, cancelación o aplazamiento' })).toBeVisible()
  await page.getByRole('combobox').first().selectOption('sys_inf102')

  for (const eventType of ['perdida', 'cancelacion', 'aplazamiento']) {
    await page.getByRole('combobox').nth(1).selectOption(eventType)
    await page.locator('input').fill(`QA ${eventType}`)
    await page.getByRole('button', { name: 'Ejecutar' }).click()
    await expect(page.getByText('Antes / después')).toBeVisible()
    await expect(page.getByText('Materias bloqueadas en cascada')).toBeVisible()
    await expect(page.getByText('Rutas sugeridas')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar simulación' }).click()
    await expect(page.getByText('Aún no hay simulación activa')).toBeVisible()
  }
})

test('administrador crea usuario, programa y materia sin romper tablas ni acciones', async ({ page }) => {
  const suffix = Date.now().toString().slice(-5)
  await loginAs(page, 'admin')
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()

  await page.getByRole('button', { name: 'Usuarios' }).click()
  await page.getByPlaceholder('Nombre').fill(`Asesor QA ${suffix}`)
  await page.getByPlaceholder('Email').fill(`asesor.qa.${suffix}@curriculapath.edu`)
  await page.getByPlaceholder('Contraseña inicial').fill('demo123')
  await page.locator('select[name="rol"]').selectOption('advisor')
  await page.getByRole('button', { name: 'Crear usuario' }).click()
  await expect(page.getByText('Usuario creado')).toBeVisible()
  await expect(page.getByText(`asesor.qa.${suffix}@curriculapath.edu`)).toBeVisible()
  const createdUserRow = page.getByRole('row', { name: new RegExp(`asesor.qa.${suffix}@curriculapath.edu`) })
  await createdUserRow.getByRole('button', { name: 'Ver detalle' }).click()
  await expect(page.getByText('Detalle de usuario')).toBeVisible()
  await createdUserRow.getByRole('button', { name: 'Desactivar' }).click()
  await expect(page.getByText('Usuario actualizado')).toBeVisible()
  await createdUserRow.getByRole('button', { name: 'Reset clave' }).click()
  await expect(page.getByText('Contraseña reiniciada')).toBeVisible()

  await page.getByRole('button', { name: 'Programas' }).click()
  await page.getByPlaceholder('Código').fill(`QA${suffix}`)
  await page.getByPlaceholder('Nombre del programa').fill(`Programa QA ${suffix}`)
  await page.getByPlaceholder('Créditos').fill('140')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('Programa creado', { exact: true })).toBeVisible()
  const createdProgramRow = page.getByRole('row', { name: new RegExp(`QA${suffix}`) })
  await expect(page.getByRole('cell', { name: `Programa QA ${suffix}` })).toBeVisible()
  await createdProgramRow.getByRole('button', { name: 'Ver detalle' }).click()
  await expect(page.getByText('Detalle del programa')).toBeVisible()
  await createdProgramRow.getByRole('button', { name: 'Editar' }).click()
  await page.getByPlaceholder('Nombre del programa').fill(`Programa QA ${suffix} Editado`)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Programa actualizado', { exact: true })).toBeVisible()
  await createdProgramRow.getByRole('button', { name: 'Desactivar' }).click()
  await expect(page.getByText('Programa actualizado', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Materias' }).click()
  await page.getByPlaceholder('Código').fill(`MAT${suffix}`)
  await page.getByPlaceholder('Nombre').fill(`Materia QA ${suffix}`)
  await page.getByPlaceholder('Créditos').fill('3')
  await page.getByPlaceholder('Semestre').fill('1')
  await page.getByRole('button', { name: 'Crear materia' }).click()
  await expect(page.getByText('Materia creada', { exact: true })).toBeVisible()
  const createdCourseRow = page.getByRole('row', { name: new RegExp(`MAT${suffix}`) })
  await expect(page.getByRole('cell', { name: `Materia QA ${suffix}` })).toBeVisible()
  await createdCourseRow.getByRole('button', { name: 'Ver detalle' }).click()
  await expect(page.getByText('Detalle de materia')).toBeVisible()
  await createdCourseRow.getByRole('button', { name: 'Editar' }).click()
  await page.getByPlaceholder('Nombre').fill(`Materia QA ${suffix} Editada`)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Materia actualizada', { exact: true })).toBeVisible()
  await expectNoBrokenPage(page)
})

test('permisos, asesoría, configuración y 404 se comportan correctamente', async ({ page }) => {
  await loginAs(page, 'advisor')
  await page.goto('/admin')
  await expect(page.getByText('Acceso restringido')).toBeVisible()
  await page.goto('/asesor')
  await expect(page.getByRole('heading', { name: 'Panel del asesor académico' })).toBeVisible()
  await page.getByPlaceholder('Nombre o código estudiantil').fill('202012345')
  await expect(page.getByRole('button', { name: /Gabriel Jiménez/ })).toBeVisible()

  await page.goto('/configuracion')
  await expect(page.getByRole('heading', { name: 'Preferencias e integraciones' })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  await expect(page.getByText('Configuración guardada')).toBeVisible()
  await page.getByRole('button', { name: 'Probar conexión' }).click()
  await expect(page.getByText('servidor no visible')).toBeVisible({ timeout: 15000 })

  await page.goto('/ruta-que-no-existe')
  await expect(page.getByRole('heading', { name: 'Ruta no encontrada' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a asesoría' }).click()
  await expect(page).toHaveURL(/\/asesor$/)
})
