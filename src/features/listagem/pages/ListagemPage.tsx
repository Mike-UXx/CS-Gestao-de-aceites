/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Listagem de documentos — Sprint 2 / Épico 2
───────────────────────────────────────────────────────────── */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Table, Button, Tag, Input, Space, Typography,
  Tooltip, Popconfirm, message, Progress, Empty,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, EyeOutlined, CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { Documento, DocumentoStatus, STATUS_COLOR, STATUS_LABEL, DOCUMENTO_STATUS_LIST } from '../types/documento'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

/* ── Constantes ─────────────────────────────────────────────── */
const FONT      = "'Montserrat', sans-serif"
const DRAFT_KEY = 'gestao_aceites_draft'

/** Rota de cada step pelo índice salvo no rascunho */
const STEP_ROUTES: Record<number, string> = {
  0: '/documentos/criar/informacoes',
  1: '/documentos/criar/destinatarios',
  2: '/documentos/criar/configuracoes',
  3: '/documentos/criar/revisao',
}

/* ── Tipos locais ───────────────────────────────────────────── */
/** Documento com metadados internos do rascunho */
type DocumentoComMeta = Documento & { _stepAtual?: number }

/* ── Helpers ────────────────────────────────────────────────── */
function labelOf(list: { value: string; label: string }[], val: string) {
  return list.find((i) => i.value === val)?.label ?? val
}

/** Lê o localStorage e monta um Documento com status Rascunho */
function readDraftFromStorage(): DocumentoComMeta | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown>
    // Considera válido se tiver ao menos um fileName ou fileHash
    if (!parsed.fileName && !parsed.fileHash) return null
    return {
      id:                 (parsed._draftId  as string) ?? 'draft-local',
      titulo:             (parsed.fileName  as string) || 'Rascunho sem título',
      status:             'Rascunho',
      tipo:               (parsed.tipoDocumento as Documento['tipo']) ?? 'adesao',
      modalidadeEnvio:    (parsed.modalidadeEnvio as Documento['modalidadeEnvio']) ?? 'departamento',
      classificacoes:     (parsed.classificacoes as string[]) ?? [],
      gestaoResponsavel:  (parsed.gestaoResponsavel as string) ?? '',
      criadoEm:           (parsed._savedAt as string) ?? new Date().toISOString(),
      dataLancamento:     (parsed.dataLancamento as string) || null,
      dataExpiracao:      null,
      totalDestinatarios:
        ((parsed.departamentos as string[])?.length ?? 0) +
        ((parsed.colaboradores as string[])?.length ?? 0),
      totalAceites:       0,
      fileHash:           (parsed.fileHash as string) ?? null,
      fileName:           (parsed.fileName as string) ?? null,
      _stepAtual:         (parsed._stepAtual as number) ?? 0,
    }
  } catch {
    return null
  }
}

/* ── Componente principal ───────────────────────────────────── */
export function ListagemPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<DocumentoStatus | 'Todos'>('Todos')
  const [draft,         setDraft]         = useState<DocumentoComMeta | null>(readDraftFromStorage)
  const [pagination,    setPagination]    = useState<TablePaginationConfig>({ current: 1, pageSize: 10 })

  /* ── Toast ao chegar via "Salvar rascunho" ── */
  useEffect(() => {
    if ((location.state as { draftSaved?: boolean })?.draftSaved) {
      message.success('Rascunho salvo com sucesso!', 3)
      // Limpa o state para não reexibir ao navegar de volta
      window.history.replaceState({}, '')
    }
  }, [location.state])

  /* ── Excluir rascunho ── */
  const handleDeleteDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    setDraft(null)
    message.success('Rascunho excluído.')
  }, [])

  /* ── Dados da tabela: rascunho + mocks ── */
  const allDocumentos = useMemo<DocumentoComMeta[]>(() => {
    const list: DocumentoComMeta[] = [...MOCK_DOCUMENTOS]
    if (draft) list.unshift(draft) // rascunho sempre no topo
    return list
  }, [draft])

  /* ── Filtragem ── */
  const filtered = useMemo(() => {
    return allDocumentos.filter((doc) => {
      const matchSearch = search
        ? doc.titulo.toLowerCase().includes(search.toLowerCase()) ||
          (doc.fileName ?? '').toLowerCase().includes(search.toLowerCase())
        : true
      const matchStatus = statusFilter === 'Todos' ? true : doc.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [allDocumentos, search, statusFilter])

  /* ── Contadores para os chips de filtro ── */
  const countByStatus = useMemo(() => {
    const counts: Record<DocumentoStatus | 'Todos', number> = {
      Todos: allDocumentos.length,
      Rascunho: 0, Publicado: 0, Agendado: 0, Expirado: 0,
    }
    allDocumentos.forEach((d) => counts[d.status]++)
    return counts
  }, [allDocumentos])

  /* ── Colunas da tabela ── */
  const columns: ColumnsType<DocumentoComMeta> = [
    {
      title:     'Documento',
      dataIndex: 'titulo',
      key:       'titulo',
      ellipsis:  true,
      render: (titulo: string, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text
            strong
            style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}
          >
            {titulo}
          </Typography.Text>
          {record.fileName && (
            <Typography.Text
              type="secondary"
              style={{ fontFamily: FONT, fontSize: 11 }}
            >
              <FileTextOutlined style={{ marginRight: 4, fontSize: 10 }} />
              {record.fileName}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title:     'Status',
      dataIndex: 'status',
      key:       'status',
      width:     120,
      render: (status: DocumentoStatus) => (
        <Tag
          color={STATUS_COLOR[status]}
          style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, borderRadius: 4 }}
        >
          {STATUS_LABEL[status]}
        </Tag>
      ),
    },
    {
      title:     'Tipo',
      dataIndex: 'tipo',
      key:       'tipo',
      width:     140,
      render: (tipo: Documento['tipo']) => (
        <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>
          {tipo === 'adesao' ? 'Com versão' : 'Sem versão'}
        </Typography.Text>
      ),
    },
    {
      title:     'Gestão',
      dataIndex: 'gestaoResponsavel',
      key:       'gestao',
      width:     120,
      render: (val: string) => (
        <Typography.Text style={{ fontFamily: FONT, fontSize: 12 }}>
          {labelOf(GESTOES_RESPONSAVEIS, val) || '—'}
        </Typography.Text>
      ),
    },
    {
      title:     'Aceites',
      key:       'aceites',
      width:     130,
      render: (_: unknown, record) => {
        if (record.status === 'Rascunho') {
          return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        }
        const pct = record.totalDestinatarios > 0
          ? Math.round((record.totalAceites / record.totalDestinatarios) * 100)
          : 0
        return (
          <Tooltip title={`${record.totalAceites} de ${record.totalDestinatarios}`}>
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Progress
                percent={pct}
                size="small"
                strokeColor={colorTokens.primary}
                showInfo={false}
                style={{ margin: 0 }}
              />
              <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                {record.totalAceites}/{record.totalDestinatarios}
              </Typography.Text>
            </Space>
          </Tooltip>
        )
      },
    },
    {
      title:     'Lançamento',
      dataIndex: 'dataLancamento',
      key:       'dataLancamento',
      width:     130,
      render: (val: string | null, record) => {
        if (record.status === 'Rascunho') {
          return (
            <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>
              {record.criadoEm
                ? `Salvo ${dayjs(record.criadoEm).format('DD/MM/YY HH:mm')}`
                : '—'}
            </Typography.Text>
          )
        }
        if (!val) return <Typography.Text type="secondary" style={{ fontFamily: FONT, fontSize: 12 }}>—</Typography.Text>
        const isScheduled = record.status === 'Agendado'
        return (
          <Space size={4}>
            {isScheduled && <CalendarOutlined style={{ color: colorTokens.primary, fontSize: 11 }} />}
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12 }}>
              {dayjs(val).format('DD/MM/YYYY')}
            </Typography.Text>
          </Space>
        )
      },
    },
    {
      title:  'Ações',
      key:    'acoes',
      width:  120,
      align:  'center',
      render: (_: unknown, record) => {
        if (record.status === 'Rascunho') {
          return (
            <Space size={8}>
              <Tooltip title="Continuar editando">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(STEP_ROUTES[record._stepAtual ?? 0])}
                  style={{ color: colorTokens.primary, padding: 0 }}
                />
              </Tooltip>
              <Tooltip title="Excluir rascunho">
                <Popconfirm
                  title="Excluir rascunho?"
                  description="Esta ação não pode ser desfeita."
                  onConfirm={handleDeleteDraft}
                  okText="Excluir"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ padding: 0 }}
                  />
                </Popconfirm>
              </Tooltip>
            </Space>
          )
        }
        return (
          <Tooltip title="Visualizar">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              style={{ color: colorTokens.primary, padding: 0 }}
            />
          </Tooltip>
        )
      },
    },
  ]

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '32px 40px', fontFamily: FONT }}>

      {/* ── Cabeçalho ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24,
      }}>
        <div>
          <Typography.Title
            level={3}
            style={{ fontFamily: FONT, color: colorTokens.textPrimary, margin: 0, fontSize: 22 }}
          >
            Documentos
          </Typography.Title>
          <Typography.Text
            type="secondary"
            style={{ fontFamily: FONT, fontSize: 13 }}
          >
            Gerencie todos os documentos enviados, agendados e em rascunho.
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
          }}
        >
          Novo documento
        </Button>
      </div>

      {/* ── Filtros e busca ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        {/* Chips de status */}
        <Space size={8} wrap>
          {(['Todos', ...DOCUMENTO_STATUS_LIST] as const).map((s) => {
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPagination((p) => ({ ...p, current: 1 })) }}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 20, cursor: 'pointer',
                  fontFamily: FONT, fontSize: 12, fontWeight: isActive ? 600 : 400,
                  border: `1.5px solid ${isActive ? colorTokens.primary : colorTokens.border}`,
                  background: isActive ? '#EEF2FF' : '#fff',
                  color: isActive ? colorTokens.primary : colorTokens.textSecondary,
                  transition: 'all 0.2s ease',
                }}
              >
                {s}
                <span style={{
                  marginLeft: 6, fontWeight: 600,
                  color: isActive ? colorTokens.primary : colorTokens.textSecondary,
                }}>
                  {countByStatus[s]}
                </span>
              </button>
            )
          })}
        </Space>

        {/* Busca */}
        <Input
          allowClear
          placeholder="Buscar por título..."
          prefix={<SearchOutlined style={{ color: colorTokens.textSecondary }} />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })) }}
          style={{
            width: 280, height: 36, fontFamily: FONT,
            fontSize: 13, borderRadius: 8,
          }}
        />
      </div>

      {/* ── Tabela ── */}
      <Table<DocumentoComMeta>
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        pagination={{
          ...pagination,
          total: filtered.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => (
            <Typography.Text style={{ fontFamily: FONT, fontSize: 12 }}>
              {total} documento{total !== 1 ? 's' : ''}
            </Typography.Text>
          ),
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                  {search || statusFilter !== 'Todos'
                    ? 'Nenhum documento encontrado para os filtros aplicados.'
                    : 'Nenhum documento criado ainda.'}
                </Typography.Text>
              }
            />
          ),
        }}
        rowClassName={(record) =>
          record.status === 'Rascunho' ? 'row-rascunho' : ''
        }
        style={{ background: '#fff', borderRadius: 8 }}
        onRow={(record) => ({
          style: {
            background: record.status === 'Rascunho' ? '#FAFAFA' : undefined,
          },
        })}
      />
    </div>
  )
}
