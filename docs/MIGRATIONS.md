# Migraciones de base de datos — CurriculaPath

CurriculaPath ya tiene una cadena de migraciones con Alembic. Aunque en desarrollo local el backend puede crear tablas automáticamente para facilitar demos, **las migraciones son el contrato oficial del esquema** cuando se trabaja fuera de un entorno descartable.

## Flujo recomendado

```bash
cd backend
alembic upgrade head
python -m app.db.init_db
```

El primer comando crea o actualiza la estructura. El segundo inserta los datos semilla si la base está vacía.

## Migraciones existentes

| Revisión | Propósito |
| --- | --- |
| `69faf3bee003` | Esquema inicial del dominio académico |
| `b81b83d7420f` | Tabla de actividad administrativa |

## Qué se valida automáticamente

La prueba `backend/tests/test_migrations.py`:

1. crea una base SQLite vacía temporal,
2. ejecuta `alembic upgrade head`,
3. compara las tablas migradas con las tablas declaradas por los modelos actuales,
4. confirma que Alembic registró la versión aplicada.

Esto protege contra un problema común: agregar modelos nuevos y olvidar reflejarlos en migraciones.

## Cuándo crear una nueva migración

Crea una migración nueva cuando cambie cualquiera de estos elementos:

- tablas,
- columnas,
- claves foráneas,
- índices,
- constraints,
- enumeraciones persistidas.

Comando sugerido:

```bash
cd backend
alembic revision --autogenerate -m "describe_change"
```

Luego revisa manualmente el archivo generado antes de aplicarlo.

## Regla práctica

- **Demo local rápida:** puedes apoyarte en el bootstrap automático.
- **Entorno compartido o publicación:** usa migraciones siempre.
