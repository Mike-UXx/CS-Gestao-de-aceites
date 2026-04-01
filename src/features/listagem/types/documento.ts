/* ─────────────────────────────────────────────────────────────
   src/features/listagem/types/documento.ts
   Tipos centrais para a listagem e rascunhos de documentos
───────────────────────────────────────────────────────────── */

/** Status possíveis de um documento na plataforma */
export type DocumentoStatus = 'Rascunho' | 'Publicado' | 'Agendado' | 'Expirado'

/** Modalidade de envio do documento */
export type ModalidadeEnvio = 'departamento' | 'pessoa'

/** Tipo de documento (com ou sem controle de versão) */
export type TipoDocumento = 'adesao' | 'ciencia'

/** Representa um documento na listagem */
export interface Documento {
  id: string
  titulo: string
  status: DocumentoStatus
  tipo: TipoDocumento
  modalidadeEnvio: ModalidadeEnvio

  /** Classificações temáticas (ex.: "Política", "LGPD") */
  classificacoes: string[]

  /** Gestão responsável pelo documento */
  gestaoResponsavel: string

  /** Data de criação do rascunho ou documento */
  criadoEm: string // ISO 8601

  /** Data de lançamento/envio — início da vigência ativa */
  dataLancamento: string | null // ISO 8601

  /** Data de expiração da validade do aceite (apenas tipoDocumento === 'adesao') */
  dataExpiracao: string | null // ISO 8601

  /** Quantidade total de destinatários */
  totalDestinatarios: number

  /** Quantidade de aceites já registrados */
  totalAceites: number

  /** Hash SHA-256 do arquivo PDF vinculado */
  fileHash: string | null

  /** Nome original do arquivo PDF */
  fileName: string | null

  /**
   * Labels resumidos dos destinatários para exibição na coluna "Público".
   * Ex.: ['RH', 'Jurídico'] — excedentes são indicados com "+N".
   */
  destinatariosPreview?: string[]
}

/** Filtros aplicados na listagem */
export interface FiltrosListagem {
  busca: string
  status: DocumentoStatus[]
  tipo: TipoDocumento | ''
  gestaoResponsavel: string
  classificacao: string
  dataInicio: string | null
  dataFim: string | null
}

/** Ordenação da tabela */
export type ColunaOrdenacao =
  | 'titulo'
  | 'status'
  | 'dataLancamento'
  | 'totalAceites'
  | 'criadoEm'

export type DirecaoOrdenacao = 'ascend' | 'descend'

export interface OrdenacaoListagem {
  coluna: ColunaOrdenacao
  direcao: DirecaoOrdenacao
}

/* ─── Helpers ─────────────────────────────────────────────── */

/** Mapa de cores AntD para cada status */
export const STATUS_COLOR: Record<DocumentoStatus, string> = {
  Rascunho:  'default',
  Publicado: 'success',
  Agendado:  'processing',
  Expirado:  'error',
}

/** Label exibida na UI para cada status */
export const STATUS_LABEL: Record<DocumentoStatus, string> = {
  Rascunho:  'Rascunho',
  Publicado: 'Publicado',
  Agendado:  'Agendado',
  Expirado:  'Expirado',
}

/** Todos os valores de status (útil para filtros e selects) */
export const DOCUMENTO_STATUS_LIST: DocumentoStatus[] = [
  'Rascunho',
  'Publicado',
  'Agendado',
  'Expirado',
]
