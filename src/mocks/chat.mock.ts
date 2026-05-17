import type { ChatMensaje, ChatSesion, ConsultaRAG } from '@/types/chat'

export const chatSesionesMock: ChatSesion[] = [
  {
    id: 'chat_1',
    estudianteId: 'student_1',
    titulo: 'Planeación semestre 7',
    fechaInicio: '2026-05-10T14:30:00.000Z',
  },
]

export const chatMensajesMock: ChatMensaje[] = [
  {
    id: 'msg_1',
    chatSesionId: 'chat_1',
    emisor: 'usuario',
    mensaje: '¿Qué materias puedo cursar el próximo semestre?',
    fecha: '2026-05-10T14:30:00.000Z',
  },
  {
    id: 'msg_2',
    chatSesionId: 'chat_1',
    emisor: 'asistente',
    mensaje:
      'Con base en tu historial y la malla activa, puedes cursar Estructuras de Datos, Redes de Computadores, Sistemas Operativos y Economía para Ingenieros. La recomendación prioriza materias que abren nuevas dependencias.',
    fecha: '2026-05-10T14:30:06.000Z',
    fuentesOpcionales: [
      'grafo curricular',
      'historial académico',
      'documento PDF procesado',
    ],
  },
]

export const consultasRagMock: ConsultaRAG[] = [
  {
    id: 'rag_1',
    chatMensajeId: 'msg_2',
    pregunta: '¿Qué materias puedo cursar el próximo semestre?',
    contextoRecuperado:
      'INF102 aprobada/en curso desbloquea INF201. INF203 aprobada habilita INF303. Historial del estudiante indica MAT102 e INF203 aprobadas.',
    fuentesConsultadas: [
      'grafo curricular',
      'historial académico',
      'documento PDF procesado',
    ],
    modeloLocal: 'gemma',
  },
]
