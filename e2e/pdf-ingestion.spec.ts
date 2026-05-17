import { expect, test, type Page } from '@playwright/test'

const scannedPdfBase64 =
  'JVBERi0xLjcKJcK1wrYKJSBXcml0dGVuIGJ5IE11UERGIDEuMjcuMgoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFIvSW5mbzw8L1Byb2R1Y2VyKE11UERGIDEuMjcuMik+Pj4+CmVuZG9iagoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1s0IDAgUl0+PgplbmRvYmoKCjMgMCBvYmoKPDwvWE9iamVjdDw8L2Z6SW1nMCA1IDAgUj4+Pj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUm90YXRlIDAvUmVzb3VyY2VzIDMgMCBSL1BhcmVudCAyIDAgUi9Db250ZW50c1s5IDAgUl0+PgplbmRvYmoKCjUgMCBvYmoKPDwvVHlwZS9YT2JqZWN0L1N1YnR5cGUvSW1hZ2UvRGVjb2RlUGFybXM8PD4+L1dpZHRoIDEvSGVpZ2h0IDEvQml0c1BlckNvbXBvbmVudCA4L1NNYXNrIDYgMCBSL0NvbG9yU3BhY2UgOCAwIFIvTGVuZ3RoIDE+PgpzdHJlYW0K/wplbmRzdHJlYW0KZW5kb2JqCgo2IDAgb2JqCjw8L1R5cGUvWE9iamVjdC9TdWJ0eXBlL0ltYWdlL0RlY29kZVBhcm1zPDw+Pi9XaWR0aCAxL0hlaWdodCAxL0JpdHNQZXJDb21wb25lbnQgMS9Db2xvclNwYWNlL0RldmljZUdyYXkvTGVuZ3RoIDE+PgpzdHJlYW0KgAplbmRzdHJlYW0KZW5kb2JqCgo3IDAgb2JqCjw8L0xlbmd0aCAyNDYwL04gMS9BbHRlcm5hdGUvRGV2aWNlR3JheT4+CnN0cmVhbQoAAAmcAAAAAAIQAABtbnRyR1JBWVhZWiAAAAAAAAAAAAAAAABhY3NwQVBQTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVkZXNjAAAAwAAAAH1jcHJ0AAABQAAAACh3dHB0AAABaAAAABRia3B0AAABfAAAABRrVFJDAAABkAAACAxkZXNjAAAAAAAAACNBcnRpZmV4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'

async function loginAsAdmin(page: Page) {
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
  await page.getByRole('combobox').selectOption('admin')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/admin$/)
}

function makeTextPdf(text: string) {
  const stream = `BT /F1 12 Tf 72 760 Td ${text
    .split('\n')
    .map((line) => `(${line.replace(/[()\\]/g, '')}) Tj T*`)
    .join(' ')} ET`
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]
  let output = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(output, 'latin1'))
    output += object
  }
  const xrefStart = Buffer.byteLength(output, 'latin1')
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return Buffer.from(output, 'latin1')
}

test('PDF escaneado sin OCR no inventa materias ni permite guardar grafo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/cargar-pdf')

  await page.locator('input[type="file"]').setInputFiles({
    name: 'Captura de pantalla 2026-05-16 151719.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(scannedPdfBase64, 'base64'),
  })
  await page.getByRole('button', { name: 'Procesar archivo' }).click()

  await expect(page.getByText('No hay materias detectadas')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('OCR local no disponible para procesar imágenes o PDFs escaneados')).toBeVisible()
  await expect(page.getByText('MAT101')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar grafo' })).toBeDisabled()
})

test('PDF con texto real detecta materias y permite guardar grafo revisado', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/cargar-pdf')
  const suffix = Date.now().toString().slice(-4)
  const courseA = `TXT${suffix}`
  const courseB = `LAB${suffix}`

  await page.locator('input[type="file"]').setInputFiles({
    name: `malla-texto-${suffix}.pdf`,
    mimeType: 'application/pdf',
    buffer: makeTextPdf(
      `${courseA} | Seminario de Pruebas | 3 | 1\n${courseB} | Laboratorio de Validacion | 3 | 2\n${courseA} -> ${courseB}`,
    ),
  })
  await page.getByRole('button', { name: 'Procesar archivo' }).click()

  await expect(page.getByRole('cell', { name: courseA })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('cell', { name: courseB })).toBeVisible()
  await expect(page.getByText(`${courseB} requiere ${courseA}`)).toBeVisible()
  await page.getByRole('button', { name: 'Corregir' }).click()
  await expect(page.getByRole('button', { name: 'Añadir materia' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Añadir dependencia' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar revisión' }).click()
  await expect(page.getByRole('button', { name: 'Aprobar' })).toBeEnabled()
  await page.getByRole('button', { name: 'Aprobar' }).click()
  await expect(page.getByRole('button', { name: 'Guardar grafo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Guardar grafo' }).click()
  await expect(page.getByText('Grafo guardado')).toBeVisible({ timeout: 15000 })
})
