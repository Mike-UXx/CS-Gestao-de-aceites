/* ─────────────────────────────────────────────────────────────
   src/features/listagem/types/documento.ts
   Tipos centrais para a listagem e rascunhos de documentos
───────────────────────────────────────────────────────────── */

/** Status possíveis de um documento na plataforma */
export type DocumentoStatus = 'Rascunho' | 'Ativo' | 'Agendado' | 'Concluído' | 'Expirado' | 'Inativo'

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

  /**
   * Lista resumida de colaboradores destinatários — apenas quando modalidadeEnvio === 'pessoa'.
   * Cada item traz o nome completo e a cor do avatar para exibição.
   */
  colaboradoresPreview?: { nome: string; cor: string }[]

  /** Descrição/objetivo do documento */
  descricao?: string

  /**
   * Recorrência do aceite (validade antes de exigir novo aceite).
   * Valores: 'sem_validade' | '3_meses' | '6_meses' | '12_meses' | '24_meses'
   */
  recorrenciaAceite?: string

  /* ── Cobrança automática e prazo de assinatura (config da criação) ── */
  /** Sistema reenvia lembretes aos pendentes */
  cobrancaAutomatica?: boolean
  /** Cadência dos lembretes automáticos, em dias */
  cobrancaFrequenciaDias?: number
  /** Limite de lembretes por destinatário (0 = ilimitado) */
  cobrancaMaxLembretes?: number
  /** Quantos lembretes automáticos já foram disparados */
  lembretesEnviados?: number
  /** Data do próximo lembrete automático (ISO); null = limite atingido */
  proximoLembreteEm?: string | null
  /** Data-limite para os destinatários aceitarem (ISO); null = sem prazo */
  prazoAssinaturaEm?: string | null
  /** Encerramento automático (100% ou prazo) vs manual */
  encerramentoAutomatico?: boolean
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
  Ativo:     'success',
  Agendado:  'processing',
  Concluído: 'default',
  Expirado:  'warning',
  Inativo:   'default',
}

/** Label exibida na UI para cada status */
export const STATUS_LABEL: Record<DocumentoStatus, string> = {
  Rascunho:  'Rascunho',
  Ativo:     'Ativo',
  Agendado:  'Agendado',
  Concluído: 'Concluído',
  Expirado:  'Expirado',
  Inativo:   'Inativo',
}

/** Todos os valores de status (útil para filtros e selects) */
export const DOCUMENTO_STATUS_LIST: DocumentoStatus[] = [
  'Rascunho',
  'Ativo',
  'Agendado',
  'Concluído',
  'Expirado',
  'Inativo',
]
