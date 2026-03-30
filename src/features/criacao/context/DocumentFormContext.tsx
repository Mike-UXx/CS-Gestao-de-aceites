import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

/* ─── Tipos ────────────────────────────────────────────────────── */
export interface DeptConfig {
  scrollObrigatorio: boolean
  tempoLeitura: number
}

export interface Step3Config {
  tipoDocumento: 'adesao' | 'ciencia'
  vigenciaInicio: string
  vigenciaFim: string
  dataLancamento: string
  validadeAceite: string          // 'sem_validade' | '3_meses' | '6_meses' | '12_meses' | '24_meses'
  prazoAceite: number
  tempoLeituraGlobal: number
  scrollObrigatorioGlobal: boolean
  personalizarPorDept: boolean
  deptConfig: Record<string, DeptConfig>
}

export interface DocumentFormData {
  // Step 1 — Informações
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
  // Step 3 — Configurações
  tipoDocumento: 'adesao' | 'ciencia'
  vigenciaInicio: string
  vigenciaFim: string
  dataLancamento: string
  validadeAceite: string
  prazoAceite: number
  tempoLeituraGlobal: number
  scrollObrigatorioGlobal: boolean
  personalizarPorDept: boolean
  deptConfig: Record<string, DeptConfig>
}

const INITIAL_STATE: DocumentFormData = {
  file: null,
  fileHash: '',
  fileName: '',
  description: '',
  classificacoes: [],
  gestaoResponsavel: '',
  modalidadeEnvio: 'departamento',
  departamentos: [],
  colaboradores: [],
  tipoDocumento: 'adesao',
  vigenciaInicio: '',
  vigenciaFim: '',
  dataLancamento: '',
  validadeAceite: 'sem_validade',
  prazoAceite: 30,
  tempoLeituraGlobal: 60,
  scrollObrigatorioGlobal: true,
  personalizarPorDept: false,
  deptConfig: {},
}

const DRAFT_KEY = 'gestao_aceites_draft'

/* ─── Actions ──────────────────────────────────────────────────── */
type Action =
  | { type: 'SET_FILE'; file: File; hash: string }
  | { type: 'SET_FIELD'; field: keyof Omit<DocumentFormData, 'file' | 'fileHash' | 'departamentos' | 'colaboradores' | 'classificacoes' | 'deptConfig'>; value: string | number | boolean }
  | { type: 'SET_MULTI'; field: 'departamentos' | 'colaboradores' | 'classificacoes'; value: string[] }
  | { type: 'SET_STEP3'; config: Partial<Step3Config> }
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
    case 'SET_STEP3':
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
  saveDraft: () => void
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

  const saveDraft = () => {
    const { file: _file, ...serializable } = data
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serializable))
  }

  return (
    <DocumentFormContext.Provider value={{ data, dispatch, saveDraft }}>
      {children}
    </DocumentFormContext.Provider>
  )
}

export function useDocumentForm() {
  const ctx = useContext(DocumentFormContext)
  if (!ctx) throw new Error('useDocumentForm must be inside DocumentFormProvider')
  return ctx
}
