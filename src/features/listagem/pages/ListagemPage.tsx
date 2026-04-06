/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Listagem de documentos — carrossel de rascunhos + tabela
───────────────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Table, Button, Tag, Input, Select, Space, Typography,
  Tooltip, message, Progress, Empty,
  Dropdown, Tabs, Modal,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, SearchOutlined, ArrowLeftOutlined,
  EditOutlined, DeleteOutlined, MoreOutlined,
  StopOutlined, BarChartOutlined, SendOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Documento, DocumentoStatus, STATUS_LABEL,
} from '../types/documento'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { CLASSIFICATIONS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')
dayjs.extend(relativeTime)

/* ── Constantes ─────────────────────────────────────────────── */
const FONT      = "'Montserrat', sans-serif"
const DRAFT_KEY = 'gestao_aceites_draft'

const STEP_ROUTES: Record<number, string> = {
  0: '/documentos/criar/informacoes',
  1: '/documentos/criar/destinatarios',
  2: '/documentos/criar/configuracoes',
  3: '/documentos/criar/revisao',
}

const CLASSIF_MAP  = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))
const CLASSIF_OPTS = CLASSIFICATIONS.map((c) => ({ label: c.label, value: c.value }))

/* ── Tipos ──────────────────────────────────────────────────── */
type DocumentoComMeta = Documento & { _stepAtual?: number }

/* ── Helpers ────────────────────────────────────────────────── */
function barColor(pct: number, status: DocumentoStatus): string {
  if (status === 'Concluído') return '#BFBFBF'
  if (pct === 100) return '#52c41a'
  if (pct === 0)   return '#D9D9D9'
  return colorTokens.primary
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
  .listagem-tabs .ant-tabs-tab {
    font-family: ${FONT} !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 10px 2px !important;
  }
  .listagem-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${colorTokens.primary} !important;
    font-weight: 700 !important;
  }
  .listagem-tabs .ant-tabs-ink-bar {
    background: ${colorTokens.primary} !important;
    height: 2.5px !important;
  }
  .listagem-tabs .ant-tabs-nav::before {
    border-bottom: 1.5px solid #EBEBEB !important;
  }
  .classif-select .ant-select-selector {
    border-radius: 8px !important;
    font-family: ${FONT} !important;
    font-size: 13px !important;
    min-height: 36px !important;
    align-items: center !important;
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
`

/* ═══════════════════════════════════════════════════════════════
   Componente principal
═══════════════════════════════════════════════════════════════ */
export function ListagemPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [search,          setSearch]          = useState('')
  const [filterClassif,   setFilterClassif]   = useState<string[]>([])
  const [activeTab,       setActiveTab]       = useState<DocumentoStatus | 'Todos'>('Todos')
  const [pagination,      setPagination]      = useState<TablePaginationConfig>({ current: 1, pageSize: 5 })
  const [encerrarTarget,  setEncerrarTarget]  = useState<DocumentoComMeta | null>(null)
  const [deleteTarget,    setDeleteTarget]    = useState<DocumentoComMeta | null>(null)

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

  /* ── Documentos da tabela (sem rascunhos) ── */
  const tableDocumentos = useMemo(() => {
    return MOCK_DOCUMENTOS.filter((d) => d.status !== 'Rascunho')
  }, [])

  /* ── Filtragem da tabela ── */
  const filtered = useMemo(() => tableDocumentos.filter((doc) => {
    const tab  = activeTab === 'Todos' || doc.status === activeTab
    const txt  = !search || doc.titulo.toLowerCase().includes(search.toLowerCase())
    const cls  = filterClassif.length === 0 || filterClassif.some((c) => doc.classificacoes.includes(c))
    return tab && txt && cls
  }), [tableDocumentos, activeTab, search, filterClassif])

  /* ── Contadores (só documentos da tabela) ── */
  const counts = useMemo(() => {
    const c: Record<string, number> = { Todos: tableDocumentos.length, Ativo: 0, Agendado: 0, Concluído: 0 }
    tableDocumentos.forEach((d) => { if (c[d.status] !== undefined) c[d.status]++ })
    return c
  }, [tableDocumentos])

  /* ── Tabs (sem Rascunhos) ── */
  const tabItems = useMemo(() => [
    { key: 'Todos',     label: 'Todos',      count: counts.Todos },
    { key: 'Ativo',     label: 'Ativos',     count: counts.Ativo },
    { key: 'Agendado',  label: 'Agendados',  count: counts.Agendado },
    { key: 'Concluído', label: 'Concluídos', count: counts.Concluído },
  ].map((t) => ({
    key: t.key,
    label: (
      <span style={{ fontFamily: FONT }}>
        {t.label}
        <span style={{
          marginLeft: 7, padding: '1px 7px', borderRadius: 10,
          fontSize: 11, fontWeight: 600,
          background: activeTab === t.key ? colorTokens.primary : '#F0F0F0',
          color:      activeTab === t.key ? '#fff' : colorTokens.textSecondary,
        }}>
          {t.count}
        </span>
      </span>
    ),
  })), [counts, activeTab])

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

  /* ── Ações: encerrar vigência ── */
  const handleConfirmEncerrar = useCallback(() => {
    if (!encerrarTarget) return
    message.success(`Vigência de "${encerrarTarget.titulo}" encerrada. Documento movido para Concluídos.`, 4)
    setEncerrarTarget(null)
  }, [encerrarTarget])

  /* ── Carrossel: scroll ── */
  const scrollCarousel = useCallback((dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }, [])

  /* ── Menu de ações por status ── */
  function actionsMenu(record: DocumentoComMeta): MenuProps['items'] {
    switch (record.status) {
      case 'Ativo':
        return [
          { key: 'quem-falta', icon: <SearchOutlined />, label: 'Quem falta' },
          { type: 'divider' },
          { key: 'encerrar', icon: <StopOutlined />, label: 'Encerrar vigência', onClick: () => setEncerrarTarget(record) },
        ]
      case 'Agendado':
        return [
          { key: 'editar', icon: <EditOutlined />, label: 'Editar agendamento' },
          { type: 'divider' },
          { key: 'enviar', icon: <SendOutlined />, label: 'Enviar agora' },
        ]
      case 'Concluído':
        return [
          { key: 'relatorios', icon: <BarChartOutlined />, label: 'Ver relatórios' },
        ]
      default:
        return []
    }
  }

  /* ── Colunas da tabela ── */
  const columns: ColumnsType<DocumentoComMeta> = [
    {
      title: 'Título', dataIndex: 'titulo', key: 'titulo',
      render: (t: string) => (
        <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '20px' }}>
          {t}
        </Typography.Text>
      ),
    },
    {
      title: 'Classificações', key: 'classificacoes', width: 240,
      render: (_: unknown, r) => {
        const labels = (r.classificacoes ?? []).map((v) => CLASSIF_MAP[v] ?? v)
        if (!labels.length) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        const shown = labels.slice(0, 2)
        const extra = labels.length - 2
        return (
          <Space size={[4, 4]} wrap>
            {shown.map((l) => (
              <Tag key={l} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px',
                background: '#EEF2FF', border: `1px solid ${colorTokens.primary}22`, color: colorTokens.primary,
              }}>{l}</Tag>
            ))}
            {extra > 0 && (
              <Tooltip title={labels.slice(2).join(', ')} overlayInnerStyle={{ fontFamily: FONT, fontSize: 12 }}>
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
      title: 'Destinatário(s)', key: 'publico', width: 160,
      render: (_: unknown, r) => {
        const tags = r.destinatariosPreview ?? []
        if (!tags.length) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        const shown = tags.slice(0, 1)
        const extra = tags.length - 1
        return (
          <Space size={4} wrap>
            {shown.map((t) => (
              <Tag key={t} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px',
                background: '#FAFAFA', border: '1px solid #E8E8E8', color: colorTokens.textPrimary,
              }}>{t}</Tag>
            ))}
            {extra > 0 && (
              <Tooltip title={tags.slice(1).join(', ')} overlayInnerStyle={{ fontFamily: FONT, fontSize: 12 }}>
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
      title: 'Vigência', key: 'vigencia', width: 185,
      render: (_: unknown, r) => {
        const s = r.dataLancamento ? dayjs(r.dataLancamento).format('DD/MM/YY') : null
        const e = r.dataExpiracao  ? dayjs(r.dataExpiracao).format('DD/MM/YY')  : null
        if (!s) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {s}{e ? <span style={{ color: colorTokens.textSecondary }}> até {e}</span> : ''}
          </Typography.Text>
        )
      },
    },
    {
      title: 'Adesão', key: 'adesao', width: 210,
      render: (_: unknown, r) => {
        if (r.status === 'Agendado') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Progress percent={0} showInfo={false} trailColor="#F0F0F0" strokeColor="#F0F0F0" strokeWidth={6} style={{ flex: 1, margin: 0, minWidth: 90 }} />
              <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12, minWidth: 46, textAlign: 'right' }}>—</Typography.Text>
            </div>
          )
        }
        const pct   = r.totalDestinatarios > 0 ? Math.round((r.totalAceites / r.totalDestinatarios) * 100) : 0
        const color = barColor(pct, r.status)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Progress percent={pct} showInfo={false} strokeColor={color} trailColor="#EFEFEF" strokeWidth={6} style={{ flex: 1, margin: 0, minWidth: 90 }} />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 46, textAlign: 'right' }}>
              {r.totalAceites}/{r.totalDestinatarios}
            </Typography.Text>
          </div>
        )
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (status: DocumentoStatus) => {
        const palette: Record<DocumentoStatus, { border: string; color: string; bg: string }> = {
          Ativo:     { border: '#52c41a', color: '#389e0d', bg: '#f6ffed' },
          Agendado:  { border: colorTokens.primary, color: colorTokens.primary, bg: '#EEF2FF' },
          Rascunho:  { border: '#D9D9D9', color: '#8C8C8C', bg: '#FAFAFA' },
          Concluído: { border: '#52c41a', color: '#389e0d', bg: '#f6ffed' },
        }
        const p = palette[status]
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5,
            border: `1px solid ${p.border}`, background: p.bg,
            fontFamily: FONT, fontSize: 11, fontWeight: 600, color: p.color, whiteSpace: 'nowrap',
          }}>{STATUS_LABEL[status]}</span>
        )
      },
    },
    {
      title: '', key: 'acoes', width: 56, align: 'right' as const,
      render: (_: unknown, record) => (
        <Dropdown menu={{ items: actionsMenu(record) }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined style={{ fontSize: 15 }} />} style={{
            width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: colorTokens.textSecondary, borderRadius: 6,
          }} />
        </Dropdown>
      ),
    },
  ]

  /* ══════════════════════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: '28px 40px 48px', fontFamily: FONT }}>

      {/* ← Voltar */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          color: colorTokens.primary, fontSize: 13, fontWeight: 500,
          fontFamily: FONT, padding: 0, marginBottom: 8,
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> Voltar
      </button>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documentos/criar')} style={{
          height: 40, fontWeight: 600, fontSize: 13, fontFamily: FONT,
          background: colorTokens.primary, borderColor: colorTokens.primary, borderRadius: 8, marginTop: 4,
        }}>
          Documento
        </Button>
      </div>

      {/* ════════════════════════════════════════════════════════
         Seção de Rascunhos — Carrossel horizontal
      ════════════════════════════════════════════════════════ */}
      {rascunhos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {/* Header da seção */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary }}>
              Rascunhos
            </Typography.Text>
            <span style={{
              padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: colorTokens.primary, color: '#fff',
            }}>
              {rascunhos.length}
            </span>
          </div>

          {/* Carrossel */}
          <div style={{ position: 'relative' }}>
            {/* Seta esquerda */}
            {rascunhos.length > 3 && (
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

            {/* Cards */}
            <div
              ref={scrollRef}
              className="drafts-scroll"
              style={{
                display: 'flex', gap: 0, overflowX: 'auto',
                border: '1px solid #EBEBEB', borderRadius: 8,
                background: '#fff',
              }}
            >
              {rascunhos.map((draft, i) => (
                <div
                  key={draft.id}
                  style={{
                    minWidth: 300, flex: '0 0 auto',
                    padding: '16px 20px',
                    borderRight: i < rascunhos.length - 1 ? '1px solid #F0F0F0' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  {/* Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Text strong style={{
                      fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary,
                      display: 'block', lineHeight: '18px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {draft.titulo}
                    </Typography.Text>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                      Editado {dayjs(draft.criadoEm).fromNow()}
                    </Typography.Text>
                  </div>

                  {/* Ações */}
                  <Space size={6} style={{ flexShrink: 0 }}>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => navigate(STEP_ROUTES[draft._stepAtual ?? 0])}
                      style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 600,
                        color: colorTokens.primary, padding: '0 4px', height: 'auto',
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                      onClick={() => setDeleteTarget(draft)}
                      style={{
                        color: colorTokens.textSecondary, padding: 0,
                        width: 24, height: 24, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    />
                  </Space>
                </div>
              ))}
            </div>

            {/* Seta direita */}
            {rascunhos.length > 3 && (
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         Tabs + Tabela
      ════════════════════════════════════════════════════════ */}
      <Tabs
        className="listagem-tabs" activeKey={activeTab}
        onChange={(k) => { setActiveTab(k as DocumentoStatus | 'Todos'); setPagination((p) => ({ ...p, current: 1 })) }}
        items={tabItems} style={{ marginBottom: 0 }}
      />

      <div style={{ background: '#fff', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '16px 20px 12px', borderBottom: '1px solid #F5F5F5' }}>
          <Select className="classif-select" mode="multiple" allowClear maxTagCount={2}
            placeholder="Classificação" options={CLASSIF_OPTS} value={filterClassif}
            onChange={(v) => { setFilterClassif(v); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{ width: 260, fontFamily: FONT }}
            styles={{ popup: { root: { fontFamily: FONT, fontSize: 13 } } }}
          />
          <Input allowClear placeholder="Buscar por título"
            prefix={<SearchOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{ width: 240, height: 36, fontFamily: FONT, fontSize: 13, borderRadius: 8 }}
          />
        </div>

        {/* Tabela */}
        <Table<DocumentoComMeta>
          className="listagem-table" dataSource={filtered} columns={columns}
          rowKey="id" size="middle" bordered={false} showSorterTooltip={false}
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
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                    {search || filterClassif.length ? 'Nenhum documento encontrado para os filtros aplicados.'
                      : activeTab !== 'Todos' ? `Nenhum documento com status "${STATUS_LABEL[activeTab as DocumentoStatus]}".`
                      : 'Nenhum documento criado ainda.'}
                  </Typography.Text>
                }
              />
            ),
          }}
          style={{ background: '#fff' }}
        />
      </div>

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
    </div>
  )
}
