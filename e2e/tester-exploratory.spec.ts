import { expect, test, type Page } from '@playwright/test'

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

test('tester: validaciones de login, registro duplicado y recuperación inválida', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  const email = `tester.dup.${suffix}@curriculapath.edu`
  const code = `TD${suffix}`
  await enableApiMode(page)
  await page.reload()

  await page.locator('input[name="email"]').fill('correo-invalido')
  await page.locator('input[name="password"]').fill('123')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByText('Ingresa un email válido')).toBeVisible()
  await expect(page.getByText('La contraseña debe tener al menos 6 caracteres')).toBeVisible()

  await page.locator('input[name="email"]').fill('estudiante@curriculapath.edu')
  await page.locator('input[name="password"]').fill('password-equivocado')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('No se pudo iniciar sesión', { exact: true })).toBeVisible()

  await page.goto('/registro')
  await page.locator('input[name="nombre"]').fill(`Tester Duplicado ${suffix}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('demo123')
  await page.locator('input[name="codigoEstudiantil"]').fill(code)
  await page.locator('select[name="programaPrincipalId"]').selectOption('prog_systems')
  await page.locator('select[name="programaSecundarioId"]').selectOption('prog_systems')
  await page.getByRole('button', { name: 'Crear perfil' }).click()
  await expect(page.getByText('El segundo programa debe ser diferente al principal')).toBeVisible()

  await page.locator('select[name="programaSecundarioId"]').selectOption('')
  await page.getByRole('button', { name: 'Crear perfil' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('button', { name: 'Salir' }).click()

  await page.goto('/registro')
  await page.locator('input[name="nombre"]').fill(`Tester Repetido ${suffix}`)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('demo123')
  await page.locator('input[name="codigoEstudiantil"]').fill(`TDX${suffix}`)
  await page.getByRole('button', { name: 'Crear perfil' }).click()
  await expect(page.getByText('No se pudo registrar', { exact: true })).toBeVisible()
  await expect(page.getByText('Ya existe un usuario con ese email')).toBeVisible()

  await page.goto('/recuperar-clave')
  await page.locator('input[name="email"]').fill('nadie.existe@curriculapath.edu')
  await page.getByRole('button', { name: 'Generar código de recuperación' }).click()
  await expect(page.getByText('No se pudo generar el código', { exact: true })).toBeVisible()
  await expect(page.getByText('No existe un usuario con ese email')).toBeVisible()
})

test('tester: permisos directos no exponen pantallas fuera del rol', async ({ page }) => {
  await enableApiMode(page)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)

  await loginAs(page, 'student')
  await page.goto('/admin')
  await expect(page.getByText('Acceso restringido')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Salir' }).click()
  await loginAs(page, 'admin')
  await page.goto('/perfil')
  await expect(page.getByText('Acceso restringido')).toBeVisible()

  await page.getByRole('button', { name: 'Salir' }).click()
  await loginAs(page, 'advisor')
  await page.goto('/chat')
  await expect(page.getByText('Acceso restringido')).toBeVisible()
})

test('tester: malla soporta búsquedas sin resultados y filtros combinados', async ({ page }) => {
  await loginAs(page, 'student')
  await page.goto('/malla')
  await expect(page.getByRole('heading', { name: 'Malla curricular interactiva' })).toBeVisible()

  await page.getByPlaceholder('Buscar por código o nombre').fill('zzzzzzzz-no-existe')
  await expect(page.getByText(/Mostrando 0 de/)).toBeVisible()

  await page.getByPlaceholder('Buscar por código o nombre').fill('')
  await page.getByRole('combobox').nth(1).selectOption('aprobada')
  await expect(page.getByText(/Mostrando/)).toBeVisible()
  await page.getByRole('combobox').nth(0).selectOption('1')
  await expect(page.getByText(/Mostrando/)).toBeVisible()
})

test('tester: administración cubre versiones, dependencias y archivo PDF inválido', async ({ page }) => {
  const suffix = Date.now().toString().slice(-5)
  await loginAs(page, 'admin')

  await page.getByRole('button', { name: 'Versiones' }).click()
  await page.getByPlaceholder('Nombre de versión').fill(`Versión QA ${suffix}`)
  await page.getByPlaceholder('Año').fill('2027')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('Versión creada')).toBeVisible()
  const versionRow = page
    .getByText(`Versión QA ${suffix}`, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  await versionRow.getByRole('button', { name: 'Ver detalle' }).click()
  await expect(page.getByText('Detalle de versión')).toBeVisible()
  await versionRow.getByRole('button', { name: 'Editar' }).click()
  await page.getByPlaceholder('Nombre de versión').fill(`Versión QA ${suffix} Editada`)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Versión actualizada', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Dependencias' }).click()
  await page.locator('select').nth(0).selectOption('sys_adm100')
  await page.locator('select').nth(1).selectOption('sys_eco210')
  await page.getByRole('button', { name: 'Crear' }).click()
  await expect(page.getByText('Dependencia creada')).toBeVisible()
  await page.getByRole('button', { name: 'Ver detalle' }).first().click()
  await expect(page.getByText('Detalle de dependencia')).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar' }).first().click()
  await expect(page.getByText('Dependencia eliminada')).toBeVisible()

  await page.goto('/admin/cargar-pdf')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'no-es-pdf.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('esto no es un pdf'),
  })
  await expect(page.getByText('Solo se permiten archivos PDF')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Procesar PDF' })).toBeDisabled()
})
