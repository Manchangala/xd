import { describe, expect, it, beforeEach } from 'vitest'
import { pdfIngestionService } from '@/features/pdf-ingestion/services/pdfIngestionService'
import { STORAGE_KEYS } from '@/lib/constants'

const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' })

describe('pdfIngestionService mock mode', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ dataSource: 'mock' }),
    )
  })

  it('no inventa materias cuando el usuario sube un PDF real en modo mock', async () => {
    const uploaded = await pdfIngestionService.uploadPdf(
      pdf('Captura de pantalla 2026-05-16 151719.pdf'),
      'prog_systems',
    )

    const result = await pdfIngestionService.processPdf(uploaded.id)

    expect(result.document.estadoProcesamiento).toBe('error')
    expect(result.extraction.textoExtraido).toBe('')
    expect(result.courses).toEqual([])
    expect(result.dependencies).toEqual([])
    expect(result.diagnostics.recommendedAction).toBe('install_ocr_and_retry')
    expect(result.diagnostics.message).toContain('no se lee el PDF real')
  })

  it('solo devuelve detecciones simuladas cuando el archivo se marca explicitamente como demo', async () => {
    const uploaded = await pdfIngestionService.uploadPdf(
      pdf('malla-demo.pdf'),
      'prog_systems',
    )

    const result = await pdfIngestionService.processPdf(uploaded.id)

    expect(result.document.estadoProcesamiento).toBe('validando')
    expect(result.courses.length).toBeGreaterThan(0)
    expect(result.diagnostics.message).toContain('Resultado demo')
  })
})
