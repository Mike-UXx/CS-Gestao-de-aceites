/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Listagem de documentos — padrão High-End Enterprise
───────────────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Table, Button, Tag, Input, Select, Space, Typography,
  Tooltip, Popconfirm, message, Progress, Empty,
  Dropdown, Tabs,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, SearchOutlined, ArrowLeftOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined, MoreOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  Documento, DocumentoStatus, STATUS_LABEL,
  DOCUMENTO_STATUS_LIST,
} from '../types/documento'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { CLASSIFICATIONS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

/* ── Constantes ─────────────────────────────────────────────── */
const FONT      = "'Montserrat', sans-serif"
const DRAFT_KEY = 'gestao_aceites_draft'

const STEP_ROUTES: Record<number, string> = {
  0: '/documentos/criar/informacoes',
  1: '/documentos/criar/destinatarios',
  2: '/documentos/criar/configuracoes',
  3: '/documentos/criar/revisao',
}

/** Labels de classificação resolvidas a partir do valor */
const CLASSIF_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))

/** Opções para o Select de filtro por classificação */
const CLASSIF_OPTIONS = CLASSIFICATIONS.map((c) => ({ label: c.label, value: c.value }))

/* ── Tipos locais ───────────────────────────────────────────── */
type DocumentoComMeta = Documento & { _stepAtual?: number }

/* ── Helpers ────────────────────────────────────────────────── */
/**
 * Cores semânticas da barra de progresso:
 * verde = concluído (100 %), azul = em andamento, cinza = expirado/vazio
 */
function barColor(percent: number, status: DocumentoStatus): string {
  if (status === 'Expirado') return '#BFBFBF'
  if (percent === 100)       return '#52c41a'
  if (percent === 0)         return '#D9D9D9'
  return colorTokens.primary   // azul para andamento
}

/** Lê o localStorage e monta um Documento com status Rascunho */
function readDraftFromStorage(): DocumentoComMeta | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed.fileName && !parsed.fileHash) return null
    const depts   = (parsed.departamentos as string[]) ?? []
    const colab   = (parsed.colaboradores as string[]) ?? []
    const preview = depts.length ? depts.slice(0, 2) : colab.slice(0, 2)
    return {
      id:                   (parsed._draftId as string) ?? 'draft-local',
      titulo:               (parsed.fileName as string) || 'Rascunho sem título',
      status:               'Rascunho',
      tipo:                 (parsed.tipoDocumento as Documento['tipo']) ?? 'adesao',
      modalidadeEnvio:      (parsed.modalidadeEnvio as Documento['modalidadeEnvio']) ?? 'departamento',
      classificacoes:       (parsed.classificacoes as string[]) ?? [],
      gestaoResponsavel:    (parsed.gestaoResponsavel as string) ?? '',
      criadoEm:             (parsed._savedAt as string) ?? new Date().toISOString(),
      dataLancamento:       (parsed.dataLancamento as string) || null,
      dataExpiracao:        null,
      totalDestinatarios:   depts.length + colab.length,
      totalAceites:         0,
      fileHash:             (parsed.fileHash as string) ?? null,
      fileName:             (parsed.fileName as string) ?? null,
      destinatariosPreview: preview,
      _stepAtual:           (parsed._stepAtual as number) ?? 0,
    }
  } catch { return null }
}

/* ── CSS injetado (overrides de AntD) ──────────────────────── */
const TABLE_STYLE = `
  /* Cabeçalho */
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
  /* Células */
  .listagem-table .ant-table-tbody > tr > td {
    font-family: ${FONT} !important;
    font-size: 13px !important;
    padding: 20px 16px !important;
    border-bottom: 1px solid #F5F5F5 !important;
    vertical-align: middle !important;
  }
  /* Hover suave */
  .listagem-table .ant-table-tbody > tr:hover > td {
    background: #F7F8FF !important;
    transition: background 0.15s ease !important;
  }
  /* Última linha sem divisor */
  .listagem-table .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }
  /* Remove borda externa do wrapper */
  .listagem-table .ant-table-container {
    border-radius: 0 !important;
  }
  /* Tabs */
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
  /* Select de filtro */
  .classif-select .ant-select-selector {
    border-radius: 8px !important;
    font-family: ${FONT} !important;
    font-size: 13px !important;
    min-height: 36px !important;
    align-items: center !important;
  }
`

/* ═══════════════════════════════════════════════════════════════ */
export function ListagemPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [search,         setSearch]         = useState('')
  const [filterClassif,  setFilterClassif]  = useState<string[]>([])
  const [activeTab,      setActiveTab]      = useState<DocumentoStatus | 'Todos'>('Todos')
  const [draft,          setDraft]          = useState<DocumentoComMeta | null>(readDraftFromStorage)
  const [pagination,     setPagination]     = useState<TablePaginationConfig>({ current: 1, pageSize: 5 })

  /* ── Injeta CSS ── */
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'listagem-styles'
    el.textContent = TABLE_STYLE
    document.head.appendChild(el)
    return () => { document.getElementById('listagem-styles')?.remove() }
  }, [])

  /* ── Toast ao chegar via "Salvar rascunho" ── */
  useEffect(() => {
    if ((location.state as { draftSaved?: boolean })?.draftSaved) {
      message.success('Rascunho salvo com sucesso!', 3)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  /* ── Excluir rascunho ── */
  const handleDeleteDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setDraft(null)
    message.success('Rascunho excluído.')
  }, [])

  /* ── Dados: rascunho + mocks ── */
  const allDocumentos = useMemo<DocumentoComMeta[]>(() => {
    const list: DocumentoComMeta[] = [...MOCK_DOCUMENTOS]
    if (draft) list.unshift(draft)
    return list
  }, [draft])

  /* ── Filtragem combinada (tab + busca + classificação) ── */
  const filtered = useMemo(() => {
    return allDocumentos.filter((doc) => {
      const matchTab      = activeTab === 'Todos' || doc.status === activeTab
      const matchSearch   = !search || doc.titulo.toLowerCase().includes(search.toLowerCase())
      const matchClassif  = filterClassif.length === 0
        || filterClassif.some((c) => doc.classificacoes.includes(c))
      return matchTab && matchSearch && matchClassif
    })
  }, [allDocumentos, activeTab, search, filterClassif])

  /* ── Contadores por status (sem filtros de busca/classif) ── */
  const counts = useMemo(() => {
    const c: Record<DocumentoStatus | 'Todos', number> = {
      Todos: allDocumentos.length,
      Rascunho: 0, Publicado: 0, Agendado: 0, Expirado: 0,
    }
    allDocumentos.forEach((d) => c[d.status]++)
    return c
  }, [allDocumentos])

  /* ── Tabs ── */
  const tabItems = useMemo(() => [
    {
      key: 'Todos',
      label: (
        <span style={{ fontFamily: FONT }}>
          Todos
          <span style={{
            marginLeft: 7,
            padding: '1px 7px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            background: activeTab === 'Todos' ? colorTokens.primary : '#F0F0F0',
            color:      activeTab === 'Todos' ? '#fff' : colorTokens.textSecondary,
          }}>
            {counts.Todos}
          </span>
        </span>
      ),
    },
    ...DOCUMENTO_STATUS_LIST.map((s) => ({
      key: s,
      label: (
        <span style={{ fontFamily: FONT }}>
          {STATUS_LABEL[s]}
          <span style={{
            marginLeft: 7,
            padding: '1px 7px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            background: activeTab === s ? colorTokens.primary : '#F0F0F0',
            color:      activeTab === s ? '#fff' : colorTokens.textSecondary,
          }}>
            {counts[s]}
          </span>
        </span>
      ),
    })),
  ], [counts, activeTab])

  /* ── Menu contextual de ações ── */
  function actionsMenu(record: DocumentoComMeta): MenuProps['items'] {
    if (record.status === 'Rascunho') return [
      {
        key: 'edit', icon: <EditOutlined />,
        label: 'Continuar editando',
        onClick: () => navigate(STEP_ROUTES[record._stepAtual ?? 0]),
      },
      { type: 'divider' },
      {
        key: 'delete', icon: <DeleteOutlined />,
        label: (
          <Popconfirm
            title="Excluir rascunho?"
            description="Esta ação não pode ser desfeita."
            onConfirm={handleDeleteDraft}
            okText="Excluir"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <span style={{ color: '#ff4d4f' }}>Excluir rascunho</span>
          </Popconfirm>
        ),
      },
    ]
    if (record.status === 'Agendado') return [
      { key: 'view',   icon: <EyeOutlined />,   label: 'Visualizar' },
      { key: 'cancel', icon: <DeleteOutlined />, label: 'Cancelar agendamento', danger: true },
    ]
    if (record.status === 'Expirado') return [
      { key: 'view',  icon: <EyeOutlined />,  label: 'Visualizar' },
      { key: 'renew', icon: <EditOutlined />, label: 'Renovar documento' },
    ]
    return [
      { key: 'view',     icon: <EyeOutlined />,   label: 'Visualizar' },
      { key: 'inactive', icon: <DeleteOutlined />, label: 'Inativar', danger: true },
    ]
  }

  /* ── Colunas ── */
  const columns: ColumnsType<DocumentoComMeta> = [

    /* 1 ── Título (sem nome de arquivo) */
    {
      title:    'Título',
      dataIndex:'titulo',
      key:      'titulo',
      render: (titulo: string) => (
        <Typography.Text
          strong
          style={{
            fontFamily: FONT,
            fontSize: 13,
            color: colorTokens.textPrimary,
            lineHeight: '20px',
            display: 'block',
          }}
        >
          {titulo}
        </Typography.Text>
      ),
    },

    /* 2 ── Classificações */
    {
      title: 'Classificações',
      key:   'classificacoes',
      width: 240,
      render: (_: unknown, record) => {
        const vals   = record.classificacoes ?? []
        const labels = vals.map((v) => CLASSIF_MAP[v] ?? v)

        if (labels.length === 0) {
          return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        }

        const shown = labels.slice(0, 2)
        const extra = labels.length - 2

        return (
          <Space size={[4, 4]} wrap>
            {shown.map((lbl) => (
              <Tag
                key={lbl}
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 4,
                  margin: 0,
                  padding: '1px 8px',
                  background: '#EEF2FF',
                  border: `1px solid ${colorTokens.primary}22`,
                  color: colorTokens.primary,
                }}
              >
                {lbl}
              </Tag>
            ))}
            {extra > 0 && (
              <Tooltip
                title={labels.slice(2).join(', ')}
                overlayInnerStyle={{ fontFamily: FONT, fontSize: 12 }}
              >
                <Tag
                  style={{
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 4,
                    margin: 0,
                    padding: '1px 8px',
                    background: '#fff',
                    border: `1px solid ${colorTokens.border}`,
                    color: colorTokens.textSecondary,
                    cursor: 'default',
                  }}
                >
                  +{extra}
                </Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },

    /* 3 ── Público */
    {
      title: 'Público',
      key:   'publico',
      width: 160,
      render: (_: unknown, record) => {
        const tags  = record.destinatariosPreview ?? []
        const shown = tags.slice(0, 1)
        const extra = tags.length - 1

        if (tags.length === 0) {
          return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        }
        return (
          <Space size={4} wrap>
            {shown.map((t) => (
              <Tag
                key={t}
                style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 500,
                  borderRadius: 4, margin: 0, padding: '1px 8px',
                  background: '#FAFAFA', border: '1px solid #E8E8E8',
                  color: colorTokens.textPrimary,
                }}
              >
                {t}
              </Tag>
            ))}
            {extra > 0 && (
              <Tooltip
                title={tags.slice(1).join(', ')}
                overlayInnerStyle={{ fontFamily: FONT, fontSize: 12 }}
              >
                <Tag style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 700,
                  borderRadius: 4, margin: 0, padding: '1px 8px',
                  background: '#fff', border: `1px solid ${colorTokens.border}`,
                  color: colorTokens.textSecondary, cursor: 'default',
                }}>
                  +{extra}
                </Tag>
              </Tooltip>
            )}
          </Space>
        )
      },
    },

    /* 4 ── Vigência */
    {
      title: 'Vigência',
      key:   'vigencia',
      width: 185,
      render: (_: unknown, record) => {
        if (record.status === 'Rascunho') {
          return (
            <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>
              Salvo {dayjs(record.criadoEm).format('DD/MM/YY [às] HH:mm')}
            </Typography.Text>
          )
        }
        const start = record.dataLancamento ? dayjs(record.dataLancamento).format('DD/MM/YY') : null
        const end   = record.dataExpiracao  ? dayjs(record.dataExpiracao).format('DD/MM/YY')  : null
        if (!start) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {start}{end ? <span style={{ color: colorTokens.textSecondary }}> até {end}</span> : ''}
          </Typography.Text>
        )
      },
    },

    /* 5 ── Taxa de aceites */
    {
      title: 'Taxa de aceites',
      key:   'aceites',
      width: 210,
      render: (_: unknown, record) => {
        if (record.status === 'Rascunho' || record.totalDestinatarios === 0) {
          return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        }
        const pct   = Math.round((record.totalAceites / record.totalDestinatarios) * 100)
        const color = barColor(pct, record.status)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Progress
              percent={pct}
              showInfo={false}
              strokeColor={color}
              trailColor="#EFEFEF"
              strokeWidth={6}
              style={{ flex: 1, margin: 0, minWidth: 90 }}
            />
            <Typography.Text
              style={{
                fontFamily: FONT, fontSize: 12,
                color, fontWeight: 700,
                whiteSpace: 'nowrap', minWidth: 46,
                textAlign: 'right',
              }}
            >
              {record.totalAceites}/{record.totalDestinatarios}
            </Typography.Text>
          </div>
        )
      },
    },

    /* 6 ── Status (outline) */
    {
      title:     'Status',
      dataIndex: 'status',
      key:       'status',
      width:     130,
      render: (status: DocumentoStatus) => {
        const palette: Record<DocumentoStatus, { border: string; color: string; bg: string }> = {
          Publicado: { border: '#52c41a', color: '#389e0d', bg: '#f6ffed' },
          Agendado:  { border: colorTokens.primary, color: colorTokens.primary, bg: '#EEF2FF' },
          Rascunho:  { border: '#D9D9D9', color: '#8C8C8C', bg: '#FAFAFA' },
          Expirado:  { border: '#D9D9D9', color: '#8C8C8C', bg: 'transparent' },
        }
        const p = palette[status]
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: 5,
            border: `1px solid ${p.border}`,
            background: p.bg,
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 600,
            color: p.color,
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}>
            {STATUS_LABEL[status]}
          </span>
        )
      },
    },

    /* 7 ── Ações ⋮ (alinhado à direita) */
    {
      title:  '',
      key:    'acoes',
      width:  56,
      align:  'right' as const,
      render: (_: unknown, record) => (
        <Dropdown
          menu={{ items: actionsMenu(record) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined style={{ fontSize: 15 }} />}
            style={{
              width: 32, height: 32,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: colorTokens.textSecondary, borderRadius: 6,
            }}
          />
        </Dropdown>
      ),
    },
  ]

  /* ── Render ─────────────────────────────────────────────────── */
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
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        Voltar
      </button>

      {/* Cabeçalho */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 28,
      }}>
        <div>
          <Typography.Title
            level={2}
            style={{
              fontFamily: FONT, color: colorTokens.primary,
              margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px',
            }}
          >
            Documentos
          </Typography.Title>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            Gerencie todos os termos, políticas e documentos enviados para aceite dentro da organização.
          </Typography.Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/documentos/criar')}
          style={{
            height: 40, fontWeight: 600, fontSize: 13,
            fontFamily: FONT, background: colorTokens.primary,
            borderColor: colorTokens.primary, borderRadius: 8, marginTop: 4,
          }}
        >
          Documento
        </Button>
      </div>

      {/* Tabs de status */}
      <Tabs
        className="listagem-tabs"
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as DocumentoStatus | 'Todos')
          setPagination((p) => ({ ...p, current: 1 }))
        }}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      {/* Card branco */}
      <div style={{
        background: '#fff',
        borderRadius: '0 0 10px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>

        {/* ── Toolbar: busca + filtro de classificação ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          padding: '16px 20px 12px',
          borderBottom: '1px solid #F5F5F5',
        }}>
          <Select
            className="classif-select"
            mode="multiple"
            allowClear
            maxTagCount={2}
            placeholder="Classificação"
            options={CLASSIF_OPTIONS}
            value={filterClassif}
            onChange={(vals) => { setFilterClassif(vals); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{ width: 260, fontFamily: FONT }}
            styles={{
              popup: { root: { fontFamily: FONT, fontSize: 13 } },
            }}
          />

          <Input
            allowClear
            placeholder="Buscar por título"
            prefix={<SearchOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{ width: 240, height: 36, fontFamily: FONT, fontSize: 13, borderRadius: 8 }}
          />
        </div>

        {/* Tabela */}
        <Table<DocumentoComMeta>
          className="listagem-table"
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          bordered={false}
          showSorterTooltip={false}
          pagination={{
            ...pagination,
            total: filtered.length,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20'],
            showTotal: (total) => (
              <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>
                Total {total} {total === 1 ? 'item' : 'itens'}
              </Typography.Text>
            ),
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            style: { padding: '12px 20px', fontFamily: FONT },
            locale: { items_per_page: '/ Por página' },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '32px 0' }}
                description={
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                    {search || filterClassif.length > 0
                      ? 'Nenhum documento encontrado para os filtros aplicados.'
                      : activeTab !== 'Todos'
                        ? `Nenhum documento com status "${STATUS_LABEL[activeTab as DocumentoStatus]}".`
                        : 'Nenhum documento criado ainda.'}
                  </Typography.Text>
                }
              />
            ),
          }}
          style={{ background: '#fff' }}
        />
      </div>
    </div>
  )
}
