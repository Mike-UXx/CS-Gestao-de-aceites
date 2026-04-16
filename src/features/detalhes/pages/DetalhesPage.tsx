/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/pages/DetalhesPage.tsx
   US 2.4–2.8 | Página de Detalhes do Documento — redesign completo
   Layout: Main Card · KPI Dashboard · Grid Info · Deptos · Timeline
───────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography, Tag, Button, Progress, Row, Col, Divider,
  Space, Modal, List, Avatar, Dropdown, message, Input,
  Alert, Timeline, Drawer, Badge, Tabs, Spin, Table,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DownloadOutlined, UserOutlined, CalendarOutlined,
  CheckCircleOutlined, FilePdfOutlined, FileExcelOutlined,
  DownOutlined, TeamOutlined, EditOutlined,
  StopOutlined, ExclamationCircleOutlined, HistoryOutlined,
  SafetyCertificateOutlined, FieldTimeOutlined, InfoCircleOutlined,
  FileTextOutlined, AuditOutlined, SwapOutlined, ArrowLeftOutlined,
  SendOutlined, BellOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS, COLABORADORES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

/* ── Constantes ─────────────────────────────────────────────── */
const FONT      = "'Montserrat', sans-serif"
const SEA_GREEN = '#20B2AA'

const CLASSIF_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))
const GESTAO_MAP  = Object.fromEntries(GESTOES_RESPONSAVEIS.map((g) => [g.value, g.label]))

const TIPO_LABEL: Record<string, string> = {
  adesao:  'Aceite Formal',
  ciencia: 'Apenas Leitura',
}

/* ── Mock: histórico de versões (RN17) ──────────────────────── */
const VERSION_HISTORY: Record<string, {
  versao: string; data: string; responsavel: string; depto: string; motivo: string
}[]> = {
  'doc-001': [
    { versao: 'V1', data: '2024-10-10', responsavel: 'Ana Silva',    depto: 'Compliance', motivo: 'Publicação inicial do documento.' },
    { versao: 'V2', data: '2025-02-14', responsavel: 'Bruno Costa',  depto: 'Jurídico',   motivo: 'Revisão de cláusulas para adequação à Lei 14.611/2023.' },
    { versao: 'V3', data: '2025-12-31', responsavel: 'Carla Mendes', depto: 'Compliance', motivo: 'Atualização dos itens 4.2 e 7.1 — nova política de privacidade LGPD.' },
  ],
  'doc-002': [
    { versao: 'V1', data: '2025-03-10', responsavel: 'Daniel Oliveira', depto: 'TI',      motivo: 'Publicação inicial.' },
    { versao: 'V2', data: '2025-08-01', responsavel: 'Eduarda Lima',    depto: 'TI',      motivo: 'Inclusão de seção sobre segurança em nuvem (AWS/Azure).' },
  ],
  'doc-003': [
    { versao: 'V1', data: '2025-01-08', responsavel: 'Felipe Rocha',    depto: 'Jurídico', motivo: 'Publicação inicial do termo.' },
  ],
  'doc-004': [
    { versao: 'V1', data: '2025-02-01', responsavel: 'Gabriela Souza',  depto: 'RH',       motivo: 'Publicação inicial da política de home office.' },
  ],
  'doc-005': [
    { versao: 'V1', data: '2025-10-15', responsavel: 'Henrique Alves',  depto: 'TI',       motivo: 'Publicação para entrega dos ativos do ciclo 2025.' },
  ],
  'doc-006': [
    { versao: 'V1', data: '2025-03-20', responsavel: 'Isabela Ferreira', depto: 'TI',      motivo: 'Criação do manual atualizado para 2025.' },
  ],
  'doc-007': [
    { versao: 'V1', data: '2025-03-28', responsavel: 'João Pedro',      depto: 'TI',       motivo: 'Publicação inicial da política de dispositivos móveis.' },
  ],
  'doc-008': [
    { versao: 'V1', data: '2025-02-14', responsavel: 'Karina Matos',    depto: 'RH',       motivo: 'Comunicado sobre atualização do plano de saúde — vigência março 2025.' },
  ],
}

/* ── Tipos do histórico geral ───────────────────────────────── */
type HistoricoTipo = 'publicacao' | 'edicao_metadata' | 'nova_versao' | 'inativacao' | 'encerramento' | 'destinatarios'

interface HistoricoItem {
  data: string
  autor: string
  tipo: HistoricoTipo
  descricao: string
}

/* ── Mock: histórico geral de auditoria administrativa ──────── */
const HISTORICO_GERAL: Record<string, HistoricoItem[]> = {
  'doc-001': [
    { data: '2024-10-10T09:00:00Z', autor: 'Ana Silva',    tipo: 'publicacao',        descricao: 'Documento publicado e enviado para 148 destinatários.' },
    { data: '2024-10-15T14:22:00Z', autor: 'Bruno Costa',  tipo: 'edicao_metadata',   descricao: 'Título atualizado de "Código de Conduta" para "Código de Conduta e Ética Empresarial".' },
    { data: '2025-02-14T10:05:00Z', autor: 'Carla Mendes', tipo: 'nova_versao',        descricao: 'Nova versão V2 criada. Revisão de cláusulas para adequação à Lei 14.611/2023.' },
    { data: '2025-02-14T10:06:00Z', autor: 'Carla Mendes', tipo: 'destinatarios',      descricao: '12 novos destinatários adicionados ao departamento de Compliance.' },
    { data: '2025-12-31T08:00:00Z', autor: 'Carla Mendes', tipo: 'nova_versao',        descricao: 'Nova versão V3 criada. Atualização dos itens 4.2 e 7.1 — nova política de privacidade LGPD.' },
  ],
  'doc-002': [
    { data: '2025-03-10T14:30:00Z', autor: 'Daniel Oliveira', tipo: 'publicacao',      descricao: 'Documento publicado e enviado para 148 destinatários.' },
    { data: '2025-08-01T09:15:00Z', autor: 'Eduarda Lima',    tipo: 'nova_versao',     descricao: 'Nova versão V2 criada. Inclusão de seção sobre segurança em nuvem (AWS/Azure).' },
    { data: '2026-03-14T07:59:00Z', autor: 'Sistema',         tipo: 'encerramento',   descricao: 'Vigência encerrada automaticamente. Documento movido para Concluídos.' },
  ],
  'doc-003': [
    { data: '2025-01-08T11:00:00Z', autor: 'Felipe Rocha',  tipo: 'publicacao',        descricao: 'Documento publicado e enviado para 38 destinatários.' },
    { data: '2025-03-20T16:45:00Z', autor: 'Felipe Rocha',  tipo: 'edicao_metadata',   descricao: 'Classificação adicionada: "Procedimentos".' },
  ],
  'doc-004': [
    { data: '2025-02-01T10:00:00Z', autor: 'Gabriela Souza', tipo: 'publicacao',       descricao: 'Documento publicado e enviado para 12 destinatários específicos.' },
  ],
  'doc-005': [
    { data: '2025-10-15T10:00:00Z', autor: 'Henrique Alves',  tipo: 'publicacao',      descricao: 'Documento publicado e enviado para 20 destinatários.' },
    { data: '2025-12-16T08:01:00Z', autor: 'Sistema',         tipo: 'encerramento',    descricao: 'Vigência encerrada automaticamente. Documento movido para Concluídos.' },
  ],
  'doc-006': [
    { data: '2025-03-20T16:00:00Z', autor: 'Isabela Ferreira', tipo: 'publicacao',     descricao: 'Documento criado e agendado para envio em 15/04/2026.' },
  ],
  'doc-007': [
    { data: '2025-03-28T10:00:00Z', autor: 'João Pedro', tipo: 'publicacao',           descricao: 'Documento criado e agendado para envio em 20/04/2026.' },
  ],
  'doc-008': [
    { data: '2025-02-14T09:00:00Z', autor: 'Karina Matos', tipo: 'publicacao',         descricao: 'Comunicado publicado e enviado para 148 destinatários.' },
    { data: '2025-02-20T11:30:00Z', autor: 'Karina Matos', tipo: 'destinatarios',      descricao: '8 destinatários adicionados para cobrir novos contratos.' },
  ],
}

/* ── Helper: ícone e cor por tipo de histórico ──────────────── */
function historicoConfig(tipo: HistoricoTipo): { color: string; icon: React.ReactNode; label: string } {
  switch (tipo) {
    case 'publicacao':      return { color: '#52c41a', icon: <CheckCircleOutlined />,  label: 'Publicação'        }
    case 'edicao_metadata': return { color: '#1677ff', icon: <FileTextOutlined />,     label: 'Edição de metadados' }
    case 'nova_versao':     return { color: '#722ed1', icon: <HistoryOutlined />,      label: 'Nova versão'       }
    case 'inativacao':      return { color: '#ff4d4f', icon: <StopOutlined />,         label: 'Inativação'        }
    case 'encerramento':    return { color: '#8C8C8C', icon: <AuditOutlined />,        label: 'Encerramento'      }
    case 'destinatarios':   return { color: '#fa8c16', icon: <TeamOutlined />,         label: 'Destinatários'     }
    default:                return { color: '#8C8C8C', icon: <SwapOutlined />,         label: 'Ação'              }
  }
}

/* ── Mock: tempo mínimo de leitura ─────────────────────────── */
const TEMPO_LEITURA_MOCK: Record<string, number> = {
  'doc-001': 300,
  'doc-002': 180,
  'doc-003': 120,
  'doc-004':  60,
  'doc-005':   0,
  'doc-006': 600,
  'doc-007':  60,
  'doc-008':   0,
}

/* ── Mock: trava de scroll por documento ───────────────────── */
const SCROLL_MOCK: Record<string, boolean> = {
  'doc-001': false,
  'doc-002': true,
  'doc-003': true,
  'doc-004': false,
  'doc-005': false,
  'doc-006': true,
  'doc-007': false,
  'doc-008': false,
}

/* ── Mock: documentos com regras personalizadas por departamento */
interface DeptRule { setor: string; tempo: number; scroll: boolean }

const PERSONALIZAR_DEPT_MOCK: Record<string, boolean> = {
  'doc-001': true,
  'doc-002': true,
}

const DEPT_RULES_MOCK: Record<string, DeptRule[]> = {
  'doc-001': [
    { setor: 'Compliance',       tempo: 300, scroll: true  },
    { setor: 'Jurídico',         tempo: 300, scroll: true  },
    { setor: 'TI',               tempo: 180, scroll: false },
    { setor: 'Financeiro',       tempo: 120, scroll: false },
    { setor: 'Recursos Humanos', tempo: 120, scroll: false },
  ],
  'doc-002': [
    { setor: 'TI',         tempo: 180, scroll: true  },
    { setor: 'Financeiro', tempo: 180, scroll: true  },
    { setor: 'Compliance', tempo: 120, scroll: false },
    { setor: 'Produto',    tempo: 120, scroll: false },
  ],
}

/* ── Paleta de cores para avatares de destinatários ────────── */
const AVATAR_COLORS = [
  '#1890FF', '#EB2F96', '#FA8C16',
  '#52C41A', '#722ED1', '#13C2C2',
  '#F5222D', '#FAAD14',
]

function fmtTempo(s: number): string {
  if (s === 0) return 'Sem trava'
  const min = s / 60
  return `${min} minuto${min > 1 ? 's' : ''}`
}

/* ── Helper: formatar data ──────────────────────────────────── */
function fmt(iso: string | null) {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '—'
}


/* ═══════════════════════════════════════════════════════════════
   Componente principal
══════════════════════════════════════════════════════════════ */
export function DetalhesPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pendenciasOpen,     setPendenciasOpen]     = useState(false)
  const [pendenciasTab,      setPendenciasTab]      = useState<'pendentes' | 'concluidos'>('pendentes')
  const [drawerLoading,      setDrawerLoading]      = useState(false)
  const [reminderLoadingKey, setReminderLoadingKey] = useState<string | null>(null)
  const [reminderAllLoading, setReminderAllLoading] = useState(false)
  const [regrasDrawerOpen,   setRegrasDrawerOpen]   = useState(false)
  const [inativarOpen,       setInativarOpen]       = useState(false)
  const [justificativa,      setJustificativa]      = useState('')
  const [inativarLoading,    setInativarLoading]    = useState(false)
  const [historicoOpen,      setHistoricoOpen]      = useState(false)

  const doc = MOCK_DOCUMENTOS.find((d) => d.id === id)

  /* ── Documento não encontrado ── */
  if (!doc) {
    return (
      <div style={{ padding: '60px 32px', fontFamily: FONT, textAlign: 'center' }}>
        <InfoCircleOutlined style={{ fontSize: 40, color: colorTokens.textSecondary, marginBottom: 16 }} />
        <Typography.Title level={4} style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>
          Documento não encontrado
        </Typography.Title>
        <Typography.Text style={{ fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginBottom: 20 }}>
          O documento solicitado não existe ou foi removido.
        </Typography.Text>
        <Button type="primary" onClick={() => navigate('/documentos')} style={{ fontFamily: FONT }}>
          Ir para listagem
        </Button>
      </div>
    )
  }

  /* ── Métricas ── */
  const pct       = doc.totalDestinatarios > 0
    ? Math.round((doc.totalAceites / doc.totalDestinatarios) * 100)
    : 0
  const pendentes = doc.totalDestinatarios - doc.totalAceites
  const barColor  = doc.tipo === 'adesao' ? colorTokens.primary : SEA_GREEN

  /* ── Pendentes mock ── */
  const pendentesNomes = COLABORADORES.slice(0, Math.max(pendentes, 0)).map((c) => c.label)

  /* ── Concluídos mock (com datas determinísticas) ── */
  const concluidosMock = COLABORADORES
    .slice(Math.max(pendentes, 0), doc.totalDestinatarios)
    .map((c, i) => ({
      nome: c.label,
      data: dayjs(doc.dataLancamento ?? doc.criadoEm).add(i * 2 + 1, 'day').format('DD/MM/YYYY'),
    }))

  /* ── Handlers: Drawer de pendências ── */
  function handleOpenPendencias() {
    // Abre diretamente na aba "Concluídos" se não houver pendentes
    setPendenciasTab(pendentes === 0 ? 'concluidos' : 'pendentes')
    setPendenciasOpen(true)
    setDrawerLoading(true)
    setTimeout(() => setDrawerLoading(false), 600)
  }

  function handleReminder(nome: string) {
    setReminderLoadingKey(nome)
    setTimeout(() => {
      setReminderLoadingKey(null)
      message.success(`Lembrete enviado para ${nome}.`)
    }, 900)
  }

  function handleReminderAll() {
    setReminderAllLoading(true)
    setTimeout(() => {
      setReminderAllLoading(false)
      message.success(`Lembretes enviados para ${pendentes} ${pendentes === 1 ? 'destinatário' : 'destinatários'} pendentes.`)
    }, 1200)
  }

  /* ── Dados de versões e auditoria ── */
  const versoes         = [...(VERSION_HISTORY[doc.id] ?? [])].reverse()   // mais recente → mais antiga
  const tempoLeitura    = TEMPO_LEITURA_MOCK[doc.id] ?? 0
  const scrollObrigatorio  = SCROLL_MOCK[doc.id] ?? false
  const personalizaPorDept = PERSONALIZAR_DEPT_MOCK[doc.id] ?? false
  const deptRules          = DEPT_RULES_MOCK[doc.id] ?? []
  const historico          = [...(HISTORICO_GERAL[doc.id] ?? [])].reverse()   // mais recente → mais antigo

  /* ── Autor original (primeira versão publicada) ── */
  const primeiraVersao = VERSION_HISTORY[doc.id]?.[0]
  const creatorNome    = primeiraVersao?.responsavel ?? GESTAO_MAP[doc.gestaoResponsavel] ?? doc.gestaoResponsavel
  const creatorDepto   = primeiraVersao?.depto       ?? GESTAO_MAP[doc.gestaoResponsavel] ?? ''

  /* ── Status badge palette ── */
  const statusPalette: Record<string, { border: string; color: string }> = {
    Ativo:     { border: '#52c41a', color: '#389e0d' },
    Agendado:  { border: '#FA8C16', color: '#D46B08' },
    Concluído: { border: '#BFBFBF', color: '#8C8C8C' },
    Rascunho:  { border: '#D9D9D9', color: '#8C8C8C' },
  }
  const sp = statusPalette[doc.status] ?? statusPalette.Rascunho

  /* ── Download items (auditoria) ── */
  const downloadItems: MenuProps['items'] = [
    {
      key: 'audit-pdf',
      icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />,
      label: 'Exportar como PDF',
      onClick: () => message.success('Download do relatório de auditoria em PDF iniciado.'),
    },
    {
      key: 'audit-excel',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      label: 'Exportar como Excel',
      onClick: () => message.success('Download do relatório de auditoria em Excel iniciado.'),
    },
  ]

  /* ── Menu de ações contextual ── */
  const actionItems: MenuProps['items'] = [
    ...(doc.status === 'Ativo' ? [{
      key: 'editar',
      icon: <EditOutlined />,
      label: 'Editar documento',
      onClick: () => navigate(`/documentos/${doc.id}/editar`),
    }] : []),
    ...(doc.status === 'Agendado' ? [{
      key: 'editar-agendado',
      icon: <EditOutlined />,
      label: 'Editar documento',
      onClick: () => navigate(`/documentos/${doc.id}/editar-agendado`),
    }] : []),
    {
      key: 'historico',
      icon: <AuditOutlined />,
      label: 'Histórico de ações',
      onClick: () => setHistoricoOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'audit-pdf',
      icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />,
      label: 'Exportar auditoria (PDF)',
      onClick: () => message.success('Download do relatório de auditoria em PDF iniciado.'),
    },
    {
      key: 'audit-excel',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      label: 'Exportar auditoria (Excel)',
      onClick: () => message.success('Download do relatório de auditoria em Excel iniciado.'),
    },
    ...(doc.status === 'Ativo' ? [
      { type: 'divider' as const },
      {
        key: 'inativar',
        icon: <StopOutlined style={{ color: colorTokens.error }} />,
        label: <span style={{ color: colorTokens.error }}>Inativar documento</span>,
        onClick: () => setInativarOpen(true),
      },
    ] : []),
  ]

  /* ── Handle inativar ── */
  function handleInativar() {
    setInativarLoading(true)
    setTimeout(() => {
      setInativarLoading(false)
      setInativarOpen(false)
      setJustificativa('')
      message.success('Documento inativado com sucesso.')
      navigate('/documentos')
    }, 800)
  }

  /* ────────────────────────────────────────────────────────────
     JSX
  ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px 56px', fontFamily: FONT }}>

      {/* ════ Main Card ════════════════════════════════════════ */}
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        padding: 24,
      }}>

        {/* ── Voltar ── */}
        <button
          onClick={() => navigate('/documentos')}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', marginBottom: 16,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: colorTokens.primary, fontSize: 13, fontWeight: 500,
            fontFamily: FONT,
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} />
          Voltar
        </button>

        {/* ══ Header: título + badges + ações ══════════════════ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 6,
          gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Título */}
            <Typography.Title
              level={3}
              style={{
                fontFamily: FONT,
                color: colorTokens.textPrimary,
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                lineHeight: '30px',
                marginBottom: 10,
              }}
            >
              {doc.titulo}
            </Typography.Title>

            {/* Badges: status · tipo · classificações */}
            <Space size={6} wrap>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 5,
                border: `1.5px solid ${sp.border}`,
                background: 'transparent',
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: sp.color,
              }}>
                {doc.status}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 5,
                border: `1.5px solid ${doc.tipo === 'adesao' ? colorTokens.primary + '55' : SEA_GREEN + '77'}`,
                background: 'transparent',
                fontFamily: FONT, fontSize: 11, fontWeight: 600,
                color: doc.tipo === 'adesao' ? colorTokens.primary : '#0E9E97',
              }}>
                {TIPO_LABEL[doc.tipo]}
              </span>
              {doc.classificacoes.map((c) => (
                <Tag key={c} style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 500,
                  borderRadius: 4, margin: 0, padding: '1px 8px',
                  background: '#F5F5F5', border: '1px solid #D9D9D9',
                  color: colorTokens.textSecondary,
                }}>
                  {CLASSIF_MAP[c] ?? c}
                </Tag>
              ))}
            </Space>

            <Typography.Text style={{
              fontFamily: FONT, fontSize: 13,
              color: colorTokens.textSecondary,
              display: 'block', marginTop: 10,
            }}>
              Consulte os dados do documento e gerencie o progresso dos destinatários
            </Typography.Text>
          </div>

          {/* Dropdown de ações */}
          <Dropdown menu={{ items: actionItems }} trigger={['click']} placement="bottomRight">
            <Button
              style={{
                fontFamily: FONT, fontWeight: 600, fontSize: 13,
                borderColor: '#D9D9D9', borderRadius: 8,
                height: 38, flexShrink: 0,
              }}
            >
              Ações <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
            </Button>
          </Dropdown>
        </div>

        <Divider style={{ margin: '20px 0' }} />

        {/* ══ Banner Agendado ══════════════════════════════════ */}
        {doc.status === 'Agendado' && (
          <>
            <div style={{
              background: '#FFF7E6', border: '1px solid #FA8C16',
              borderRadius: 8, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 24,
            }}>
              <CalendarOutlined style={{ fontSize: 24, color: '#D46B08', flexShrink: 0 }} />
              <div>
                <Typography.Text style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 700,
                  color: '#D46B08', textTransform: 'uppercase',
                  letterSpacing: '0.06em', display: 'block', marginBottom: 2,
                }}>
                  Envio Programado
                </Typography.Text>
                <Typography.Text style={{
                  fontFamily: FONT, fontSize: 14, fontWeight: 500,
                  color: colorTokens.textPrimary,
                }}>
                  Será enviado automaticamente em{' '}
                  <strong style={{ color: '#D46B08' }}>{fmt(doc.dataLancamento)}</strong>
                  {' '}para{' '}
                  <strong>{doc.totalDestinatarios}</strong> destinatários.
                </Typography.Text>
              </div>
            </div>
            <Divider style={{ margin: '0 0 24px' }} />
          </>
        )}

        {/* ══ KPI Dashboard (Ativo e Concluído) ═══════════════ */}
        {(doc.status === 'Ativo' || doc.status === 'Concluído') && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>

              {/* Card 1: Adesão Total */}
              <Col xs={24} sm={8}>
                <div style={{
                  border: `1.5px solid ${barColor}33`,
                  borderRadius: 8,
                  padding: '16px 20px',
                  background: doc.tipo === 'adesao' ? '#F7F8FF' : '#F0FFFD',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  height: '100%',
                }}>
                  <Progress
                    type="circle"
                    percent={pct}
                    strokeColor={barColor}
                    trailColor="#E5E7EB"
                    size={68}
                    format={(p) => (
                      <span style={{
                        fontFamily: FONT, fontSize: 15,
                        fontWeight: 800, color: barColor,
                      }}>
                        {p}%
                      </span>
                    )}
                  />
                  <div>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 10, fontWeight: 700,
                      color: colorTokens.textSecondary, textTransform: 'uppercase',
                      letterSpacing: '0.06em', display: 'block', marginBottom: 2,
                    }}>
                      Adesão Total
                    </Typography.Text>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 28, fontWeight: 800,
                      color: barColor, display: 'block', lineHeight: '34px',
                    }}>
                      {pct}%
                    </Typography.Text>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary,
                    }}>
                      {doc.totalAceites} de {doc.totalDestinatarios}
                    </Typography.Text>
                  </div>
                </div>
              </Col>

              {/* Card 2: Pendentes */}
              <Col xs={24} sm={8}>
                <div style={{
                  border: `1.5px solid ${pendentes > 0 ? '#FA8C1666' : '#52c41a55'}`,
                  borderRadius: 8,
                  padding: '16px 20px',
                  background: pendentes > 0 ? '#FFFBF5' : '#F6FFED',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 8,
                  height: '100%',
                  minHeight: 110,
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 36, fontWeight: 800,
                      color: pendentes > 0 ? '#D46B08' : '#389e0d',
                      lineHeight: '42px',
                    }}>
                      {pendentes}
                    </Typography.Text>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 10, fontWeight: 700,
                      color: colorTokens.textSecondary, textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      Pendentes
                    </Typography.Text>
                  </div>
                  {(doc.status === 'Ativo' || doc.status === 'Concluído') && (
                    <Button
                      size="small"
                      onClick={handleOpenPendencias}
                      style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 600,
                        borderColor: pendentes > 0 ? '#D46B08' : '#52c41a',
                        color:       pendentes > 0 ? '#D46B08' : '#389e0d',
                        background:  pendentes > 0 ? 'transparent' : '#F6FFED',
                        borderRadius: 6, height: 28, alignSelf: 'flex-start',
                      }}
                    >
                      {pendentes > 0 ? 'Ver Lista de Pendentes' : 'Ver Lista de Destinatários'}
                    </Button>
                  )}
                </div>
              </Col>

              {/* Card 3: Arquivo */}
              <Col xs={24} sm={8}>
                <div style={{
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '16px 20px',
                  height: '100%',
                  minHeight: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <Typography.Text style={{
                    fontFamily: FONT, fontSize: 10, fontWeight: 700,
                    color: colorTokens.textSecondary, textTransform: 'uppercase',
                    letterSpacing: '0.06em', display: 'block', marginBottom: 10,
                  }}>
                    Arquivo do Documento
                  </Typography.Text>
                  {doc.fileName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <FilePdfOutlined style={{ color: '#FF4D4F', fontSize: 20, flexShrink: 0 }} />
                      <Typography.Text style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 600,
                        color: colorTokens.textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {doc.fileName}
                      </Typography.Text>
                    </div>
                  )}
                  {doc.fileHash && (
                    <Typography.Text
                      copyable={{ tooltips: ['Copiar hash SHA-256', 'Copiado!'] }}
                      style={{
                        fontFamily: 'monospace', fontSize: 10,
                        color: colorTokens.textMuted,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {doc.fileHash.slice(0, 22)}…
                    </Typography.Text>
                  )}
                </div>
              </Col>
            </Row>

            {/* Botão download (status Concluído) */}
            {doc.status === 'Concluído' && (
              <div style={{ marginBottom: 24 }}>
                <Dropdown menu={{ items: downloadItems }} trigger={['click']}>
                  <Button
                    icon={<DownloadOutlined />}
                    style={{
                      fontFamily: FONT, fontWeight: 600, fontSize: 13,
                      borderColor: colorTokens.primary, color: colorTokens.primary,
                      borderRadius: 8, height: 38,
                    }}
                  >
                    Download Relatório de Auditoria <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                  </Button>
                </Dropdown>
              </div>
            )}

            <Divider style={{ margin: '0 0 24px' }} />
          </>
        )}

        {/* ══ Detalhes do Documento ══════════════════════════ */}
        <Typography.Text style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          color: colorTokens.textSecondary, textTransform: 'uppercase',
          letterSpacing: '0.06em', display: 'block', marginBottom: 16,
        }}>
          Detalhes do documento
        </Typography.Text>

        {/* ── Descrição ── */}
        {doc.descricao && (
          <div style={{
            background: '#fff', border: '1px solid #F0F0F0',
            borderRadius: 8, padding: 16, marginBottom: 12,
          }}>
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 700,
              color: colorTokens.textSecondary, textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: 8,
            }}>
              Descrição
            </Typography.Text>
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '20px',
            }}>
              {doc.descricao}
            </Typography.Text>
          </div>
        )}

        {/* ── Público-alvo ── */}
        <div style={{
          background: '#fff', border: '1px solid #F0F0F0',
          borderRadius: 8, padding: 16, marginBottom: 12,
        }}>
          <Typography.Text strong style={{
            fontFamily: FONT, fontSize: 13,
            color: colorTokens.textPrimary, display: 'block', marginBottom: 12,
          }}>
            Público-alvo
          </Typography.Text>

          {doc.modalidadeEnvio === 'pessoa' ? (
            /* Avatares circulares sobrepostos — destinatários individuais */
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              {(doc.destinatariosPreview ?? []).slice(0, 3).map((nome, i) => (
                <Avatar
                  key={nome}
                  size={36}
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    fontFamily: FONT, fontWeight: 700, fontSize: 13,
                    border: '2px solid #fff',
                    marginLeft: i > 0 ? -10 : 0,
                    zIndex: 10 - i,
                    flexShrink: 0,
                  }}
                >
                  {nome.charAt(0).toUpperCase()}
                </Avatar>
              ))}
              {doc.totalDestinatarios > 3 && (
                <Avatar
                  size={36}
                  style={{
                    background: '#FA8C16', color: '#fff',
                    fontFamily: FONT, fontWeight: 700, fontSize: 11,
                    border: '2px solid #fff',
                    marginLeft: -10, zIndex: 6, flexShrink: 0,
                  }}
                >
                  +{doc.totalDestinatarios - 3}
                </Avatar>
              )}
            </div>
          ) : (
            /* Tags para departamentos/setores */
            <Space size={[6, 6]} wrap style={{ marginBottom: 10 }}>
              {(doc.destinatariosPreview ?? []).map((depto) => (
                <Tag
                  key={depto}
                  style={{
                    fontFamily: FONT, fontSize: 12, fontWeight: 500,
                    borderRadius: 6, padding: '3px 10px', margin: 0,
                    background: '#FAFAFA', border: '1px solid #D9D9D9',
                    color: colorTokens.textPrimary,
                  }}
                >
                  {depto}
                </Tag>
              ))}
            </Space>
          )}

          <Typography.Text style={{
            fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary,
            display: 'block',
          }}>
            total de {doc.totalDestinatarios} destinatários
          </Typography.Text>
        </div>

        {/* ── 3 cards: Responsável · Tipo · Regras ── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>

          {/* Card 1 — Responsável */}
          <Col xs={24} sm={8}>
            <div style={{
              padding: 16, borderRadius: 8,
              background: '#fff', border: '1px solid #F0F0F0',
              height: '100%',
            }}>
              <Typography.Text strong style={{
                fontFamily: FONT, fontSize: 13,
                color: colorTokens.textPrimary, display: 'block', marginBottom: 12,
              }}>
                Responsável
              </Typography.Text>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <TeamOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, marginTop: 2, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '20px' }}>
                  Criado por: <strong>{creatorNome} — {creatorDepto}</strong>
                </Typography.Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  Data: <strong>{fmt(doc.criadoEm)}</strong>
                </Typography.Text>
              </div>
            </div>
          </Col>

          {/* Card 2 — Tipo de documento */}
          <Col xs={24} sm={8}>
            <div style={{
              padding: 16, borderRadius: 8,
              background: '#fff', border: '1px solid #F0F0F0',
              height: '100%',
            }}>
              <Typography.Text strong style={{
                fontFamily: FONT, fontSize: 13,
                color: colorTokens.textPrimary, display: 'block', marginBottom: 12,
              }}>
                Tipo de documento
              </Typography.Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileTextOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  Versionamento: <strong>{doc.tipo === 'adesao' ? 'Versionado' : 'Não versionado'}</strong>
                </Typography.Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyCertificateOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  Tipo: <strong>{TIPO_LABEL[doc.tipo]}</strong>
                </Typography.Text>
              </div>
            </div>
          </Col>

          {/* Card 3 — Regras de leitura */}
          <Col xs={24} sm={8}>
            <div style={{
              padding: 16, borderRadius: 8,
              background: '#fff', border: '1px solid #F0F0F0',
              height: '100%',
            }}>
              {/* Header: título + botão "Visualizar regras" (só se personalizaPorDept) */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 12,
              }}>
                <Typography.Text strong style={{
                  fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary,
                }}>
                  Regras de leitura
                </Typography.Text>
                {personalizaPorDept && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setRegrasDrawerOpen(true)}
                    style={{
                      fontFamily: FONT, fontSize: 12, fontWeight: 600,
                      color: colorTokens.primary, padding: 0, height: 'auto',
                    }}
                  >
                    Visualizar regras ↗
                  </Button>
                )}
              </div>

              {/* Labels: variam conforme personalizaPorDept */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FieldTimeOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  Tempo mínimo:{' '}
                  <strong>
                    {personalizaPorDept ? 'Variável por setor' : tempoLeitura > 0 ? fmtTempo(tempoLeitura) : 'Nenhum'}
                  </strong>
                </Typography.Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SwapOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, flexShrink: 0 }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  Trava de scroll:{' '}
                  <strong>
                    {personalizaPorDept ? 'Personalizada' : scrollObrigatorio ? 'Obrigatória' : 'Sem trava'}
                  </strong>
                </Typography.Text>
              </div>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '0 0 24px' }} />

        {/* ══ Histórico de Versões — Timeline (RN17) ══════════ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <HistoryOutlined style={{ color: colorTokens.textSecondary, fontSize: 14 }} />
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              color: colorTokens.textSecondary, textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Histórico de Versões
            </Typography.Text>
          </div>

          {versoes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              border: '1px dashed #D9D9D9', borderRadius: 8,
              background: '#FAFAFA',
            }}>
              <HistoryOutlined style={{
                fontSize: 28, color: '#BFBFBF',
                marginBottom: 8, display: 'block',
              }} />
              <Typography.Text style={{
                fontFamily: FONT, color: colorTokens.textSecondary, fontSize: 13,
              }}>
                Nenhum histórico de versão disponível.
              </Typography.Text>
            </div>
          ) : (
            <Timeline
              style={{ paddingTop: 8 }}
              items={versoes.map((v, idx) => {
                const isCurrent = idx === 0   // reversed: idx 0 = versão mais recente
                return {
                  dot: (
                    <div style={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      background: isCurrent ? barColor : '#F5F5F5',
                      border: `2px solid ${isCurrent ? barColor : '#D9D9D9'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontFamily: FONT, fontSize: 9, fontWeight: 800,
                        color: isCurrent ? '#fff' : colorTokens.textSecondary,
                      }}>
                        {v.versao}
                      </span>
                    </div>
                  ),
                  children: (
                    <div style={{ paddingBottom: 20, paddingLeft: 4 }}>
                      {/* Cabeçalho da versão */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        <Typography.Text style={{
                          fontFamily: FONT, fontSize: 14, fontWeight: 700,
                          color: colorTokens.textPrimary,
                        }}>
                          {v.versao}
                        </Typography.Text>
                        {isCurrent && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: barColor + '1A',
                            color: barColor,
                            border: `1px solid ${barColor}55`,
                            borderRadius: 4, padding: '1px 7px',
                            fontFamily: FONT,
                          }}>
                            Versão atual
                          </span>
                        )}
                        <Typography.Text style={{
                          fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary,
                        }}>
                          {fmt(v.data)}
                        </Typography.Text>
                      </div>

                      {/* Responsável */}
                      <Typography.Text style={{
                        fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary,
                        display: 'block', marginBottom: 10,
                      }}>
                        <UserOutlined style={{ marginRight: 5 }} />
                        {v.responsavel} — {v.depto}
                      </Typography.Text>

                      {/* Motivo + download */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{
                          background: '#F7F8FF',
                          border: `1px solid ${colorTokens.primary}18`,
                          borderRadius: 6,
                          padding: '8px 12px',
                          flex: 1,
                          minWidth: 0,
                        }}>
                          <Typography.Text style={{
                            fontFamily: FONT, fontSize: 13,
                            color: colorTokens.textPrimary,
                          }}>
                            {v.motivo}
                          </Typography.Text>
                        </div>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => message.success(`Download do arquivo da ${v.versao} iniciado.`)}
                          style={{
                            fontFamily: FONT, fontSize: 12, fontWeight: 600,
                            borderColor: colorTokens.primary, color: colorTokens.primary,
                            borderRadius: 6, height: 30, flexShrink: 0,
                          }}
                        >
                          Baixar {v.versao}
                        </Button>
                      </div>
                    </div>
                  ),
                }
              })}
            />
          )}
        </div>

      </div>

      {/* ════ Drawer: Acompanhamento de Destinatários ══════════ */}
      <Drawer
        open={pendenciasOpen}
        onClose={() => setPendenciasOpen(false)}
        placement="right"
        width={480}
        title={
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
            Acompanhamento de Destinatários
          </Typography.Text>
        }
        styles={{
          header: { padding: '20px 24px', borderBottom: '1px solid #F0F0F0' },
          body:   { padding: 0, overflowY: 'auto' },
        }}
        destroyOnHidden
      >
        <Spin spinning={drawerLoading} style={{ minHeight: 200 }}>

          <Tabs
            activeKey={pendenciasTab}
            onChange={(k) => setPendenciasTab(k as 'pendentes' | 'concluidos')}
            style={{ paddingInline: 24 }}
            tabBarStyle={{ fontFamily: FONT, marginBottom: 0 }}
            items={[
              /* ── Aba 1: Pendentes ── */
              {
                key: 'pendentes',
                label: (
                  <span style={{ fontFamily: FONT, fontWeight: 500 }}>
                    Pendentes
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700,
                      background: pendentes > 0 ? '#FFF7E6' : '#F5F5F5',
                      color: pendentes > 0 ? '#D46B08' : '#8C8C8C',
                      border: `1px solid ${pendentes > 0 ? '#FA8C16' : '#D9D9D9'}`,
                      borderRadius: 10, padding: '1px 7px',
                    }}>
                      {pendentes}
                    </span>
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: 20 }}>

                    {/* Empty state */}
                    {pendentes === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '56px 24px',
                      }}>
                        <CheckCircleOutlined style={{
                          fontSize: 44, color: '#52c41a',
                          marginBottom: 16, display: 'block',
                        }} />
                        <Typography.Text strong style={{
                          fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary,
                          display: 'block', marginBottom: 8,
                        }}>
                          Excelente!
                        </Typography.Text>
                        <Typography.Text style={{
                          fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary,
                          display: 'block', lineHeight: '20px',
                        }}>
                          Todos os destinatários já concluíram este documento.
                        </Typography.Text>
                      </div>
                    ) : (
                      <>
                        {/* Ação em lote */}
                        <div style={{ marginBottom: 16 }}>
                          <Button
                            type="primary"
                            icon={<BellOutlined />}
                            loading={reminderAllLoading}
                            onClick={handleReminderAll}
                            style={{
                              fontFamily: FONT, fontWeight: 600, fontSize: 13,
                              borderRadius: 8, height: 38,
                              background: colorTokens.primary,
                              borderColor: colorTokens.primary,
                              width: '100%',
                            }}
                          >
                            Lembrar todos os pendentes
                          </Button>
                        </div>

                        {/* Lista de pendentes */}
                        <List
                          dataSource={pendentesNomes}
                          renderItem={(nome) => (
                            <List.Item
                              style={{
                                padding: '12px 0',
                                borderBottom: '1px solid #F5F5F5',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Space size={10}>
                                <Avatar
                                  size={36}
                                  style={{
                                    background: '#EEF2FF',
                                    color: colorTokens.primary,
                                    fontFamily: FONT,
                                    fontWeight: 700,
                                    fontSize: 14,
                                    flexShrink: 0,
                                  }}
                                >
                                  {nome.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography.Text style={{
                                  fontFamily: FONT, fontSize: 13,
                                  color: colorTokens.textPrimary, fontWeight: 500,
                                }}>
                                  {nome}
                                </Typography.Text>
                              </Space>

                              <Button
                                type="link"
                                size="small"
                                icon={<SendOutlined style={{ fontSize: 11 }} />}
                                loading={reminderLoadingKey === nome}
                                onClick={() => handleReminder(nome)}
                                style={{
                                  fontFamily: FONT, fontSize: 12, fontWeight: 600,
                                  color: colorTokens.primary, padding: '0 4px',
                                  height: 'auto', flexShrink: 0,
                                }}
                              >
                                Enviar lembrete
                              </Button>
                            </List.Item>
                          )}
                          style={{ paddingBottom: 24 }}
                        />
                      </>
                    )}
                  </div>
                ),
              },

              /* ── Aba 2: Concluídos ── */
              {
                key: 'concluidos',
                label: (
                  <span style={{ fontFamily: FONT, fontWeight: 500 }}>
                    Concluídos
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 700,
                      background: '#F6FFED',
                      color: '#389e0d',
                      border: '1px solid #B7EB8F',
                      borderRadius: 10, padding: '1px 7px',
                    }}>
                      {doc.totalAceites}
                    </span>
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: 20 }}>
                    {concluidosMock.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                        <TeamOutlined style={{
                          fontSize: 40, color: '#BFBFBF',
                          marginBottom: 14, display: 'block',
                        }} />
                        <Typography.Text style={{
                          fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary,
                        }}>
                          Nenhum destinatário concluiu ainda.
                        </Typography.Text>
                      </div>
                    ) : (
                      <List
                        dataSource={concluidosMock}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '12px 0',
                              borderBottom: '1px solid #F5F5F5',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Space size={10}>
                              <Avatar
                                size={36}
                                style={{
                                  background: '#F6FFED',
                                  color: '#389e0d',
                                  fontFamily: FONT,
                                  fontWeight: 700,
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                              >
                                {item.nome.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography.Text style={{
                                fontFamily: FONT, fontSize: 13,
                                color: colorTokens.textPrimary, fontWeight: 500,
                              }}>
                                {item.nome}
                              </Typography.Text>
                            </Space>

                            <Typography.Text style={{
                              fontFamily: FONT, fontSize: 12,
                              color: '#8C8C8C', flexShrink: 0,
                            }}>
                              Concluído em {item.data}
                            </Typography.Text>
                          </List.Item>
                        )}
                        style={{ paddingBottom: 24 }}
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />

        </Spin>
      </Drawer>

      {/* ════ Modal: Inativar Documento (US 2.6) ══════════════ */}
      <Modal
        open={inativarOpen}
        onCancel={() => { setInativarOpen(false); setJustificativa('') }}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: colorTokens.error, fontSize: 18 }} />
            <Typography.Text strong style={{
              fontFamily: FONT, fontSize: 15, color: colorTokens.error,
            }}>
              Inativar Documento
            </Typography.Text>
          </Space>
        }
        footer={[
          <Button
            key="cancel"
            onClick={() => { setInativarOpen(false); setJustificativa('') }}
            style={{ fontFamily: FONT }}
          >
            Cancelar
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={inativarLoading}
            disabled={justificativa.trim().length < 10}
            onClick={handleInativar}
            icon={<StopOutlined />}
            style={{ fontFamily: FONT, fontWeight: 600 }}
          >
            Confirmar Inativação
          </Button>,
        ]}
        width={500}
        centered
        destroyOnHidden
      >
        {/* Alerta irreversível */}
        <Alert
          type="error"
          showIcon
          message={
            <span style={{ fontFamily: FONT, fontWeight: 700 }}>
              Esta ação é irreversível
            </span>
          }
          description={
            <span style={{ fontFamily: FONT, fontSize: 13 }}>
              O documento <strong>{doc.titulo}</strong> será inativado imediatamente.
              Novos destinatários não poderão acessá-lo. O histórico de aceites
              ficará preservado para auditoria.
            </span>
          }
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        {/* Campo de justificativa */}
        <div>
          <Typography.Text style={{
            fontFamily: FONT, fontSize: 13, fontWeight: 600,
            color: colorTokens.textPrimary, display: 'block', marginBottom: 8,
          }}>
            Justificativa <span style={{ color: colorTokens.error }}>*</span>
          </Typography.Text>
          <Input.TextArea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Descreva o motivo da inativação do documento..."
            rows={4}
            maxLength={500}
            showCount
            style={{
              fontFamily: FONT, fontSize: 13,
              borderRadius: 8, resize: 'none',
            }}
          />
          {justificativa.length > 0 && justificativa.trim().length < 10 && (
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 11,
              color: colorTokens.error, marginTop: 4, display: 'block',
            }}>
              Mínimo de 10 caracteres ({10 - justificativa.trim().length} restantes para habilitar)
            </Typography.Text>
          )}
        </div>
      </Modal>

      {/* ════ Drawer: Regras de Leitura por Unidade ════════════ */}
      <Drawer
        open={regrasDrawerOpen}
        onClose={() => setRegrasDrawerOpen(false)}
        placement="right"
        width={400}
        title={
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
            Regras de Leitura por Unidade
          </Typography.Text>
        }
        styles={{
          header: { padding: '20px 24px', borderBottom: '1px solid #F0F0F0' },
          body:   { padding: '20px 24px' },
        }}
        destroyOnHidden
      >
        <Table<DeptRule>
          dataSource={deptRules}
          rowKey="setor"
          size="small"
          pagination={false}
          bordered={false}
          style={{ fontFamily: FONT }}
          columns={[
            {
              title: (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary }}>
                  Setor
                </Typography.Text>
              ),
              dataIndex: 'setor',
              key: 'setor',
              render: (v: string) => (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500 }}>
                  {v}
                </Typography.Text>
              ),
            },
            {
              title: (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary }}>
                  Tempo
                </Typography.Text>
              ),
              dataIndex: 'tempo',
              key: 'tempo',
              width: 110,
              render: (v: number) => (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  {v === 0 ? 'Sem trava' : `${v / 60} min`}
                </Typography.Text>
              ),
            },
            {
              title: (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.textSecondary }}>
                  Scroll
                </Typography.Text>
              ),
              dataIndex: 'scroll',
              key: 'scroll',
              width: 110,
              render: (v: boolean) => (
                <span style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 600,
                  color:      v ? '#389e0d'  : colorTokens.textSecondary,
                  background: v ? '#F6FFED'  : '#FAFAFA',
                  border:     `1px solid ${v ? '#B7EB8F' : '#D9D9D9'}`,
                  borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap',
                }}>
                  {v ? 'Obrigatória' : 'Livre'}
                </span>
              ),
            },
          ]}
          components={{
            table: (props: React.HTMLAttributes<HTMLTableElement>) => (
              <table {...props} style={{ ...props.style, borderCollapse: 'collapse', width: '100%' }} />
            ),
          }}
        />
      </Drawer>

      {/* ════ Drawer: Histórico Geral de Ações ════════════════ */}
      <Drawer
        open={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
        title={
          <Space>
            <AuditOutlined style={{ color: colorTokens.primary }} />
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15 }}>Histórico de ações</span>
          </Space>
        }
        width={480}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {historico.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <AuditOutlined style={{ fontSize: 36, color: '#BFBFBF', marginBottom: 12, display: 'block' }} />
            <Typography.Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>
              Nenhum histórico disponível.
            </Typography.Text>
          </div>
        ) : (
          <Timeline
            style={{ paddingTop: 8 }}
            items={historico.map((h) => {
              const cfg = historicoConfig(h.tipo)
              return {
                color: cfg.color,
                dot: (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: cfg.color + '18',
                    border: `1.5px solid ${cfg.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.icon}</span>
                  </div>
                ),
                children: (
                  <div style={{ paddingBottom: 16, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Badge
                        count={cfg.label}
                        style={{
                          backgroundColor: cfg.color + '18',
                          color: cfg.color,
                          border: `1px solid ${cfg.color}44`,
                          fontFamily: FONT, fontSize: 10, fontWeight: 700,
                          borderRadius: 4, padding: '0 7px',
                          boxShadow: 'none',
                        }}
                      />
                      <Typography.Text style={{
                        fontFamily: FONT, fontSize: 11,
                        color: colorTokens.textSecondary,
                      }}>
                        {dayjs(h.data).format('DD/MM/YYYY [às] HH:mm')}
                      </Typography.Text>
                    </div>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 13,
                      color: colorTokens.textPrimary,
                      display: 'block', lineHeight: '20px', marginBottom: 4,
                    }}>
                      {h.descricao}
                    </Typography.Text>
                    <Typography.Text style={{
                      fontFamily: FONT, fontSize: 11,
                      color: colorTokens.textSecondary,
                    }}>
                      <UserOutlined style={{ marginRight: 4 }} />{h.autor}
                    </Typography.Text>
                  </div>
                ),
              }
            })}
          />
        )}
      </Drawer>

    </div>
  )
}
