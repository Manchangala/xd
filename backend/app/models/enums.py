from enum import StrEnum


class UserRole(StrEnum):
    STUDENT = "student"
    ADMIN = "admin"
    ADVISOR = "advisor"


class DependencyType(StrEnum):
    PREREQUISITO = "prerequisito"
    CORREQUISITO = "correquisito"


class CourseStatus(StrEnum):
    APROBADA = "aprobada"
    REPROBADA = "reprobada"
    EN_CURSO = "en_curso"
    PENDIENTE = "pendiente"
    DISPONIBLE = "disponible"
    BLOQUEADA = "bloqueada"


class ScenarioEventType(StrEnum):
    PERDIDA = "perdida"
    CANCELACION = "cancelacion"
    APLAZAMIENTO = "aplazamiento"
    APROBACION = "aprobacion"


class Difficulty(StrEnum):
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"


class Workload(StrEnum):
    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"


class DocumentProcessingStatus(StrEnum):
    PENDIENTE = "pendiente"
    EXTRAYENDO_TEXTO = "extrayendo_texto"
    OCR = "ocr"
    PROCESANDO = "procesando"
    VALIDANDO = "validando"
    CONVERTIDO_A_GRAFO = "convertido_a_grafo"
    ERROR = "error"


class ExtractionMethod(StrEnum):
    TEXTO_PDF = "texto_pdf"
    OCR_IMAGEN = "ocr_imagen"
    MIXTO = "mixto"


class ChatSender(StrEnum):
    USUARIO = "usuario"
    ASISTENTE = "asistente"


class LocalModel(StrEnum):
    GEMMA = "gemma"
    LLAMA = "llama"
    MISTRAL = "mistral"
    OTRO = "otro"
