import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, writeStorage } from '@/lib/storage/localStorage'
import {
  dependenciasMock,
  materiasMock,
} from '@/mocks/courses.mock'
import {
  inscripcionesMock,
  programasMock,
  versionesMock,
} from '@/mocks/programs.mock'
import {
  escenariosMock,
  eventosEscenarioMock,
  pasosRutaMock,
  resultadosEscenarioMock,
  rutasMock,
} from '@/mocks/scenarios.mock'
import {
  chatMensajesMock,
  chatSesionesMock,
  consultasRagMock,
} from '@/mocks/chat.mock'
import {
  chunksMock,
  documentosMock,
  extraccionesMock,
} from '@/mocks/pdf.mock'
import { estudiantesMock, historialesMock, usuariosMock } from '@/mocks/users.mock'
import { defaultSettings } from '@/lib/api/config'

const ensure = <T,>(key: string, value: T) => {
  const current = readStorage<T | null>(key, null)
  if (current === null) {
    writeStorage(key, value)
  }
}

export const seedMockData = () => {
  ensure(STORAGE_KEYS.users, usuariosMock)
  ensure(STORAGE_KEYS.students, estudiantesMock)
  ensure(STORAGE_KEYS.programs, programasMock)
  ensure(STORAGE_KEYS.enrollments, inscripcionesMock)
  ensure(STORAGE_KEYS.versions, versionesMock)
  ensure(STORAGE_KEYS.courses, materiasMock)
  ensure(STORAGE_KEYS.dependencies, dependenciasMock)
  ensure(STORAGE_KEYS.histories, historialesMock)
  ensure(STORAGE_KEYS.scenarios, escenariosMock)
  ensure(STORAGE_KEYS.scenarioEvents, eventosEscenarioMock)
  ensure(STORAGE_KEYS.scenarioResults, resultadosEscenarioMock)
  ensure(STORAGE_KEYS.routes, rutasMock)
  ensure(STORAGE_KEYS.routeSteps, pasosRutaMock)
  ensure(STORAGE_KEYS.documents, documentosMock)
  ensure(STORAGE_KEYS.extractions, extraccionesMock)
  ensure(STORAGE_KEYS.chunks, chunksMock)
  ensure(STORAGE_KEYS.chatSessions, chatSesionesMock)
  ensure(STORAGE_KEYS.chatMessages, chatMensajesMock)
  ensure(STORAGE_KEYS.ragQueries, consultasRagMock)
  ensure(STORAGE_KEYS.settings, defaultSettings)
}
