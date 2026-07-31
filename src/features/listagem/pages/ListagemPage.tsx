/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Listagem de documentos — carrossel de rascunhos + tabela
───────────────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Table, Button, Tag, Input, Space, Typography,
  Tooltip, message, Progress, Empty, Avatar,
  Dropdown, Tabs, Modal, Drawer, Checkbox, Radio,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, SearchOutlined,
  EditOutlined, DeleteOutlined, MoreOutlined,
  CopyOutlined,
  LeftOutlined, RightOutlined, CloseOutlined,
  ExclamationCircleOutlined, HistoryOutlined,
  HolderOutlined, TeamOutlined, AuditOutlined, AppstoreAddOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Documento, DocumentoStatus, STATUS_LABEL,
} from '../types/documento'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'
import { useDocumentForm, type DocumentFormData } from '@/features/criacao/context/DocumentFormContext'
import { PendenciasDrawer } from '@/features/detalhes/components/PendenciasDrawer'
import { useRole } from '@/auth/RoleContext'

dayjs.locale('pt-br')
dayjs.extend(relativeTime)

/* ── Constantes ─────────────────────────────────────────────── */
const FONT      = "'Montserrat', sans-serif"
const DRAFT_KEY = 'gestao_aceites_draft'

const STEP_ROUTES: Record<number, string> = {
  0: '/documentos/criar/informacoes',
  1: '/documentos/criar/destinatarios',
  2: '/documentos/criar/regras',
  3: '/documentos/criar/revisao',
}

const CLASSIF_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))

const GESTAO_MAP = Object.fromEntries(GESTOES_RESPONSAVEIS.map((g) => [g.value, g.label]))

/* ── Cor por tipo de classificação ──────────────────────────── */
const CLASSIF_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  'politicas':         { bg: '#FFF7E6', border: '#FFD591', color: '#D46B08' },
  'procedimentos':     { bg: '#E6FFFB', border: '#87E8DE', color: '#08979C' },
  'cartilhas':         { bg: '#F9F0FF', border: '#D3ADF7', color: '#722ED1' },
  'manuais':           { bg: '#FCFFE6', border: '#EAFF8F', color: '#7CB305' },
  'comunicacao-interna':{ bg: '#FFF0F6', border: '#FFB8D8', color: '#C41D7F' },
}
const CLASSIF_COLOR_DEFAULT = { bg: '#EEF2FF', border: '#C3CAF5', color: '#263072' }

/* ── Tipos ──────────────────────────────────────────────────── */
type DocumentoComMeta = Documento & { _stepAtual?: number }

/* ── Colunas disponíveis para customização ──────────────────── */
const AVAILABLE_COLUMNS = [
  { key: 'classificacoes', label: 'Classificações' },
  { key: 'responsavel',    label: 'Responsável' },
  { key: 'publico',        label: 'Destinatários' },
  { key: 'data_envio',     label: 'Data de envio' },
  { key: 'vigencia_fim',   label: 'Vigência' },
  { key: 'progresso',      label: 'Barra de progresso' },
  { key: 'status',         label: 'Status' },
  { key: 'recorrencia',    label: 'Recorrência' },
]

/* ── Abas padrão ────────────────────────────────────────────── */
type SmartFilters = {
  tipo: string       // 'todos' | 'aceites' | 'leitura'
  prazo: string      // 'todos' | 'pendentes' | 'vigencia_proxima' | 'requer_atualizacao' | 'expirados'
  publico: string    // 'todos' | 'departamentos' | 'destinatarios'
}
type CustomTab = { key: string; title: string; columns: string[]; smartFilters: SmartFilters }

/* ── Helpers ────────────────────────────────────────────────── */
const SEA_GREEN = '#20B2AA'

function barColor(tipo: Documento['tipo'], status: DocumentoStatus, pct: number): string {
  if (status === 'Concluído') return '#BFBFBF'
  if (pct === 0) return '#D9D9D9'
  return tipo === 'adesao' ? colorTokens.primary : SEA_GREEN
}

/* ── SLA/prazo → texto + cor (verde/neutro no prazo, laranja vencendo, vermelho atrasado) ── */
function slaInfo(deadlineISO?: string): { text: string; color: string } | null {
  if (!deadlineISO) return null
  const dias = dayjs(deadlineISO).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (dias < 0) return { text: `atrasado ${Math.abs(dias)}d`, color: '#CF1322' }
  if (dias === 0) return { text: 'vence hoje', color: '#D46B08' }
  if (dias <= 2) return { text: `vence em ${dias}d`, color: '#D46B08' }
  return { text: `${dias}d restantes`, color: '#8C8C8C' }
}

/* ── Resumo do andamento da aprovação (badges dos cards do carrossel) ── */
function aprovacaoResumo(doc: Documento): { progresso: string; concluido: boolean; sla: { text: string; color: string } | null } {
  const aprovadores = doc.aprovadores ?? []
  if (doc.tipoRevisao === 'etapas') {
    const etapa = doc.etapaAtual ?? 0
    const concluido = aprovadores.length > 0 && etapa >= aprovadores.length
    return {
      progresso: concluido ? 'Aprovado' : (aprovadores.length ? `Etapa ${etapa + 1}/${aprovadores.length}` : 'Em aprovação'),
      concluido,
      sla: concluido ? null : slaInfo((doc.slaEtapas ?? [])[etapa]),
    }
  }
  const aprovados = (doc.aprovadosPor ?? []).length
  const concluido = aprovadores.length > 0 && aprovados >= aprovadores.length
  return {
    progresso: aprovadores.length ? `${aprovados}/${aprovadores.length} aprovaram` : 'Em aprovação',
    concluido,
    sla: concluido ? null : slaInfo(doc.slaEm),
  }
}

/* ── Verifica se um documento atende aos filtros inteligentes de uma aba customizada ── */
function matchesSmartFilters(doc: Documento, sf: SmartFilters): boolean {
  // Tipo de documento
  if (sf.tipo === 'aceites' && doc.tipo !== 'adesao') return false
  if (sf.tipo === 'leitura' && doc.tipo !== 'ciencia') return false
  // Prazo e cronograma
  if (sf.prazo === 'pendentes' && doc.totalAceites >= doc.totalDestinatarios) return false
  if (sf.prazo === 'vigencia_proxima') {
    if (!doc.dataExpiracao) return false
    if (dayjs(doc.dataExpiracao).diff(dayjs(), 'day') > 30) return false
  }
  if (sf.prazo === 'requer_atualizacao' && doc.status !== 'Expirado') return false
  if (sf.prazo === 'expirados' && doc.status !== 'Expirado') return false
  // Público-alvo
  if (sf.publico === 'departamentos' && doc.modalidadeEnvio !== 'departamento') return false
  if (sf.publico === 'destinatarios' && doc.modalidadeEnvio !== 'pessoa') return false
  return true
}

function readDraftFromStorage(): DocumentoComMeta | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Record<string, unknown>
    if (!p.fileName && !p.fileHash) return null
    const depts = (p.departamentos as string[]) ?? []
    const colab = (p.colaboradores as string[]) ?? []
    return {
      id:                   (p._draftId as string) ?? 'draft-local',
      titulo:               (p.fileName as string) || 'Rascunho sem título',
      status:               'Rascunho',
      tipo:                 (p.tipoDocumento as Documento['tipo']) ?? 'adesao',
      modalidadeEnvio:      (p.modalidadeEnvio as Documento['modalidadeEnvio']) ?? 'departamento',
      classificacoes:       (p.classificacoes as string[]) ?? [],
      gestaoResponsavel:    (p.gestaoResponsavel as string) ?? '',
      criadoEm:             (p._savedAt as string) ?? new Date().toISOString(),
      dataLancamento:       (p.dataLancamento as string) || null,
      dataExpiracao:        null,
      totalDestinatarios:   depts.length + colab.length,
      totalAceites:         0,
      fileHash:             (p.fileHash as string) ?? null,
      fileName:             (p.fileName as string) ?? null,
      destinatariosPreview: depts.length ? depts.slice(0, 2) : colab.slice(0, 2),
      _stepAtual:           (p._stepAtual as number) ?? 0,
    }
  } catch { return null }
}

/* ── Duplicar documento: mapeia um registro para o estado inicial do wizard ── */
function buildDuplicateConfig(doc: Documento): Partial<DocumentFormData> {
  const exigeAceite = doc.tipo === 'adesao'

  let renovacaoAtiva = false
  let renovacaoAceite = 'sem_recorrencia'
  let renovacaoMesesPersonalizado = 0
  if (exigeAceite) {
    switch (doc.recorrenciaAceite) {
      case '6_meses':
      case '12_meses':
      case '24_meses':
        renovacaoAtiva = true
        renovacaoAceite = doc.recorrenciaAceite
        break
      case '3_meses':
        renovacaoAtiva = true
        renovacaoAceite = 'personalizado'
        renovacaoMesesPersonalizado = 3
        break
    }
  }

  return {
    description: doc.descricao ?? '',
    classificacoes: [...doc.classificacoes],
    gestaoResponsavel: doc.gestaoResponsavel,
    modalidadeEnvio: doc.modalidadeEnvio === 'pessoa' ? 'colaborador' : 'departamento',
    exigeAceite,
    renovacaoAtiva,
    renovacaoAceite,
    renovacaoMesesPersonalizado,
  }
}

/* ── CSS ─────────────────────────────────────────────────────── */
const PAGE_CSS = `
  .listagem-table .ant-table-thead > tr > th {
    background: #fff !important;
    font-family: ${FONT} !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    color: ${colorTokens.textSecondary} !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    border-bottom: 1.5px solid #EBEBEB !important;
    padding: 10px 16px !important;
  }
  .listagem-table .ant-table-tbody > tr > td {
    font-family: ${FONT} !important;
    font-size: 13px !important;
    padding: 20px 16px !important;
    border-bottom: 1px solid #F5F5F5 !important;
    vertical-align: middle !important;
  }
  .listagem-table .ant-table-tbody > tr:hover > td {
    background: #F7F8FF !important;
    transition: background 0.15s ease !important;
  }
  .listagem-table .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }
  .listagem-table .ant-table-container { border-radius: 0 !important; }
  /* ── Tabs — card style (DS CS: "Tabs / Card", nó 513:39330) ──
     A barra NÃO tem fundo/painel branco próprio: só um baseline #F0F0F0.
     Cada aba é um card (borda l/r/t, raio 6px, gutter 2px). A aba ativa usa a
     cor da superfície do card (#fff) e cobre o baseline, conectando ao conteúdo. */
  .listagem-tabs .ant-tabs-nav {
    margin-bottom: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
  }
  /* Sem baseline: a barra não tem painel próprio — as abas pousam sobre o
     fundo da página e a ativa entra no card da tabela (efeito marcador). */
  .listagem-tabs .ant-tabs-nav::before {
    display: none !important;
  }
  .listagem-tabs .ant-tabs-nav-wrap {
    padding: 0 !important;
  }
  .listagem-tabs .ant-tabs-tab {
    margin: 0 2px 0 0 !important;
    padding: 8px 16px !important;
    font-family: ${FONT} !important;
    font-size: 14px !important;
    font-weight: 400 !important;
    color: rgba(0, 0, 0, 0.88) !important;
    background: rgba(0, 0, 0, 0.02) !important;
    border: 1px solid #F0F0F0 !important;
    border-radius: 6px 6px 0 0 !important;
    transition: color 0.2s, background 0.2s !important;
  }
  .listagem-tabs .ant-tabs-tab:hover {
    color: ${colorTokens.primary} !important;
  }
  .listagem-tabs .ant-tabs-tab-active {
    background: #fff !important;
    border-color: #F0F0F0 !important;
    border-bottom-color: #fff !important;
    margin-bottom: -1px !important;
    position: relative !important;
    z-index: 2 !important;
  }
  .listagem-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${colorTokens.primary} !important;
    font-weight: 600 !important;
  }
  .listagem-tabs .ant-tabs-tab .ant-tabs-tab-btn {
    color: inherit !important;
  }
  .listagem-tabs .ant-tabs-ink-bar { display: none !important; }
  /* Botão "..." (abas ocultas no responsivo) — mesmo formato card */
  .listagem-tabs .ant-tabs-nav-more {
    padding: 8px 12px !important;
    border: 1px solid #F0F0F0 !important;
    border-radius: 6px 6px 0 0 !important;
    background: rgba(0, 0, 0, 0.02) !important;
    color: rgba(0, 0, 0, 0.65) !important;
    margin-left: 2px !important;
  }
  /* ── Badge pill ──
     Sem forçar width/overflow: isso quebrava a medição de overflow do rc-tabs
     (as abas eram cortadas em vez de colapsarem no "..."). Só evitamos quebra
     de linha do rótulo; a aba dimensiona ao conteúdo naturalmente. */
  .listagem-tabs .ant-tabs-tab .ant-tabs-tab-btn {
    white-space: nowrap !important;
  }
  /* Pill badge — inativa */
  .tab-pill {
    display: inline-block !important;
    padding: 1px 7px !important;
    border-radius: 20px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    font-family: ${FONT} !important;
    background: rgba(0, 0, 0, 0.06) !important;
    color: rgba(0, 0, 0, 0.65) !important;
    line-height: 18px !important;
    margin-left: 6px !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
    transition: background 0.2s, color 0.2s !important;
  }
  /* Pill badge — ativa (DS Badge: bg Blue/1, texto Blue/6) */
  .listagem-tabs .ant-tabs-tab-active .tab-pill {
    background: #E8F6FD !important;
    color: ${colorTokens.primary} !important;
  }
  /* Aba "+" (adicionar aba personalizada) — card discreto tracejado */
  .listagem-tabs [data-node-key="__add__"] {
    padding: 8px 12px !important;
    color: ${colorTokens.textSecondary} !important;
    background: transparent !important;
    border: 1px dashed #D9D9D9 !important;
    border-radius: 6px 6px 0 0 !important;
    margin: 0 0 0 2px !important;
  }
  .listagem-tabs [data-node-key="__add__"]:hover {
    color: ${colorTokens.primary} !important;
    border-color: ${colorTokens.primary} !important;
  }
  .listagem-tabs [data-node-key="__add__"].ant-tabs-tab-active {
    background: transparent !important;
    border: 1px dashed #D9D9D9 !important;
    color: ${colorTokens.textSecondary} !important;
  }
  .listagem-tabs [data-node-key="__add__"].ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${colorTokens.textSecondary} !important;
    font-weight: 500 !important;
  }
  /* × fechar aba customizada */
  .tab-close-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 14px !important;
    height: 14px !important;
    border-radius: 50% !important;
    margin-left: 6px !important;
    color: #BFBFBF !important;
    font-size: 10px !important;
    cursor: pointer !important;
    transition: color 0.15s !important;
    vertical-align: middle !important;
  }
  .tab-close-btn:hover {
    color: #FF4D4F !important;
  }
  .classif-select .ant-select-selector,
  .filter-select .ant-select-selector {
    border-radius: 8px !important;
    font-family: ${FONT} !important;
    font-size: 13px !important;
    min-height: 36px !important;
    align-items: center !important;
    border-color: #D9D9D9 !important;
  }
  .filter-select .ant-select-selection-placeholder,
  .filter-select .ant-select-selection-item {
    font-family: ${FONT} !important;
    font-size: 13px !important;
  }
  .filter-rangepicker {
    border-radius: 8px !important;
    border-color: #D9D9D9 !important;
  }
  .filter-rangepicker input {
    font-family: ${FONT} !important;
    font-size: 13px !important;
  }
  .modal-draft .ant-modal-content,
  .encerrar-modal .ant-modal-content {
    border-radius: 12px !important;
    font-family: ${FONT} !important;
  }
  .modal-draft .ant-modal-header,
  .encerrar-modal .ant-modal-header {
    border-bottom: none !important;
    padding: 24px 24px 8px !important;
  }
  .modal-draft .ant-modal-title,
  .encerrar-modal .ant-modal-title {
    font-family: ${FONT} !important;
    font-weight: 700 !important;
    font-size: 16px !important;
    color: ${colorTokens.textPrimary} !important;
  }
  .modal-draft .ant-modal-body,
  .encerrar-modal .ant-modal-body {
    padding: 0 24px !important;
    font-family: ${FONT} !important;
  }
  .modal-draft .ant-modal-footer,
  .encerrar-modal .ant-modal-footer {
    border-top: none !important;
    padding: 16px 24px 24px !important;
  }
  /* Carrossel de rascunhos — scroll suave */
  .drafts-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .drafts-scroll::-webkit-scrollbar { display: none; }
  /* Hover discreto nos cards do carrossel */
  .carousel-card { transition: background 0.15s ease; }
  .carousel-card:hover { background: #FAFAFA; }
`

/* ═══════════════════════════════════════════════════════════════
   Componente principal
═══════════════════════════════════════════════════════════════ */
export function ListagemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dispatch } = useDocumentForm()
  const { can, podeVerGestao } = useRole()

  const [search,           setSearch]           = useState('')
  const [activeTab,        setActiveTab]        = useState('todos')
  const [carouselTab,      setCarouselTab]      = useState<'rascunho' | 'aprovacao'>('rascunho')
  const [pagination,       setPagination]       = useState<TablePaginationConfig>({ current: 1, pageSize: 5 })
  const [encerrarTarget,        setEncerrarTarget]        = useState<DocumentoComMeta | null>(null)
  const [deleteTarget,          setDeleteTarget]          = useState<DocumentoComMeta | null>(null)
  const [inativarTarget,        setInativarTarget]        = useState<DocumentoComMeta | null>(null)
  const [inativarJustificativa, setInativarJustificativa] = useState('')
  const [deletarAgendadoTarget, setDeletarAgendadoTarget] = useState<DocumentoComMeta | null>(null)
  const [novaVersaoTarget,      setNovaVersaoTarget]      = useState<DocumentoComMeta | null>(null)
  const [novaVersaoMotivo,      setNovaVersaoMotivo]      = useState('')
  const [relatoriosTarget,      setRelatoriosTarget]      = useState<DocumentoComMeta | null>(null)
  const [customTabs,            setCustomTabs]            = useState<CustomTab[]>([])
  const [tabDrawerOpen,         setTabDrawerOpen]         = useState(false)
  const [newTabTitle,           setNewTabTitle]           = useState('')
  const [newTabColumns,         setNewTabColumns]         = useState<string[]>(['classificacoes', 'publico', 'status'])
  const [newTabSmartFilters,     setNewTabSmartFilters]     = useState<SmartFilters>({ tipo: 'todos', prazo: 'todos', publico: 'todos' })
  const [newTabColumnOrder,     setNewTabColumnOrder]     = useState<string[]>(AVAILABLE_COLUMNS.map((c) => c.key))
  const [draggingColIdx,        setDraggingColIdx]        = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  /* ── CSS ── */
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'listagem-styles'
    el.textContent = PAGE_CSS
    document.head.appendChild(el)
    return () => { document.getElementById('listagem-styles')?.remove() }
  }, [])

  /* ── Toast "Rascunho salvo" ── */
  useEffect(() => {
    if ((location.state as { draftSaved?: boolean })?.draftSaved) {
      message.success('Rascunho salvo com sucesso!', 3)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  /* ── Rascunhos (mock + localStorage) ── */
  const demoRascunhos = useMemo<DocumentoComMeta[]>(() => [
    {
      id: 'draft-demo-1', titulo: 'Termo de Confidencialidade', status: 'Rascunho',
      tipo: 'adesao', modalidadeEnvio: 'departamento', classificacoes: ['procedimentos'],
      gestaoResponsavel: 'juridico', criadoEm: dayjs().subtract(2, 'hours').toISOString(),
      dataLancamento: null, dataExpiracao: null, totalDestinatarios: 0, totalAceites: 0,
      fileHash: null, fileName: 'termo-confidencialidade.pdf', _stepAtual: 1,
    },
    {
      id: 'draft-demo-2', titulo: 'Termo de Aceite', status: 'Rascunho',
      tipo: 'ciencia', modalidadeEnvio: 'pessoa', classificacoes: [],
      gestaoResponsavel: '', criadoEm: dayjs().subtract(16, 'hours').toISOString(),
      dataLancamento: null, dataExpiracao: null, totalDestinatarios: 0, totalAceites: 0,
      fileHash: null, fileName: 'termo-aceite.pdf', _stepAtual: 0,
    },
    {
      id: 'draft-demo-3', titulo: 'Política de Privacidade', status: 'Rascunho',
      tipo: 'adesao', modalidadeEnvio: 'departamento', classificacoes: ['politicas'],
      gestaoResponsavel: 'juridico', criadoEm: dayjs().subtract(15, 'days').toISOString(),
      dataLancamento: null, dataExpiracao: null, totalDestinatarios: 0, totalAceites: 0,
      fileHash: null, fileName: 'politica-privacidade.pdf', _stepAtual: 2,
    },
  ], [])

  const [rascunhos, setRascunhos] = useState<DocumentoComMeta[]>([])

  useEffect(() => {
    const localDraft = readDraftFromStorage()
    const list = [...demoRascunhos]
    if (localDraft) list.unshift(localDraft)
    setRascunhos(list)
  }, [demoRascunhos])

  /* ── Documentos da tabela — tudo menos Rascunho. "Em aprovação" (Em revisão) é SEMPRE
        visível (o Gestor acompanha o fluxo e publica/agenda); os demais status respeitam
        o escopo por gestão do perfil. ── */
  const tableDocumentos = useMemo(() => {
    return MOCK_DOCUMENTOS.filter((d) => d.status !== 'Rascunho' && (d.status === 'Em revisão' || podeVerGestao(d.gestaoResponsavel)))
  }, [podeVerGestao])

  /* ── Documentos em aprovação (carrossel) — sem escopo por gestão: o Gestor precisa
        acompanhar todos os documentos em aprovação para publicá-los após aprovados. ── */
  const emAprovacao = useMemo(
    () => MOCK_DOCUMENTOS.filter((d) => d.status === 'Em revisão'),
    [],
  )

  /* ── Filtragem da tabela ── */
  const filtered = useMemo(() => tableDocumentos.filter((doc) => {
    const tab = (() => {
      if (activeTab === 'todos')         return true
      if (activeTab === 'exigem_aceite') return doc.tipo === 'adesao'
      if (activeTab === 'informativos')  return doc.tipo === 'ciencia'
      const custom = customTabs.find((t) => t.key === activeTab)
      if (!custom) return true
      return matchesSmartFilters(doc, custom.smartFilters)
    })()
    const txt = !search || doc.titulo.toLowerCase().includes(search.toLowerCase())
    return tab && txt
  }), [tableDocumentos, activeTab, search, customTabs])

  const hasFilters = !!search

  function clearFilters() {
    setSearch('')
    setPagination((p) => ({ ...p, current: 1 }))
  }

  /* ── Contadores por status ── */
  const counts = useMemo(() => ({
    todos:          tableDocumentos.length,
    exigem_aceite:  tableDocumentos.filter((d) => d.tipo === 'adesao').length,
    informativos:   tableDocumentos.filter((d) => d.tipo === 'ciencia').length,
  }), [tableDocumentos])

  /* ── Tabs (natureza + customizáveis) ── */
  function tabLabel(label: string, count: number) {
    return (
      <span style={{ fontFamily: FONT, whiteSpace: 'nowrap' }}>
        {label}
        <span className="tab-pill">{count}</span>
      </span>
    )
  }

  const tabItems = useMemo(() => [
    { key: 'todos',         label: tabLabel('Todos',          counts.todos) },
    { key: 'exigem_aceite', label: tabLabel('Exigem aceite',  counts.exigem_aceite) },
    { key: 'informativos',  label: tabLabel('Informativos',   counts.informativos) },
    ...customTabs.map((t) => ({
      key: t.key,
      label: (
        <span style={{ fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 0, whiteSpace: 'nowrap' }}>
          {t.title}
          <span className="tab-pill">{tableDocumentos.filter((d) => matchesSmartFilters(d, t.smartFilters)).length}</span>
          <span
            className="tab-close-btn"
            onClick={(e) => { e.stopPropagation(); handleRemoveTab(t.key) }}
          >
            <CloseOutlined />
          </span>
        </span>
      ),
    })),
    // "+" sempre como última aba — abre o drawer de criação
    ...(customTabs.length < 3 ? [{
      key: '__add__',
      label: (
        <Tooltip title="Criar aba personalizada" placement="bottom" styles={{ body: { fontFamily: FONT, fontSize: 12 } }}>
          <PlusOutlined style={{ fontSize: 13 }} />
        </Tooltip>
      ),
    }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [counts, customTabs, tableDocumentos])

  /* ── Ações: duplicar documento ── */
  const handleDuplicar = useCallback((record: DocumentoComMeta) => {
    dispatch({ type: 'RESET' })
    dispatch({ type: 'SET_STEP', config: buildDuplicateConfig(record) })
    navigate('/documentos/criar/informacoes')
    message.success(`Novo documento criado a partir de "${record.titulo}". Envie o novo arquivo e revise as informações.`, 4)
  }, [dispatch, navigate])

  /* ── Ações: excluir rascunho ── */
  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return
    if (deleteTarget.id.startsWith('draft-local') || deleteTarget.id.startsWith('draft-')) {
      localStorage.removeItem(DRAFT_KEY)
    }
    setRascunhos((prev) => prev.filter((d) => d.id !== deleteTarget.id))
    setDeleteTarget(null)
    message.success('Rascunho excluído.')
  }, [deleteTarget])

  /* ── Ações: cancelar envio para aprovação (volta a Rascunho) ── */
  const handleCancelAprovacao = useCallback((doc: Documento) => {
    Modal.confirm({
      title: 'Cancelar envio para aprovação?',
      icon: <ExclamationCircleOutlined style={{ color: '#FA8C16' }} />,
      content: `"${doc.titulo}" voltará para Rascunho e sairá da fila dos aprovadores.`,
      okText: 'Cancelar aprovação',
      cancelText: 'Voltar',
      okButtonProps: { danger: true },
      onOk: () => message.success('Documento devolvido para Rascunho.'),
    })
  }, [])

  /* ── Ações: encerrar vigência ── */
  const handleConfirmEncerrar = useCallback(() => {
    if (!encerrarTarget) return
    message.success(`Vigência de "${encerrarTarget.titulo}" encerrada. Documento movido para Concluídos.`, 4)
    setEncerrarTarget(null)
  }, [encerrarTarget])

  /* ── Ações: inativar documento ── */
  const handleConfirmInativar = useCallback(() => {
    if (!inativarTarget || !inativarJustificativa.trim()) return
    message.success(`Documento "${inativarTarget.titulo}" inativado com sucesso.`, 4)
    setInativarTarget(null)
    setInativarJustificativa('')
  }, [inativarTarget, inativarJustificativa])

  /* ── Ações: excluir agendado ── */
  const handleConfirmDeletarAgendado = useCallback(() => {
    if (!deletarAgendadoTarget) return
    message.success(`Documento "${deletarAgendadoTarget.titulo}" excluído permanentemente.`, 4)
    setDeletarAgendadoTarget(null)
  }, [deletarAgendadoTarget])

  /* ── Ações: nova versão ── */
  const handleConfirmNovaVersao = useCallback(() => {
    if (!novaVersaoTarget || !novaVersaoMotivo.trim()) return
    message.success(`Nova versão de "${novaVersaoTarget.titulo}" criada com sucesso. O documento foi enviado para revisão.`, 5)
    setNovaVersaoTarget(null)
    setNovaVersaoMotivo('')
  }, [novaVersaoTarget, novaVersaoMotivo])

  /* ── Carrossel: scroll ── */
  const scrollCarousel = useCallback((dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }, [])

  /* ── Menu de ações por status (conforme PDF handoff) ── */
  /* Chaves de ações de escrita — ocultadas para perfis sem 'documento:gerenciar' */
  const WRITE_ACTION_KEYS = new Set(['editar-doc', 'editar', 'nova-versao', 'inativar', 'excluir', 'duplicar'])

  function actionsMenu(record: DocumentoComMeta): MenuProps['items'] {
    const duplicar = { key: 'duplicar', icon: <CopyOutlined />, label: 'Duplicar documento', onClick: () => handleDuplicar(record) }
    const full = ((): MenuProps['items'] => {
    switch (record.status) {
      case 'Em revisão':
        return [
          { key: 'revisar', icon: <AuditOutlined />, label: 'Abrir aprovação', onClick: () => navigate(`/documentos/${record.id}/aprovacao`) },
        ]
      case 'Ativo':
        return [
          { key: 'editar-doc',  icon: <EditOutlined />,               label: 'Editar detalhes',   onClick: () => navigate(`/documentos/${record.id}/editar`) },
          { type: 'divider' as const },
          { key: 'nova-versao', icon: <HistoryOutlined />,             label: 'Nova versão',       onClick: () => { setNovaVersaoTarget(record); setNovaVersaoMotivo('') } },
          { type: 'divider' as const },
          { key: 'relatorios',  icon: <TeamOutlined />,                 label: 'Relatório de aceites',     onClick: () => setRelatoriosTarget(record) },
          { type: 'divider' as const },
          duplicar,
          { type: 'divider' as const },
          { key: 'inativar',    icon: <ExclamationCircleOutlined />,   label: 'Inativar',          danger: true, onClick: () => setInativarTarget(record) },
        ]
      case 'Agendado':
        return [
          { key: 'editar',  icon: <EditOutlined />,   label: 'Editar detalhes',        onClick: () => navigate(`/documentos/${record.id}/editar-agendado`) },
          { type: 'divider' as const },
          duplicar,
          { type: 'divider' as const },
          { key: 'excluir', icon: <DeleteOutlined />,  label: 'Excluir',               danger: true, onClick: () => setDeletarAgendadoTarget(record) },
        ]
      case 'Expirado':
        return [
          { key: 'nova-versao', icon: <HistoryOutlined />, label: 'Nova versão', onClick: () => { setNovaVersaoTarget(record); setNovaVersaoMotivo('') } },
          { type: 'divider' as const },
          duplicar,
        ]
      case 'Concluído':
        return [
          { key: 'relatorios', icon: <TeamOutlined />, label: 'Relatório de aceites', onClick: () => setRelatoriosTarget(record) },
          { type: 'divider' as const },
          duplicar,
        ]
      case 'Inativo':
        return [duplicar]
      default:
        return []
    }
    })()
    // Perfis sem permissão de gerenciar veem apenas ações de leitura (ex.: "Ver relatórios"),
    // sem divisores órfãos.
    if (can('documento:gerenciar')) return full
    return (full ?? []).filter((it) => it && it.type !== 'divider' && !WRITE_ACTION_KEYS.has((it as { key?: string }).key ?? ''))
  }

  /* ── Colunas da tabela ── */
  const progressTitle = <span style={{ whiteSpace: 'nowrap' }}>Progresso de aceite</span>

  const columns: ColumnsType<DocumentoComMeta> = [
    {
      title: 'Título', dataIndex: 'titulo', key: 'titulo',
      width: 220,
      sorter: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
      render: (t: string, record) => (
        <Tooltip title={t} placement="topLeft" styles={{ body: { fontFamily: FONT, fontSize: 12, maxWidth: 320 } }}>
          <Typography.Text
            strong
            ellipsis
            onClick={() => navigate(record.status === 'Em revisão' ? `/documentos/${record.id}/aprovacao` : `/documentos/${record.id}`)}
            style={{
              fontFamily: FONT, fontSize: 13, color: colorTokens.primary,
              lineHeight: '20px', cursor: 'pointer', display: 'block',
              textDecoration: 'underline', textDecorationColor: `${colorTokens.primary}44`,
              textUnderlineOffset: 3,
            }}
          >
            {t}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Classificações</span>, key: 'classificacoes', width: 160,
      render: (_: unknown, r) => {
        const values = r.classificacoes ?? []
        if (!values.length) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        const shown = values.slice(0, 1)
        const extra = values.length - shown.length
        return (
          <Space size={[4, 4]} wrap={false} style={{ flexWrap: 'nowrap' }}>
            {shown.map((v) => {
              const c = CLASSIF_COLORS[v] ?? CLASSIF_COLOR_DEFAULT
              return (
                <Tag key={v} style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 600, borderRadius: 4, margin: 0, padding: '2px 8px',
                  background: c.bg, border: `1px solid ${c.border}`, color: c.color,
                  maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{CLASSIF_MAP[v] ?? v}</Tag>
              )
            })}
            {extra > 0 && (
              <Tooltip title={[...shown.slice(0), ...values.slice(shown.length)].map((v) => CLASSIF_MAP[v] ?? v).join(', ')} styles={{ body: { fontFamily: FONT, fontSize: 12 } }}>
                <Tag style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 700, borderRadius: 4, margin: 0, padding: '2px 8px',
                  background: '#fff', border: `1px solid ${colorTokens.border}`, color: colorTokens.textSecondary, cursor: 'default', flexShrink: 0,
                }}>+{extra}</Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Responsável</span>, key: 'responsavel', width: 140,
      render: (_: unknown, r) => {
        const label = GESTAO_MAP[r.gestaoResponsavel] ?? r.gestaoResponsavel
        if (!label) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        return (
          <Tooltip title={label} placement="topLeft" styles={{ body: { fontFamily: FONT, fontSize: 12 } }}>
            <Typography.Text ellipsis style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary, display: 'block', maxWidth: '100%' }}>
              {label}
            </Typography.Text>
          </Tooltip>
        )
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Destinatários</span>, key: 'publico', width: 180,
      sorter: (a, b) => a.totalDestinatarios - b.totalDestinatarios,
      render: (_: unknown, r) => {
        /* ── Modo pessoa: avatares com iniciais ── */
        if (r.modalidadeEnvio === 'pessoa') {
          const colabs = r.colaboradoresPreview ?? []
          if (!colabs.length) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
          const MAX = 3
          const shown = colabs.slice(0, MAX)
          const extra = colabs.length - MAX
          const iniciais = (nome: string) =>
            nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('')
          return (
            <Space size={2} style={{ flexWrap: 'nowrap' }}>
              {shown.map((c) => (
                <Tooltip key={c.nome} title={c.nome} styles={{ body: { fontFamily: FONT, fontSize: 12 } }}>
                  <Avatar
                    size={28}
                    style={{
                      backgroundColor: c.cor, fontFamily: FONT,
                      fontSize: 11, fontWeight: 700, cursor: 'default',
                      flexShrink: 0,
                    }}
                  >
                    {iniciais(c.nome)}
                  </Avatar>
                </Tooltip>
              ))}
              {extra > 0 && (
                <Tooltip
                  title={colabs.slice(MAX).map((c) => c.nome).join(', ')}
                  styles={{ body: { fontFamily: FONT, fontSize: 12, maxWidth: 240 } }}
                >
                  <Avatar
                    size={28}
                    style={{
                      backgroundColor: '#F0F0F0', color: colorTokens.textSecondary,
                      fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: 'default',
                      flexShrink: 0,
                    }}
                  >
                    +{extra}
                  </Avatar>
                </Tooltip>
              )}
            </Space>
          )
        }

        /* ── Modo departamento: tags ── */
        const tags = r.destinatariosPreview ?? []
        if (!tags.length) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        const shown = tags.slice(0, 2)
        const extra = tags.length - shown.length
        return (
          <Space size={4} wrap>
            {shown.map((t) => (
              <Tag key={t} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px',
                background: '#FAFAFA', border: '1px solid #E8E8E8', color: colorTokens.textPrimary,
              }}>{t}</Tag>
            ))}
            {extra > 0 && (
              <Tooltip title={tags.slice(shown.length).join(', ')} styles={{ body: { fontFamily: FONT, fontSize: 12 } }}>
                <Tag style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 700, borderRadius: 4, margin: 0, padding: '1px 8px',
                  background: '#fff', border: `1px solid ${colorTokens.border}`, color: colorTokens.textSecondary, cursor: 'default',
                }}>+{extra}</Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Agendado para</span>, key: 'data_envio', width: 120,
      sorter: (a, b) => dayjs(a.dataLancamento ?? '').valueOf() - dayjs(b.dataLancamento ?? '').valueOf(),
      render: (_: unknown, r) => {
        if (!r.dataLancamento) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {dayjs(r.dataLancamento).format('DD/MM/YYYY')}
          </Typography.Text>
        )
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Inicio da vigência</span>, key: 'vigencia_inicio', width: 130,
      sorter: (a, b) => dayjs(a.dataLancamento ?? '').valueOf() - dayjs(b.dataLancamento ?? '').valueOf(),
      render: (_: unknown, r) => {
        if (!r.dataLancamento) return <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>—</Typography.Text>
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {dayjs(r.dataLancamento).format('DD/MM/YYYY')}
          </Typography.Text>
        )
      },
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Fim da vigência</span>, key: 'vigencia_fim', width: 120,
      sorter: (a, b) => dayjs(a.dataExpiracao ?? '').valueOf() - dayjs(b.dataExpiracao ?? '').valueOf(),
      render: (_: unknown, r) => {
        if (!r.dataExpiracao) return <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>—</Typography.Text>
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {dayjs(r.dataExpiracao).format('DD/MM/YYYY')}
          </Typography.Text>
        )
      },
    },
    {
      title: progressTitle, key: 'progresso', width: 180,
      sorter: (a, b) => {
        const pA = a.totalDestinatarios > 0 ? a.totalAceites / a.totalDestinatarios : 0
        const pB = b.totalDestinatarios > 0 ? b.totalAceites / b.totalDestinatarios : 0
        return pA - pB
      },
      render: (_: unknown, r) => {
        if (r.status === 'Agendado') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Progress percent={0} showInfo={false} trailColor="#F0F0F0" strokeColor="#F0F0F0" strokeWidth={6} style={{ flex: 1, margin: 0, minWidth: 90 }} />
              <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12, minWidth: 36, textAlign: 'right' }}>—</Typography.Text>
            </div>
          )
        }
        const pct   = r.totalDestinatarios > 0 ? Math.round((r.totalAceites / r.totalDestinatarios) * 100) : 0
        const color = barColor(r.tipo, r.status, pct)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Progress percent={pct} showInfo={false} strokeColor={color} trailColor="#EFEFEF" strokeWidth={6} style={{ flex: 1, margin: 0, minWidth: 90 }} />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right' }}>
              {pct}%
            </Typography.Text>
          </div>
        )
      },
    },
    {
      title: 'Recorrência', key: 'recorrencia', width: 120,
      render: (_: unknown, r) => {
        const map: Record<string, string> = {
          'sem_validade': 'Sem validade', '3_meses': '3 meses', '6_meses': '6 meses',
          '12_meses': '12 meses', '24_meses': '24 meses',
        }
        const val = r.recorrenciaAceite ? (map[r.recorrenciaAceite] ?? r.recorrenciaAceite) : null
        if (!val) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        return <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>{val}</Typography.Text>
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      sorter: (a, b) => a.status.localeCompare(b.status, 'pt-BR'),
      render: (status: DocumentoStatus) => {
        const palette: Record<DocumentoStatus, { dot: string; color: string; bg: string; border: string }> = {
          Ativo:        { dot: '#52c41a', color: '#389e0d', bg: '#f6ffed',  border: '#b7eb8f' },
          'Em revisão': { dot: '#2F54EB', color: '#1D39C4', bg: '#F0F5FF',  border: '#adc6ff' },
          Agendado:  { dot: '#FA8C16', color: '#D46B08', bg: '#FFF7E6',  border: '#ffd591' },
          Rascunho:  { dot: '#BFBFBF', color: '#8C8C8C', bg: '#FAFAFA',  border: '#D9D9D9' },
          Concluído: { dot: '#BFBFBF', color: '#8C8C8C', bg: '#FAFAFA',  border: '#BFBFBF' },
          Expirado:  { dot: '#FF7A45', color: '#D4380D', bg: '#FFF2E8',  border: '#ffbb96' },
          Inativo:   { dot: '#8C8C8C', color: '#595959', bg: '#F5F5F5',  border: '#D9D9D9' },
        }
        const p = palette[status]
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 6,
            border: `1px solid ${p.border}`, background: p.bg,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, color: p.color, whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[status]}
          </span>
        )
      },
    },
    {
      title: '', key: 'acoes', width: 56, align: 'right' as const,
      render: (_: unknown, record) => {
        const items = actionsMenu(record)
        if (!items || items.length === 0) return null
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined style={{ fontSize: 15 }} />} style={{
              width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: colorTokens.textSecondary, borderRadius: 6,
            }} />
          </Dropdown>
        )
      },
    },
  ]

  /* ── Colunas ativas (varia por aba) ── */
  const activeColumns = (() => {
    // Todos → Título | Classificações | Responsável | Destinatários | Inicio vigência | Fim vigência | Status | Ações
    if (activeTab === 'todos') {
      const keys = ['titulo', 'classificacoes', 'responsavel', 'publico', 'vigencia_inicio', 'vigencia_fim', 'status', 'acoes']
      return keys.map((k) => columns.find((c) => c.key === k)).filter(Boolean) as typeof columns
    }
    // Exigem aceite → Título | Classificações | Responsável | Destinatários | Inicio vigência | Fim vigência | Progresso | Status | Ações
    if (activeTab === 'exigem_aceite') {
      const keys = ['titulo', 'classificacoes', 'responsavel', 'publico', 'vigencia_inicio', 'vigencia_fim', 'progresso', 'status', 'acoes']
      return keys.map((k) => columns.find((c) => c.key === k)).filter(Boolean) as typeof columns
    }
    // Informativos → Título | Responsável | Classificações | Destinatários | Progresso | Status | Ações
    if (activeTab === 'informativos') {
      const keys = ['titulo', 'responsavel', 'classificacoes', 'publico', 'progresso', 'status', 'acoes']
      return keys.map((k) => columns.find((c) => c.key === k)).filter(Boolean) as typeof columns
    }
    // Custom tabs: respeita ordem drag-and-drop
    const custom = customTabs.find((t) => t.key === activeTab)
    if (custom) {
      const orderedKeys = ['titulo', ...custom.columns, 'acoes']
      return orderedKeys
        .map((k) => columns.find((c) => c.key === k))
        .filter(Boolean) as typeof columns
    }
    return columns
  })()

  /* ── Handlers de customização de abas ── */
  function resetDrawerState() {
    setNewTabTitle('')
    setNewTabColumns(['classificacoes', 'publico', 'status'])
    setNewTabSmartFilters({ tipo: 'todos', prazo: 'todos', publico: 'todos' })
    setNewTabColumnOrder(AVAILABLE_COLUMNS.map((c) => c.key))
    setDraggingColIdx(null)
  }

  function handleCreateTab() {
    if (!newTabTitle.trim() || customTabs.length >= 3) return
    const key = `custom_${Date.now()}`
    // Ordered columns = columns that are checked, in drag-and-drop order
    const orderedSelected = newTabColumnOrder.filter((k) => newTabColumns.includes(k))
    setCustomTabs((prev) => [...prev, {
      key,
      title: newTabTitle.trim(),
      columns: orderedSelected,
      smartFilters: newTabSmartFilters,
    }])
    setActiveTab(key)
    setTabDrawerOpen(false)
    resetDrawerState()
  }

  function handleRemoveTab(targetKey: string) {
    setCustomTabs((prev) => prev.filter((t) => t.key !== targetKey))
    if (activeTab === targetKey) setActiveTab('todos')
  }

  /* ── Drag-and-drop de colunas no Drawer ── */
  function handleColDragStart(idx: number) {
    setDraggingColIdx(idx)
  }

  function handleColDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (draggingColIdx === null || draggingColIdx === idx) return
    setNewTabColumnOrder((prev) => {
      const next = [...prev]
      const [moved] = next.splice(draggingColIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDraggingColIdx(idx)
  }

  function handleColDragEnd() {
    setDraggingColIdx(null)
  }

  /* ══════════════════════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>

      {/* ── Cabeçalho do módulo — fora dos cards ─────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{
            fontFamily: FONT, color: colorTokens.primary,
            margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px',
          }}>
            Documentos
          </Typography.Title>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            Gerencie todos os termos, políticas e documentos enviados para aceite dentro da organização.
          </Typography.Text>
        </div>
        {can('documento:criar') && (
          <Space size={8} style={{ marginTop: 4 }}>
            <Button icon={<AppstoreAddOutlined />} onClick={() => navigate('/documentos/envio-lote')} style={{
              height: 40, fontWeight: 600, fontSize: 13, fontFamily: FONT,
              borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 8,
            }}>
              Envio em lote
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documentos/criar')} style={{
              height: 40, fontWeight: 600, fontSize: 13, fontFamily: FONT,
              background: colorTokens.primary, borderColor: colorTokens.primary, borderRadius: 8,
            }}>
              Documento
            </Button>
          </Space>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
         Carrossel: Documentos em rascunho + em aprovação
      ════════════════════════════════════════════════════════ */}
      {(rascunhos.length > 0 || emAprovacao.length > 0) && (() => {
        const isRascunho = carouselTab === 'rascunho'
        const items: Documento[] = isRascunho ? rascunhos : emAprovacao
        const carTab = (key: 'rascunho' | 'aprovacao', label: string, count: number) => {
          const active = carouselTab === key
          return (
            <button
              onClick={() => setCarouselTab(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 0 12px', marginBottom: -1,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: FONT, fontSize: 14, fontWeight: active ? 600 : 500,
                color: active ? colorTokens.primary : colorTokens.textSecondary,
                borderBottom: `2px solid ${active ? colorTokens.primary : 'transparent'}`,
              }}
            >
              {label}
              <span style={{
                padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: active ? '#E8F6FD' : 'rgba(0,0,0,0.06)',
                color: active ? colorTokens.primary : 'rgba(0,0,0,0.55)',
              }}>{count}</span>
            </button>
          )
        }
        return (
          <div style={{
            background: '#fff', borderRadius: 12,
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            padding: 24, marginBottom: 24,
          }}>
            {/* Abas do carrossel */}
            <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid #F0F0F0', marginBottom: 16 }}>
              {carTab('rascunho', 'Documentos em rascunho', rascunhos.length)}
              {carTab('aprovacao', 'Documentos em aprovação', emAprovacao.length)}
            </div>

            {/* Carrossel da aba ativa */}
            {items.length === 0 ? (
              <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                {isRascunho ? 'Nenhum rascunho no momento.' : 'Nenhum documento em aprovação.'}
              </Typography.Text>
            ) : (
              <div style={{ position: 'relative' }}>
                {items.length > 3 && (
                  <button
                    onClick={() => scrollCarousel(-1)}
                    style={{
                      position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
                      zIndex: 2, width: 28, height: 28, borderRadius: '50%',
                      border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <LeftOutlined style={{ fontSize: 10, color: colorTokens.textSecondary }} />
                  </button>
                )}

                <div
                  ref={scrollRef}
                  className="drafts-scroll"
                  style={{
                    display: 'flex', gap: 0, overflowX: 'auto',
                    border: '1px solid #EBEBEB', borderRadius: 8, background: '#fff',
                  }}
                >
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className="carousel-card"
                      style={{
                        minWidth: 300, flex: '0 0 auto', padding: '16px 20px',
                        borderRight: i < items.length - 1 ? '1px solid #F0F0F0' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                      }}
                    >
                      {/* Info — clique leva ao destino (rascunho: etapa; aprovação: tela de aprovação) */}
                      <div
                        onClick={() => isRascunho
                          ? navigate(STEP_ROUTES[(item as DocumentoComMeta)._stepAtual ?? 0])
                          : navigate(`/documentos/${item.id}/aprovacao`)}
                        style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                      >
                        <Typography.Text strong style={{
                          fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary,
                          display: 'block', lineHeight: '18px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {item.titulo}
                        </Typography.Text>
                        <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                          {isRascunho
                            ? `Editado ${dayjs(item.criadoEm).fromNow()}`
                            : `Em aprovação ${dayjs(item.enviadoParaAprovacaoEm ?? item.criadoEm).fromNow()}`}
                        </Typography.Text>
                        {!isRascunho && (() => {
                          const r = aprovacaoResumo(item)
                          return (
                            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                              <span style={{
                                fontFamily: FONT, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap',
                                ...(r.concluido
                                  ? { background: '#F6FFED', border: '1px solid #B7EB8F', color: '#389e0d' }
                                  : { background: '#EEF2FF', border: `1px solid ${colorTokens.primary}33`, color: colorTokens.primary }),
                              }}>{r.progresso}</span>
                              {r.sla && (
                                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap', background: '#fff', border: `1px solid ${r.sla.color}55`, color: r.sla.color }}>{r.sla.text}</span>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Ação — excluir (rascunho) / cancelar aprovação */}
                      <Button
                        size="small"
                        icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                        onClick={() => isRascunho ? setDeleteTarget(item as DocumentoComMeta) : handleCancelAprovacao(item)}
                        style={{
                          width: 32, height: 32, flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: colorTokens.textSecondary, borderColor: '#E8E8E8', borderRadius: 8,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {items.length > 3 && (
                  <button
                    onClick={() => scrollCarousel(1)}
                    style={{
                      position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
                      zIndex: 2, width: 28, height: 28, borderRadius: '50%',
                      border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <RightOutlined style={{ fontSize: 10, color: colorTokens.textSecondary }} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ════════════════════════════════════════════════════════
         Card: Listagem — Tabs + Tabela
      ════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative' }}>
      <Tabs
        type="card"
        className="listagem-tabs"
        activeKey={activeTab}
        onChange={(k) => {
          if (k === '__add__') { setTabDrawerOpen(true); return }
          setActiveTab(k)
          setPagination((p) => ({ ...p, current: 1 }))
        }}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      <div className="listagem-card" style={{ background: '#fff', borderRadius: '0 12px 12px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {/* ── Barra de filtros ── */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

          {/* Limpar busca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasFilters && (
              <Button
                type="text" size="small" icon={<CloseOutlined style={{ fontSize: 11 }} />}
                onClick={clearFilters}
                style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, height: 36, paddingInline: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Busca */}
          <Input
            allowClear placeholder="Buscar por título"
            prefix={<SearchOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{ width: 220, height: 36, fontFamily: FONT, fontSize: 13, borderRadius: 8, flexShrink: 0 }}
          />
        </div>

        {/* Condition tags for custom tabs */}
        {(() => {
          const custom = customTabs.find((t) => t.key === activeTab)
          if (!custom) return null
          const sf = custom.smartFilters
          const tags: string[] = []
          if (sf.tipo === 'aceites') tags.push('Apenas aceites')
          if (sf.tipo === 'leitura') tags.push('Apenas leitura')
          if (sf.prazo === 'pendentes') tags.push('Documentos pendentes')
          if (sf.prazo === 'vigencia_proxima') tags.push('Vigência próxima (30d)')
          if (sf.prazo === 'requer_atualizacao') tags.push('Requer atualização')
          if (sf.prazo === 'expirados') tags.push('Documentos expirados')
          if (sf.publico === 'departamentos') tags.push('Por departamento')
          if (sf.publico === 'destinatarios') tags.push('Por destinatários')
          if (!tags.length) return null
          return (
            <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #F0F0F0' }}>
              {tags.map((label) => (
                <Tag key={label} style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 500, borderRadius: 4, margin: 0, padding: '2px 10px',
                  background: '#EEF2FF', border: `1px solid ${colorTokens.primary}33`, color: colorTokens.primary,
                }}>{label}</Tag>
              ))}
            </div>
          )
        })()}

        {/* Tabela */}
        <Table<DocumentoComMeta>
          className="listagem-table" dataSource={filtered} columns={activeColumns}
          rowKey="id" size="middle" bordered={false} showSorterTooltip={false}
          scroll={{ x: 'max-content' }}
          pagination={{
            ...pagination, total: filtered.length,
            showSizeChanger: true, pageSizeOptions: ['5', '10', '20'],
            showTotal: (n) => <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>Total {n} {n === 1 ? 'item' : 'itens'}</Typography.Text>,
            onChange: (page, size) => setPagination({ current: page, pageSize: size }),
            style: { padding: '12px 20px', fontFamily: FONT },
            locale: { items_per_page: '/ Por página' },
          }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }}
                description={
                  <div style={{ textAlign: 'center' }}>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block' }}>
                      {hasFilters ? 'Nenhum documento encontrado para os filtros selecionados.'
                        : 'Não há dados a serem exibidos'}
                    </Typography.Text>
                    {!hasFilters && (
                      <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginTop: 4 }}>
                        Clique em "+ Documento" para começar
                      </Typography.Text>
                    )}
                  </div>
                }
              />
            ),
          }}
          style={{ background: '#fff' }}
        />
      </div>
      </div>{/* /card listagem */}

      {/* ════════════════════════════════════════════════════════
         Modal — Excluir rascunho
      ════════════════════════════════════════════════════════ */}
      <Modal
        className="modal-draft"
        open={!!deleteTarget} onCancel={() => setDeleteTarget(null)}
        width={420} centered
        title="Excluir rascunho"
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDeleteTarget(null)} style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}>
              Cancelar
            </Button>
            <Button danger type="primary" onClick={handleConfirmDelete} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13 }}>
              Excluir
            </Button>
          </Space>
        }
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '20px' }}>
          O rascunho será excluído de forma permanente
        </Typography.Text>
      </Modal>

      {/* ════════════════════════════════════════════════════════
         Modal — Inativar documento
      ════════════════════════════════════════════════════════ */}
      <Modal
        className="encerrar-modal"
        open={!!inativarTarget} onCancel={() => { setInativarTarget(null); setInativarJustificativa('') }}
        width={460} centered
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#FF4D4F' }} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16 }}>Inativar documento</span>
          </Space>
        }
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setInativarTarget(null); setInativarJustificativa('') }} style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}>
              Cancelar
            </Button>
            <Button
              danger type="primary"
              disabled={!inativarJustificativa.trim()}
              onClick={handleConfirmInativar}
              style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13 }}
            >
              Inativar documento
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            borderRadius: 8, background: '#FFF1F0', border: '1px solid #FFA39E', marginBottom: 16,
          }}>
            <ExclamationCircleOutlined style={{ color: '#FF4D4F', fontSize: 14, marginTop: 2, flexShrink: 0 }} />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: '#CF1322', lineHeight: '20px' }}>
              <strong>Esta ação não pode ser revertida.</strong> O documento será inativado imediatamente e os destinatários perderão o acesso.
            </Typography.Text>
          </div>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, display: 'block', marginBottom: 8 }}>
            Justificativa <span style={{ color: '#FF4D4F' }}>*</span>
          </Typography.Text>
          <Input.TextArea
            rows={4} maxLength={500} showCount
            value={inativarJustificativa}
            onChange={(e) => setInativarJustificativa(e.target.value)}
            placeholder="Descreva o motivo da inativação..."
            style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }}
          />
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════
         Modal — Encerrar vigência
      ════════════════════════════════════════════════════════ */}
      <Modal
        className="encerrar-modal"
        open={!!encerrarTarget} onCancel={() => setEncerrarTarget(null)}
        width={440} centered
        title="Encerrar vigência"
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setEncerrarTarget(null)} style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}>
              Cancelar
            </Button>
            <Button danger type="primary" onClick={handleConfirmEncerrar} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13 }}>
              Encerrar
            </Button>
          </Space>
        }
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '20px' }}>
          Esta ação interrompe o aceite imediatamente. O histórico de assinaturas será preservado.
        </Typography.Text>
      </Modal>

      {/* ════════════════════════════════════════════════════════
         Modal — Excluir documento Agendado
      ════════════════════════════════════════════════════════ */}
      <Modal
        className="encerrar-modal"
        open={!!deletarAgendadoTarget}
        onCancel={() => setDeletarAgendadoTarget(null)}
        width={460} centered
        title={
          <Space>
            <DeleteOutlined style={{ color: '#FF4D4F' }} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16 }}>Excluir documento agendado</span>
          </Space>
        }
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDeletarAgendadoTarget(null)} style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}>
              Cancelar
            </Button>
            <Button danger type="primary" onClick={handleConfirmDeletarAgendado} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13 }}>
              Excluir permanentemente
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            borderRadius: 8, background: '#FFF1F0', border: '1px solid #FFA39E', marginBottom: 16,
          }}>
            <ExclamationCircleOutlined style={{ color: '#FF4D4F', fontSize: 14, marginTop: 2, flexShrink: 0 }} />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: '#CF1322', lineHeight: '20px' }}>
              <strong>Esta ação não pode ser revertida.</strong> O documento e todo o seu histórico serão removidos permanentemente da plataforma.
            </Typography.Text>
          </div>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '20px' }}>
            Tem certeza que deseja excluir{' '}
            <strong style={{ color: colorTokens.textPrimary }}>"{deletarAgendadoTarget?.titulo}"</strong>?
            Como o documento ainda não foi enviado, é possível removê-lo do sistema.
          </Typography.Text>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════
         Modal — Nova Versão (Ativo tipo adesao)
      ════════════════════════════════════════════════════════ */}
      <Modal
        className="encerrar-modal"
        open={!!novaVersaoTarget}
        onCancel={() => { setNovaVersaoTarget(null); setNovaVersaoMotivo('') }}
        width={500} centered
        title={
          <Space>
            <HistoryOutlined style={{ color: colorTokens.primary }} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16 }}>Criar nova versão</span>
          </Space>
        }
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setNovaVersaoTarget(null); setNovaVersaoMotivo('') }} style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              disabled={!novaVersaoMotivo.trim()}
              onClick={handleConfirmNovaVersao}
              icon={<HistoryOutlined />}
              style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13, background: colorTokens.primary }}
            >
              Criar nova versão
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            borderRadius: 8, background: '#EEF2FF', border: `1px solid ${colorTokens.primary}33`, marginBottom: 20,
          }}>
            <HistoryOutlined style={{ color: colorTokens.primary, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.primary, lineHeight: '20px' }}>
              Uma nova versão do documento será criada. Os destinatários serão notificados e precisarão reasinar o documento atualizado.
            </Typography.Text>
          </div>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Motivo / Mudanças <span style={{ color: '#FF4D4F' }}>*</span>
          </Typography.Text>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 10 }}>
            Descreva o que foi alterado nesta nova versão. Este texto ficará registrado no histórico de versões.
          </Typography.Text>
          <Input.TextArea
            rows={4} maxLength={500} showCount
            value={novaVersaoMotivo}
            onChange={(e) => setNovaVersaoMotivo(e.target.value)}
            placeholder="Ex.: Atualização do item 3.2 para adequação à nova resolução LGPD. Revisão das penalidades previstas no item 5."
            style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }}
          />
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════
         Drawer — Nova tab customizada
      ════════════════════════════════════════════════════════ */}
      <Drawer
        open={tabDrawerOpen}
        onClose={() => { setTabDrawerOpen(false); resetDrawerState() }}
        title={
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15, color: colorTokens.textPrimary }}>
            Nova tab customizada
          </span>
        }
        width={380}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => { setTabDrawerOpen(false); resetDrawerState() }}
              style={{ fontFamily: FONT, fontWeight: 500, borderRadius: 8, height: 36, fontSize: 13 }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              disabled={!newTabTitle.trim() || customTabs.length >= 3}
              onClick={handleCreateTab}
              style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 36, fontSize: 13, background: colorTokens.primary, borderColor: colorTokens.primary, color: '#fff' }}
            >
              Criar
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Descrição estratégica */}
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '20px', display: 'block', marginBottom: 24 }}>
            Selecione as colunas que deseja exibir e organize sua prioridade arrastando os itens para definir a ordem da tabela.
          </Typography.Text>

          {/* Regra de limite */}
          {customTabs.length >= 3 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: '#FFF7E6', border: '1px solid #FFD591',
            }}>
              <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: '#D46B08' }}>
                Limite de 3 abas personalizadas atingido. Exclua uma aba para criar outra.
              </Typography.Text>
            </div>
          )}

          {/* Título da aba */}
          <div style={{ marginBottom: 24 }}>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 8 }}>
              Título da aba
            </Typography.Text>
            <Input
              maxLength={16}
              value={newTabTitle}
              onChange={(e) => setNewTabTitle(e.target.value)}
              placeholder="Ex: vigentes"
              disabled={customTabs.length >= 3}
              showCount
              style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8 }}
            />
          </div>

          {/* Colunas visíveis com drag-and-drop */}
          <div style={{ marginBottom: 24 }}>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 4 }}>
              Colunas visíveis
            </Typography.Text>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 12 }}>
              "Título" e "Ações" são sempre exibidos. Arraste para reordenar.
            </Typography.Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {newTabColumnOrder.map((colKey, idx) => {
                const col = AVAILABLE_COLUMNS.find((c) => c.key === colKey)
                if (!col) return null
                const isChecked = newTabColumns.includes(col.key)
                const isDragging = draggingColIdx === idx
                return (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={() => handleColDragStart(idx)}
                    onDragOver={(e) => handleColDragOver(e, idx)}
                    onDragEnd={handleColDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8,
                      border: isDragging ? `1px dashed ${colorTokens.primary}` : '1px solid #EBEBEB',
                      background: isDragging ? '#F7F8FF' : isChecked ? '#FAFAFA' : '#fff',
                      cursor: 'grab', opacity: isDragging ? 0.6 : 1,
                      transition: 'background 0.12s, border-color 0.12s',
                      userSelect: 'none',
                    }}
                  >
                    <HolderOutlined style={{ color: '#BFBFBF', fontSize: 14, flexShrink: 0, cursor: 'grab' }} />
                    <Checkbox
                      checked={isChecked}
                      disabled={customTabs.length >= 3}
                      onChange={(e) => {
                        const key = col.key
                        const checked = e.target.checked
                        setNewTabColumns((prev) => checked ? [...prev, key] : prev.filter((k) => k !== key))
                        setNewTabColumnOrder((prev) => {
                          // Reagrupa: marcadas no topo (ordem atual) + a coluna alterada na fronteira + desmarcadas abaixo (ordem atual)
                          const checkedItems   = prev.filter((k) => k !== key && newTabColumns.includes(k))
                          const uncheckedItems = prev.filter((k) => k !== key && !newTabColumns.includes(k))
                          return [...checkedItems, key, ...uncheckedItems]
                        })
                      }}
                      style={{ fontFamily: FONT, fontSize: 13, flex: 1 }}
                    >
                      <span style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                        {col.label}
                      </span>
                    </Checkbox>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid #F0F0F0', marginBottom: 24 }} />

          {/* Condição de exibição — 3 grupos conforme PDF */}
          <div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 4 }}>
              Condição de exibição
            </Typography.Text>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 16 }}>
              Filtra automaticamente quais documentos aparecem nesta aba.
            </Typography.Text>

            {/* Tipo de documento */}
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tipo de documento
            </Typography.Text>
            <Radio.Group
              value={newTabSmartFilters.tipo}
              disabled={customTabs.length >= 3}
              onChange={(e) => setNewTabSmartFilters((p) => ({ ...p, tipo: e.target.value }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}
            >
              <Radio value="todos" style={{ fontFamily: FONT, fontSize: 13 }}>Todos</Radio>
              <Radio value="aceites" style={{ fontFamily: FONT, fontSize: 13 }}>Apenas com aceites</Radio>
              <Radio value="leitura" style={{ fontFamily: FONT, fontSize: 13 }}>Apenas leitura</Radio>
            </Radio.Group>

            {/* Prazo e cronograma */}
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Prazo e cronograma
            </Typography.Text>
            <Radio.Group
              value={newTabSmartFilters.prazo}
              disabled={customTabs.length >= 3}
              onChange={(e) => setNewTabSmartFilters((p) => ({ ...p, prazo: e.target.value }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}
            >
              <Radio value="todos" style={{ fontFamily: FONT, fontSize: 13 }}>Todos</Radio>
              <Radio value="pendentes" style={{ fontFamily: FONT, fontSize: 13 }}>Documentos pendentes</Radio>
              <Radio value="vigencia_proxima" style={{ fontFamily: FONT, fontSize: 13 }}>Documentos com vigência próxima (30 dias)</Radio>
              <Radio value="requer_atualizacao" style={{ fontFamily: FONT, fontSize: 13 }}>Documentos que requerem atualização</Radio>
              <Radio value="expirados" style={{ fontFamily: FONT, fontSize: 13 }}>Documentos expirados</Radio>
            </Radio.Group>

            {/* Público-alvo */}
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Público-alvo
            </Typography.Text>
            <Radio.Group
              value={newTabSmartFilters.publico}
              disabled={customTabs.length >= 3}
              onChange={(e) => setNewTabSmartFilters((p) => ({ ...p, publico: e.target.value }))}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <Radio value="todos" style={{ fontFamily: FONT, fontSize: 13 }}>Todos</Radio>
              <Radio value="departamentos" style={{ fontFamily: FONT, fontSize: 13 }}>Apenas por departamentos</Radio>
              <Radio value="destinatarios" style={{ fontFamily: FONT, fontSize: 13 }}>Apenas por destinatários</Radio>
            </Radio.Group>
          </div>

        </div>
      </Drawer>

      <PendenciasDrawer
        open={!!relatoriosTarget}
        onClose={() => setRelatoriosTarget(null)}
        doc={relatoriosTarget}
      />

    </div>
  )
}
