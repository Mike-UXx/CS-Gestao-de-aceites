/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Listagem de documentos — Sprint 2 / Épico 2
───────────────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Table, Button, Tag, Input, Space, Typography,
  Tooltip, Popconfirm, message, Progress, Empty,
  Dropdown, Tabs,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, SearchOutlined, ArrowLeftOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  MoreOutlined, FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  Documento, DocumentoStatus, STATUS_LABEL,
  DOCUMENTO_STATUS_LIST,
} from '../types/documento'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
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

/** Máximo de tags visíveis na coluna Público antes de colapsar */
const MAX_PUBLICO_TAGS = 1

/* ── Tipos locais ───────────────────────────────────────────── */
type DocumentoComMeta = Documento & { _stepAtual?: number }

/* ── Helpers ────────────────────────────────────────────────── */
/** Cor da progress bar: verde se 100 %, vermelho se baixo, cinza se expirado */
function barColor(percent: number, status: DocumentoStatus): string {
  if (status === 'Expirado') return '#BFBFBF'
  if (percent === 100)        return '#52c41a'
  if (percent > 0 && percent < 40) return '#ff4d4f'
  return colorTokens.primary
}

/** Lê o localStorage e monta um Documento com status Rascunho */
function readDraftFromStorage(): DocumentoComMeta | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed.fileName && !parsed.fileHash) return null
    const depts     = (parsed.departamentos as string[]) ?? []
    const colab     = (parsed.colaboradores as string[]) ?? []
    const preview: string[] = depts.length ? depts.slice(0, 2) : colab.slice(0, 2)
    return {
      id:                 (parsed._draftId as string) ?? 'draft-local',
      titulo:             (parsed.fileName as string) || 'Rascunho sem título',
      status:             'Rascunho',
      tipo:               (parsed.tipoDocumento as Documento['tipo']) ?? 'adesao',
      modalidadeEnvio:    (parsed.modalidadeEnvio as Documento['modalidadeEnvio']) ?? 'departamento',
      classificacoes:     (parsed.classificacoes as string[]) ?? [],
      gestaoResponsavel:  (parsed.gestaoResponsavel as string) ?? '',
      criadoEm:           (parsed._savedAt as string) ?? new Date().toISOString(),
      dataLancamento:     (parsed.dataLancamento as string) || null,
      dataExpiracao:      null,
      totalDestinatarios: depts.length + colab.length,
      totalAceites:       0,
      fileHash:           (parsed.fileHash as string) ?? null,
      fileName:           (parsed.fileName as string) ?? null,
      destinatariosPreview: preview,
      _stepAtual:         (parsed._stepAtual as number) ?? 0,
    }
  } catch {
    return null
  }
}

/* ── Injeção de estilos globais ─────────────────────────────── */
const TABLE_STYLE = `
  .listagem-table .ant-table-thead > tr > th {
    background: #fff !important;
    font-family: ${FONT};
    font-weight: 600;
    font-size: 13px;
    color: ${colorTokens.primary} !important;
    border-bottom: 1.5px solid #E8E8E8 !important;
    padding: 12px 16px !important;
  }
  .listagem-table .ant-table-tbody > tr > td {
    font-family: ${FONT};
    font-size: 13px;
    padding: 14px 16px !important;
    border-bottom: 1px solid #F0F0F0 !important;
  }
  .listagem-table .ant-table-tbody > tr:hover > td {
    background: #F7F8FF !important;
    transition: background 0.18s ease;
  }
  .listagem-table .ant-table {
    border-radius: 8px !important;
  }
  .listagem-table .ant-table-container {
    border-radius: 8px !important;
    overflow: hidden;
  }
  .listagem-table .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }
  .listagem-tabs .ant-tabs-tab {
    font-family: ${FONT} !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    color: ${colorTokens.textSecondary} !important;
    padding: 8px 4px !important;
  }
  .listagem-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: ${colorTokens.primary} !important;
    font-weight: 600 !important;
  }
  .listagem-tabs .ant-tabs-ink-bar {
    background: ${colorTokens.primary} !important;
  }
  .listagem-tabs .ant-tabs-nav::before {
    border-bottom: 1.5px solid #F0F0F0 !important;
  }
`

/* ═══════════════════════════════════════════════════════════════ */
export function ListagemPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [search,      setSearch]      = useState('')
  const [activeTab,   setActiveTab]   = useState<DocumentoStatus | 'Todos'>('Todos')
  const [draft,       setDraft]       = useState<DocumentoComMeta | null>(readDraftFromStorage)
  const [pagination,  setPagination]  = useState<TablePaginationConfig>({ current: 1, pageSize: 5 })

  /* ── Injeta CSS da tabela ── */
  useEffect(() => {
    const tag = document.createElement('style')
    tag.id = 'listagem-styles'
    tag.textContent = TABLE_STYLE
    document.head.appendChild(tag)
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

  /* ── Dados: rascunho local + mocks ── */
  const allDocumentos = useMemo<DocumentoComMeta[]>(() => {
    const list: DocumentoComMeta[] = [...MOCK_DOCUMENTOS]
    if (draft) list.unshift(draft)
    return list
  }, [draft])

  /* ── Filtragem ── */
  const filtered = useMemo(() => {
    return allDocumentos.filter((doc) => {
      const matchSearch = search
        ? doc.titulo.toLowerCase().includes(search.toLowerCase())
        : true
      const matchTab = activeTab === 'Todos' ? true : doc.status === activeTab
      return matchSearch && matchTab
    })
  }, [allDocumentos, search, activeTab])

  /* ── Contadores por status (sobre todos, sem filtro de busca) ── */
  const counts = useMemo(() => {
    const c: Record<DocumentoStatus | 'Todos', number> = {
      Todos: allDocumentos.length,
      Rascunho: 0, Publicado: 0, Agendado: 0, Expirado: 0,
    }
    allDocumentos.forEach((d) => c[d.status]++)
    return c
  }, [allDocumentos])

  /* ── Itens das tabs ── */
  const tabItems = useMemo(() => [
    {
      key: 'Todos',
      label: (
        <span style={{ fontFamily: FONT }}>
          Todos
          <span style={{
            marginLeft: 6, fontSize: 11, fontWeight: 600,
            color: activeTab === 'Todos' ? colorTokens.primary : colorTokens.textSecondary,
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
            marginLeft: 6, fontSize: 11, fontWeight: 600,
            color: activeTab === s ? colorTokens.primary : colorTokens.textSecondary,
          }}>
            {counts[s]}
          </span>
        </span>
      ),
    })),
  ], [counts, activeTab])

  /* ── Menu de ações por status ── */
  function actionsMenu(record: DocumentoComMeta): MenuProps['items'] {
    if (record.status === 'Rascunho') {
      return [
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Continuar editando',
          onClick: () => navigate(STEP_ROUTES[record._stepAtual ?? 0]),
        },
        { type: 'divider' },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
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
    }
    if (record.status === 'Agendado') {
      return [
        { key: 'view',   icon: <EyeOutlined />,    label: 'Visualizar' },
        { key: 'cancel', icon: <DeleteOutlined />,  label: 'Cancelar agendamento', danger: true },
      ]
    }
    if (record.status === 'Expirado') {
      return [
        { key: 'view',   icon: <EyeOutlined />,  label: 'Visualizar' },
        { key: 'renew',  icon: <EditOutlined />, label: 'Renovar documento' },
      ]
    }
    // Publicado
    return [
      { key: 'view',     icon: <EyeOutlined />,    label: 'Visualizar' },
      { key: 'inactive', icon: <DeleteOutlined />,  label: 'Inativar', danger: true },
    ]
  }

  /* ── Colunas da tabela ── */
  const columns: ColumnsType<DocumentoComMeta> = [
    /* ── Título ── */
    {
      title:    'Título',
      dataIndex:'titulo',
      key:      'titulo',
      ellipsis: true,
      render: (titulo: string, record) => (
        <Space direction="vertical" size={3} style={{ maxWidth: 340 }}>
          <Typography.Text
            strong
            style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '18px' }}
          >
            {titulo}
          </Typography.Text>
          {record.fileName && (
            <Typography.Text
              type="secondary"
              style={{ fontFamily: FONT, fontSize: 11, lineHeight: '16px' }}
            >
              <FileTextOutlined style={{ marginRight: 4, fontSize: 10 }} />
              {record.fileName}
            </Typography.Text>
          )}
        </Space>
      ),
    },

    /* ── Público ── */
    {
      title: 'Público',
      key:   'publico',
      width: 180,
      render: (_: unknown, record) => {
        const tags  = record.destinatariosPreview ?? []
        const shown = tags.slice(0, MAX_PUBLICO_TAGS)
        const extra = tags.length - MAX_PUBLICO_TAGS

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
                  borderRadius: 4, margin: 0,
                  background: '#F5F5F5', border: '1px solid #E8E8E8',
                  color: colorTokens.textPrimary,
                }}
              >
                {t}
              </Tag>
            ))}
            {extra > 0 && (
              <Tooltip
                title={tags.slice(MAX_PUBLICO_TAGS).join(', ')}
                overlayInnerStyle={{ fontFamily: FONT, fontSize: 12 }}
              >
                <Tag
                  style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    borderRadius: 4, margin: 0,
                    background: '#EEF2FF', border: `1px solid ${colorTokens.primary}`,
                    color: colorTokens.primary, cursor: 'pointer',
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

    /* ── Vigência ── */
    {
      title: 'Vigência',
      key:   'vigencia',
      width: 190,
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
        if (!start) {
          return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        }
        return (
          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>
            {start}{end ? ` até ${end}` : ''}
          </Typography.Text>
        )
      },
    },

    /* ── Taxa de aceites ── */
    {
      title: 'Taxa de aceites',
      key:   'aceites',
      width: 200,
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
              strokeWidth={5}
              style={{ flex: 1, margin: 0, minWidth: 80 }}
            />
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {record.totalAceites}/{record.totalDestinatarios}
            </Typography.Text>
          </div>
        )
      },
    },

    /* ── Status ── */
    {
      title:     'Status',
      dataIndex: 'status',
      key:       'status',
      width:     130,
      render: (status: DocumentoStatus) => {
        /* Mapeamento de cor de borda/texto para tags outlined */
        const palette: Record<DocumentoStatus, { border: string; color: string; bg: string }> = {
          Publicado: { border: '#52c41a', color: '#389e0d', bg: '#f6ffed' },
          Agendado:  { border: colorTokens.primary, color: colorTokens.primary, bg: '#EEF2FF' },
          Rascunho:  { border: '#D9D9D9', color: '#595959', bg: '#FAFAFA' },
          Expirado:  { border: 'transparent', color: '#8C8C8C', bg: 'transparent' },
        }
        const p = palette[status]
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 4,
            border: `1px solid ${p.border}`,
            background: p.bg,
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 600,
            color: p.color,
            whiteSpace: 'nowrap',
          }}>
            {STATUS_LABEL[status]}
          </span>
        )
      },
    },

    /* ── Ações ── */
    {
      title:  '',
      key:    'acoes',
      width:  52,
      align:  'center',
      render: (_: unknown, record) => (
        <Dropdown
          menu={{ items: actionsMenu(record) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined style={{ fontSize: 16 }} />}
            style={{
              width: 32, height: 32, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: colorTokens.textSecondary,
              borderRadius: 6,
            }}
          />
        </Dropdown>
      ),
    },
  ]

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 40px 40px', fontFamily: FONT }}>

      {/* ── ← Voltar ── */}
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

      {/* ── Cabeçalho ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24,
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
          <Typography.Text
            style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}
          >
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
            borderColor: colorTokens.primary, borderRadius: 8,
            marginTop: 4,
          }}
        >
          Documento
        </Button>
      </div>

      {/* ── Tabs de filtro por status ── */}
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

      {/* ── Card branco com busca + tabela ── */}
      <div style={{
        background: '#fff', borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>

        {/* Barra de busca */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '16px 16px 0',
          gap: 8,
        }}>
          <Input
            allowClear
            placeholder="Buscar por título"
            prefix={<SearchOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
            style={{
              width: 240, height: 36, fontFamily: FONT,
              fontSize: 13, borderRadius: 8,
            }}
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
            style: { padding: '12px 16px', fontFamily: FONT },
            locale: { items_per_page: '/ Por página' },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                    {search
                      ? 'Nenhum documento encontrado para esta busca.'
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
