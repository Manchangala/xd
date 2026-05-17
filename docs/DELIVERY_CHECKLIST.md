# Checklist de entrega — CurriculaPath

Esta lista sirve para confirmar que el proyecto está en estado presentable antes de enviarlo o sustentarlo.

## Flujo recomendado

1. Revisar entorno local:

```bash
npm run doctor
```

2. Preparar datos limpios:

```bash
npm run demo:prepare
```

3. Iniciar frontend + backend:

```bash
npm run dev:stack
```

4. Verificar que la demo responda:

```bash
npm run demo:check
```

5. Ejecutar la verificación completa de entrega:

```bash
npm run delivery:verify
```

En Windows también puedes hacer doble clic en:

- `ENTREGA_LISTA.cmd`

6. Crear un paquete limpio para compartir:

```bash
npm run delivery:bundle
```

En Windows también puedes hacer doble clic en:

- `EMPAQUETAR_ENTREGA.cmd`

El paquete queda en:

- `release/CurriculaPath_entrega/`
- `release/CurriculaPath_entrega.zip`

## Qué valida `delivery:verify`

- build del frontend,
- lint,
- pruebas unitarias del frontend,
- pruebas del backend,
- recorridos end-to-end.

## Evidencias que deberían poder mostrarse

- login por rol,
- dashboard del estudiante,
- malla interactiva,
- simulación con impacto en cascada,
- rutas y comparación de escenarios,
- doble programa,
- administración real,
- carga PDF con diagnóstico OCR,
- chat académico con recuperación RAG,
- asesoría solo lectura.

## Archivos clave que deben acompañar la entrega

- `README.md`
- `docs/API_CONTRACT.md`
- `docs/DEMO_GUIDE.md`
- `docs/DEPLOYMENT.md`
- `docs/WINDOWS_QUICKSTART.md`
- `docs/OCR_WINDOWS.md`
- `docs/RAG_EVALUATION.md`
- `docs/MIGRATIONS.md`
- `docs/REQUIREMENTS_AUDIT.md`
- `docs/SUSTENTACION.md`

## Estado actual protegido por pruebas

- backend: autenticación, permisos, grafo, historial, simulación, escenarios, admin, PDF/OCR, RAG y LLM local fallback,
- frontend: lógica crítica de simulación,
- end-to-end: estudiante, administrador, asesor, configuración LLM, diagnóstico OCR y chat académico.

## Antes de enviar a otra persona

1. No incluyas `.env` reales ni secretos.
2. No empaquetes `node_modules`, `dist`, `backend/.venv`, bases de datos locales ni `backend/storage`.
3. Si la demo se moverá a otra máquina, acompáñala con `docs/WINDOWS_QUICKSTART.md`.
4. Si vas a mostrar PDFs escaneados, confirma antes el estado OCR con `npm run demo:check`.
