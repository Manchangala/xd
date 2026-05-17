# OCR local en Windows para CurriculaPath

La carga de PDFs con texto ya funciona sin configuración adicional. Esta guía solo aplica si quieres procesar **PDFs escaneados como imagen**.

## Objetivo

Dejar disponible en el equipo:

1. el ejecutable `tesseract`,
2. el idioma español `spa`,
3. la carpeta `tessdata` visible para PyMuPDF.

## Pasos recomendados

1. Instala **Tesseract OCR** para Windows.
2. Verifica que `tesseract.exe` quede disponible en `PATH`.
3. Asegúrate de tener el archivo `spa.traineddata` dentro de la carpeta `tessdata`.
4. Si PyMuPDF no encuentra los datos de idioma, define `TESSDATA_PREFIX` apuntando a esa carpeta.
5. Reinicia el backend y vuelve a abrir `/admin/cargar-pdf`.

## Comprobaciones rápidas

En una terminal nueva:

```powershell
tesseract --version
tesseract --list-langs
```

El segundo comando debe mostrar al menos:

```text
eng
spa
```

Si `spa` no aparece, CurriculaPath seguirá mostrando el diagnóstico OCR como incompleto para PDFs escaneados en español.

## Ruta típica en Windows

En muchas instalaciones la carpeta de idiomas queda en:

```text
C:\Program Files\Tesseract-OCR\tessdata
```

Si necesitas registrar la variable de entorno:

```powershell
setx TESSDATA_PREFIX "C:\Program Files\Tesseract-OCR\tessdata"
```

Después abre una terminal nueva y vuelve a ejecutar:

```powershell
tesseract --list-langs
```

## Cómo saber si ya quedó bien

En CurriculaPath:

1. entra como administrador,
2. abre `/admin/cargar-pdf`,
3. revisa la tarjeta **OCR local**.

Cuando todo está listo, la tarjeta debe indicar **Listo**. Si falta algo, la misma pantalla enumera el problema y los próximos pasos.

Si ya habías procesado un PDF escaneado antes de instalar OCR:

1. pulsa **Actualizar diagnóstico**,
2. confirma que la tarjeta ya diga **Listo**,
3. usa **Reintentar OCR** en el mismo documento.

No necesitas volver a subir el PDF.

## Qué no hace esta guía

- No instala servicios cloud.
- No conecta APIs pagas.
- No cambia el flujo de PDFs con texto nativo.
- No sustituye la revisión manual antes de guardar una malla.
