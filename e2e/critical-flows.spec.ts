import { expect, test, type Page } from '@playwright/test'

async function loginAs(page: Page, role: 'student' | 'admin' | 'advisor') {
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
  await page.reload()
  await page.getByRole('combobox').selectOption(role)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(
    role === 'admin' ? /\/admin$/ : role === 'advisor' ? /\/asesor$/ : /\/dashboard$/,
  )
}

test('estudiante puede ejecutar una simulación con impacto en cascada', async ({
  page,
}) => {
  await loginAs(page, 'student')
  await expect(page.getByRole('heading', { name: 'Tu panorama académico' })).toBeVisible()

  await page.goto('/simulacion')
  await expect(
    page.getByRole('heading', {
      name: 'Simular pérdida, cancelación o aplazamiento',
    }),
  ).toBeVisible()
  await page.getByRole('combobox').first().selectOption('sys_inf102')
  await page.getByRole('button', { name: 'Ejecutar' }).click()

  await expect(page.getByText('Materias bloqueadas en cascada')).toBeVisible()
  await expect(page.getByText('INF201', { exact: true })).toBeVisible()
  await expect(page.getByText('INF202', { exact: true })).toBeVisible()
})

test('administrador ve el panel real y la actividad reciente', async ({ page }) => {
  await loginAs(page, 'admin')
  await expect(
    page.getByRole('heading', { name: 'Panel de administración' }),
  ).toBeVisible()
  await expect(page.getByText('Actividad reciente')).toBeVisible()
  await expect(page.getByText(/Malla 2025 de Ingeniería de Sistemas actualizada/)).toBeVisible()
})

test('asesor consulta estudiantes desde el directorio real', async ({ page }) => {
  await loginAs(page, 'advisor')
  await expect(
    page.getByRole('heading', { name: 'Panel del asesor académico' }),
  ).toBeVisible()

  await page.getByPlaceholder('Nombre o código estudiantil').fill('Maria')
  const studentButton = page.locator('button').filter({ hasText: '202145678' })
  await expect(studentButton).toBeVisible()
  await studentButton.click()
  await expect(page.getByText('202145678').last()).toBeVisible()
})

test('estudiante puede diagnosticar la conexión del LLM local sin romper la pantalla', async ({
  page,
}) => {
  await loginAs(page, 'student')
  await expect(page.getByRole('heading', { name: 'Tu panorama académico' })).toBeVisible()
  await page.goto('/configuracion')

  await page.getByRole('button', { name: 'Probar conexión' }).click()
  await expect(page.getByText('servidor no visible')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Probar conexión' })).toBeVisible()
})

test('administrador puede abrir el diagnóstico OCR de la carga PDF', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.goto('/admin/cargar-pdf')

  await expect(
    page.getByRole('heading', { name: 'Carga inteligente de malla curricular' }),
  ).toBeVisible()
  await expect(page.getByText('OCR local', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Actualizar diagnóstico' }),
  ).toBeVisible()
})

test('estudiante recibe respuesta fundamentada desde el chat académico', async ({
  page,
}) => {
  await loginAs(page, 'student')
  await page.goto('/chat')

  await page
    .getByRole('button', { name: '¿Cuántos créditos me faltan?' })
    .click()
  await expect(page.getByText(/Te faltan/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Contexto recuperado por RAG')).toBeVisible()
})
