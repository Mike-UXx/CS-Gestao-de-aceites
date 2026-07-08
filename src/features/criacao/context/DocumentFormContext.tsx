import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

/* ─── Tipos ────────────────────────────────────────────────────── */
export interface DeptConfig {
  scrollObrigatorio: boolean
  tempoLeitura: number
}

export interface DocumentFormData {
  // Step 1 — Informações Básicas
  file: File | null
  fileHash: string
  fileName: string
  description: string
  classificacoes: string[]
  gestaoResponsavel: string

  // Step 2 — Destinatários
  modalidadeEnvio: 'departamento' | 'colaborador'
  departamentos: string[]
  colaboradores: string[]

  // Step 3 — Regras e Envio
  exigeAceite: boolean                // "Exigir aceite formal do colaborador?"
  renovacaoAtiva: boolean             // se o checkbox de renovação está habilitado
  renovacaoAceite: string             // 'sem_recorrencia' | '6_meses' | '12_meses' | '24_meses' | 'personalizado'
  renovacaoMesesPersonalizado: number // valor em meses quando renovacaoAceite === 'personalizado'
  tempoLeituraGlobal: number          // 0 = sem trava
  scrollObrigatorioGlobal: boolean
  personalizarPorDept: boolean
  deptConfig: Record<string, DeptConfig>
  canalEmail: boolean
  canalWhatsapp: boolean

  // Step 3 — Lembretes e prazo de assinatura (só relevante quando exigeAceite)
  cobrancaAutomatica: boolean          // lembretes automáticos aos pendentes (EP06 · US 6.1)
  cobrancaFrequenciaDias: number       // periodicidade em dias (1 = diário | 3 | 7)
  cobrancaMaxLembretes: number         // limite por destinatário (0 = ilimitado; EP06 usa sempre 0)
  prazoAssinaturaAtivo: boolean        // há data-limite para aceitar?
  prazoAssinaturaDias: number          // aceitar em até N dias após o envio
  encerramentoAutomatico: boolean      // true = encerra ao 100% de aceite ou no prazo; false = manual

  // Step 4 — Validade e Envio
  possuiValidade: boolean             // "Este documento possui prazo de validade?"
  validadeInicio: string              // ISO 8601
  validadeFim: string                 // ISO 8601
  envioImediato: boolean              // true = enviar agora; false = agendar
  dataLancamento: string              // ISO 8601 — só quando envioImediato === false
}

const INITIAL_STATE: DocumentFormData = {
  // Step 1
  file: null,
  fileHash: '',
  fileName: '',
  description: '',
  classificacoes: [],
  gestaoResponsavel: '',
  // Step 2
  modalidadeEnvio: 'departamento',
  departamentos: [],
  colaboradores: [],
  // Step 3 — tudo OFF por padrão
  exigeAceite: false,
  renovacaoAtiva: false,
  renovacaoAceite: 'sem_recorrencia',
  renovacaoMesesPersonalizado: 0,
  tempoLeituraGlobal: 0,
  scrollObrigatorioGlobal: false,
  personalizarPorDept: false,
  deptConfig: {},
  canalEmail: true,
  canalWhatsapp: false,
  // Step 3 — Lembretes e prazo (EP06 · US 6.1: desabilitado por padrão, sem limite)
  cobrancaAutomatica: false,
  cobrancaFrequenciaDias: 3,
  cobrancaMaxLembretes: 0,
  prazoAssinaturaAtivo: false,
  prazoAssinaturaDias: 7,
  encerramentoAutomatico: true,
  // Step 4 — tudo OFF por padrão
  possuiValidade: false,
  validadeInicio: '',
  validadeFim: '',
  envioImediato: true,
  dataLancamento: '',
}

const DRAFT_KEY = 'gestao_aceites_draft'

/* ─── Actions ──────────────────────────────────────────────────── */
type Action =
  | { type: 'SET_FILE'; file: File; hash: string }
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'SET_MULTI'; field: 'departamentos' | 'colaboradores' | 'classificacoes'; value: string[] }
  | { type: 'SET_STEP'; config: Partial<DocumentFormData> }
  | { type: 'LOAD_DRAFT'; draft: Partial<DocumentFormData> }
  | { type: 'RESET' }

function reducer(state: DocumentFormData, action: Action): DocumentFormData {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, file: action.file, fileHash: action.hash, fileName: action.file.name }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_MULTI':
      return { ...state, [action.field]: action.value }
    case 'SET_STEP':
      return { ...state, ...action.config }
    case 'LOAD_DRAFT':
      return { ...state, ...action.draft }
    case 'RESET':
      return INITIAL_STATE
    default:
      return state
  }
}

/* ─── Context ──────────────────────────────────────────────────── */
interface DocumentFormContextValue {
  data: DocumentFormData
  dispatch: React.Dispatch<Action>
  saveDraft: (stepAtual?: number) => void
  clearDraft: () => void
}

const DocumentFormContext = createContext<DocumentFormContextValue | null>(null)

export function DocumentFormProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, INITIAL_STATE)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DocumentFormData>
        dispatch({ type: 'LOAD_DRAFT', draft: parsed })
      }
    } catch {
      // ignora rascunhos corrompidos
    }
  }, [])

  const saveDraft = (stepAtual = 0) => {
    const { file: _file, ...serializable } = data
    const existingRaw = localStorage.getItem(DRAFT_KEY)
    const existingId  = existingRaw
      ? (JSON.parse(existingRaw) as Record<string, unknown>)._draftId
      : null
    const meta = {
      _draftId:   existingId ?? `draft-${Date.now().toString(36)}`,
      _savedAt:   new Date().toISOString(),
      _stepAtual: stepAtual,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...serializable, ...meta }))
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
  }

  return (
    <DocumentFormContext.Provider value={{ data, dispatch, saveDraft, clearDraft }}>
      {children}
    </DocumentFormContext.Provider>
  )
}

export function useDocumentForm() {
  const ctx = useContext(DocumentFormContext)
  if (!ctx) throw new Error('useDocumentForm must be inside DocumentFormProvider')
  return ctx
}
