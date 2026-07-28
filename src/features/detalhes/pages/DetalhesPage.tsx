/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/pages/DetalhesPage.tsx
   US 2.4–2.8 | Página de Detalhes do Documento — redesign completo
   Layout: Main Card · KPI Dashboard · Grid Info · Deptos · Timeline
───────────────────────────────────────────────────────────── */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography, Tag, Button, Progress, Row, Col,
  Space, Modal, Avatar, Dropdown, message, Input,
  Alert, Timeline, Drawer, Table, List, Collapse,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DownloadOutlined, UserOutlined, EyeOutlined,
  FilePdfOutlined, FileExcelOutlined, MoreOutlined,
  DownOutlined, CheckSquareOutlined, EditOutlined,
  StopOutlined, ExclamationCircleOutlined, HistoryOutlined,
  FieldTimeOutlined, InfoCircleOutlined,
  AuditOutlined, ArrowLeftOutlined,
  BellOutlined, ClockCircleOutlined, CheckCircleOutlined, MessageOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import type { ComentarioRevisao } from '@/features/listagem/types/documento'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS, COLABORADORES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'
import { HistoricoDrawer } from '../components/HistoricoDrawer'
import { PendenciasDrawer } from '../components/PendenciasDrawer'
import { exportarRelatorioCSV, exportarRelatorioPDF } from '../utils/exportRelatorio'
import { useRole } from '@/auth/RoleContext'

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

/* ── Ciclo de vida do documento (stepper só-leitura, EP04) ──
   Jornada canônica: Rascunho → Em revisão → Agendado → Ativo → Concluído,
   com ramais terminais Expirado e Inativo (inclui "substituído por nova versão").
   O stepper é adaptativo: não exibe etapas que o documento não percorreu. */
type StepStatus = 'finish' | 'process' | 'wait' | 'error'
interface Lifecycle { items: { title: string; status: StepStatus }[]; current: number; caption?: string }
function buildLifecycle(status: string): Lifecycle {
  const D = (title: string): { title: string; status: StepStatus } => ({ title, status: 'finish' })
  const P = (title: string): { title: string; status: StepStatus } => ({ title, status: 'process' })
  const W = (title: string): { title: string; status: StepStatus } => ({ title, status: 'wait' })
  const E = (title: string): { title: string; status: StepStatus } => ({ title, status: 'error' })
  let items: { title: string; status: StepStatus }[]
  let caption: string | undefined
  switch (status) {
    case 'Rascunho':    items = [P('Em rascunho'), W('Em aprovação'), W('Ativo')]; caption = 'Documento em criação — ainda não enviado para aprovação.'; break
    case 'Em revisão':  items = [D('Em rascunho'), P('Em aprovação'), W('Ativo')]; caption = 'Aguardando a decisão de um aprovador antes da publicação.'; break
    case 'Agendado':    items = [D('Em rascunho'), D('Em aprovação'), P('Agendado'), W('Ativo')]; caption = 'Aprovado e agendado — publicação automática na data definida.'; break
    case 'Ativo':       items = [D('Em rascunho'), D('Em aprovação'), P('Ativo')]; caption = 'Publicado e disponível aos destinatários.'; break
    case 'Concluído':   items = [D('Em rascunho'), D('Em aprovação'), D('Ativo'), D('Concluído')]; caption = 'Ciclo encerrado — coleta de aceites finalizada.'; break
    case 'Expirado':    items = [D('Em rascunho'), D('Em aprovação'), D('Ativo'), E('Expirado')]; caption = 'Vigência encerrada — publique nova versão ou inative o documento.'; break
    case 'Inativo':     items = [D('Em rascunho'), D('Em aprovação'), D('Ativo'), E('Inativo')]; caption = 'Documento inativado ou substituído por uma nova versão.'; break
    default:            items = [P(status)]
  }
  const current = Math.max(0, items.findIndex((i) => i.status === 'process' || i.status === 'error'))
  return { items, current, caption }
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
  const { can }  = useRole()

  const [pendenciasOpen,     setPendenciasOpen]     = useState(false)
  const [regrasDrawerOpen,   setRegrasDrawerOpen]   = useState(false)
  const [inativarOpen,       setInativarOpen]       = useState(false)
  const [justificativa,      setJustificativa]      = useState('')
  const [inativarLoading,    setInativarLoading]    = useState(false)
  const [historicoOpen,      setHistoricoOpen]      = useState(false)
  const [encerrarOpen,       setEncerrarOpen]       = useState(false)
  const [encerrarLoading,    setEncerrarLoading]    = useState(false)
  const [revisaoComentarios, setRevisaoComentarios] = useState<ComentarioRevisao[]>([])
  const [novoComentario,     setNovoComentario]     = useState('')
  const [previewOpen,        setPreviewOpen]        = useState(false)
  const [publicoOpen,        setPublicoOpen]        = useState(false)

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

  /* ── Dados de versões e auditoria ── */
  const versoes         = [...(VERSION_HISTORY[doc.id] ?? [])].reverse()   // mais recente → mais antiga
  const tempoLeitura    = TEMPO_LEITURA_MOCK[doc.id] ?? 0
  const scrollObrigatorio  = SCROLL_MOCK[doc.id] ?? false
  const personalizaPorDept = PERSONALIZAR_DEPT_MOCK[doc.id] ?? false
  const deptRules          = DEPT_RULES_MOCK[doc.id] ?? []

  /* ── Autor original (primeira versão publicada) ── */
  const primeiraVersao = VERSION_HISTORY[doc.id]?.[0]
  const creatorNome    = primeiraVersao?.responsavel ?? GESTAO_MAP[doc.gestaoResponsavel] ?? doc.gestaoResponsavel
  const creatorDepto   = primeiraVersao?.depto       ?? GESTAO_MAP[doc.gestaoResponsavel] ?? ''


  /* ── Export de relatório de auditoria ── */
  function handleExportCSV() {
    if (!doc) return
    exportarRelatorioCSV(doc)
    message.success('Relatório de auditoria (Excel/CSV) gerado.')
  }
  function handleExportPDF() {
    if (!doc) return
    const ok = exportarRelatorioPDF(doc)
    if (ok) message.success('Abrindo o relatório para impressão/PDF.')
    else message.warning('Permita pop-ups neste site para gerar o PDF.')
  }


  /* ── Menu de ações contextual (gated por perfil) ── */
  const canGerenciar = can('documento:gerenciar')
  const canExportar  = can('relatorio:exportar')

  const editarItems: MenuProps['items'] = canGerenciar && doc.status === 'Ativo'
    ? [{ key: 'editar', icon: <EditOutlined />, label: 'Editar documento', onClick: () => navigate(`/documentos/${doc.id}/editar`) }]
    : canGerenciar && doc.status === 'Agendado'
    ? [{ key: 'editar-agendado', icon: <EditOutlined />, label: 'Editar documento', onClick: () => navigate(`/documentos/${doc.id}/editar-agendado`) }]
    : []

  const historicoItems: MenuProps['items'] = [
    { key: 'historico', icon: <AuditOutlined />, label: 'Histórico de ações', onClick: () => setHistoricoOpen(true) },
  ]

  const exportItems: MenuProps['items'] = canExportar ? [
    { key: 'audit-pdf', icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />, label: 'Exportar auditoria (PDF)', onClick: handleExportPDF },
    { key: 'audit-excel', icon: <FileExcelOutlined style={{ color: '#52c41a' }} />, label: 'Exportar auditoria (Excel)', onClick: handleExportCSV },
  ] : []

  const finalizarItems: MenuProps['items'] = canGerenciar && doc.status === 'Ativo' ? [
    { key: 'encerrar', icon: <CheckCircleOutlined />, label: 'Encerrar documento', onClick: () => setEncerrarOpen(true) },
    { key: 'inativar', icon: <StopOutlined style={{ color: colorTokens.error }} />, label: <span style={{ color: colorTokens.error }}>Inativar documento</span>, onClick: () => setInativarOpen(true) },
  ] : []

  // Junta as seções não-vazias com divisores entre elas (sem órfãos).
  const actionItems: MenuProps['items'] = [
    [...(editarItems ?? []), ...historicoItems],
    exportItems ?? [],
    finalizarItems ?? [],
  ]
    .filter((s) => s.length > 0)
    .flatMap((s, i) => (i === 0 ? s : [{ type: 'divider' as const }, ...s]))

  /* ── Fluxo de aprovação: comentários e decisões ── */
  useEffect(() => {
    setRevisaoComentarios(doc?.comentariosRevisao ?? [])
    setNovoComentario('')
  }, [doc?.id])

  const papelAtual: ComentarioRevisao['papel'] = can('documento:aprovar') ? 'Aprovador' : 'Gestor'

  function addComentario(texto: string, tipo: ComentarioRevisao['tipo']) {
    const c: ComentarioRevisao = {
      id: `c-${Date.now()}`, autor: 'Você', papel: papelAtual, texto, data: new Date().toISOString(), tipo,
    }
    setRevisaoComentarios((prev) => [...prev, c])
  }

  function handleComentar() {
    if (!novoComentario.trim()) return
    addComentario(novoComentario.trim(), 'comentario')
    setNovoComentario('')
    message.success('Comentário adicionado.')
  }

  function handleAprovar() {
    addComentario('Documento aprovado para publicação.', 'aprovacao')
    message.success('Documento aprovado. Ele pode ser publicado.')
    setTimeout(() => navigate('/documentos'), 600)
  }

  function handleSolicitarAjustes() {
    if (!novoComentario.trim()) {
      message.warning('Escreva o que precisa ser ajustado antes de solicitar.')
      return
    }
    addComentario(novoComentario.trim(), 'ajuste')
    setNovoComentario('')
    message.success('Ajustes solicitados ao gestor responsável.')
    setTimeout(() => navigate('/documentos'), 600)
  }

  /* ── Autor retira o documento da aprovação (EP04) ── */
  function handleCancelarAprovacao() {
    Modal.confirm({
      title: 'Cancelar aprovação?',
      content: 'O documento volta para Rascunho e sai da fila dos aprovadores. Você poderá editá-lo e reenviar quando quiser.',
      okText: 'Cancelar aprovação',
      cancelText: 'Voltar',
      okButtonProps: { danger: true },
      onOk: () => {
        message.success('Aprovação cancelada. O documento voltou para Rascunho.')
        setTimeout(() => navigate('/documentos'), 500)
      },
    })
  }

  /* ── Handle encerrar (finaliza a coleta de aceites) ── */
  function handleEncerrar() {
    setEncerrarLoading(true)
    setTimeout(() => {
      setEncerrarLoading(false)
      setEncerrarOpen(false)
      message.success('Documento encerrado. A coleta de aceites foi finalizada.')
      navigate('/documentos')
    }, 800)
  }

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

      {/* Accordions no padrão Gestão de Relatos (Figma: "Open accordion" 1203:3948) */}
      <style>{`
        .relato-accordion .ant-collapse-item {
          background: #fff;
          border: 1px solid #E6E6E6;
          border-radius: 10px !important;
          margin-bottom: 12px;
          box-shadow: 0 2px 3px rgba(156,156,156,0.2);
          overflow: hidden;
          transition: border-color .2s;
        }
        .relato-accordion .ant-collapse-item:last-child { margin-bottom: 0; }
        .relato-accordion .ant-collapse-header {
          padding: 20px 24px !important;
          align-items: center !important;
        }
        .relato-accordion .ant-collapse-content-box { padding: 20px !important; }
        .relato-accordion .ant-collapse-content { border-top: none !important; }
        /* Aberto: contorno navy (padrão Relatos) + divisor navy sob o header */
        .relato-accordion .ant-collapse-item-active { border-color: ${colorTokens.primary} !important; }
        .relato-accordion .ant-collapse-item-active > .ant-collapse-header { border-bottom: 1px solid ${colorTokens.primary}; }

        /* Fluxo de status em setas (chevron) — tela "Detalhes do documento" */
        .cs-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; margin: 2px 0 20px; }
        .cs-step {
          height: 34px; display: inline-flex; align-items: center;
          padding: 0 18px 0 26px; color: #fff;
          font-family: ${FONT}; font-size: 13px; font-weight: 600; white-space: nowrap;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%);
        }
        .cs-step.is-first {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
          padding-left: 20px;
        }
        .cs-step.is-done { background: ${colorTokens.primary}; }
        .cs-step.is-current { background: #199FE3; }
        .cs-step.is-wait { background: #E9E9EC; color: #9A9A9A; }
        .cs-step.is-error { background: #CF1322; }
      `}</style>

      {/* Página de detalhes — header, setas e cards independentes (padrão da tela desenhada) */}
      <div>

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

        {/* ══ Header: título + subtítulo + ações (padrão da tela desenhada) ══ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 20,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Title
              level={3}
              style={{
                fontFamily: FONT,
                color: colorTokens.primary,
                marginTop: 0,
                marginBottom: 0,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: '30px',
              }}
            >
              {doc.titulo}
            </Typography.Title>
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 13,
              color: colorTokens.textSecondary,
              display: 'block', marginTop: 4,
            }}>
              Detalhes do documento
            </Typography.Text>
          </div>

          {/* Ações do cabeçalho */}
          <Space size={8} style={{ flexShrink: 0 }}>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setPreviewOpen(true)}
              style={{
                fontFamily: FONT, fontWeight: 600, fontSize: 13,
                borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 8, height: 38,
              }}
            >
              Visualizar documento
            </Button>
            <Dropdown menu={{ items: actionItems }} trigger={['click']} placement="bottomRight">
              <Button
                style={{
                  fontFamily: FONT, fontWeight: 600, fontSize: 13,
                  borderColor: '#D9D9D9', color: colorTokens.textPrimary, borderRadius: 8,
                  height: 38, paddingInline: 16,
                }}
              >
                Mais ações <MoreOutlined style={{ fontSize: 16, marginLeft: 6 }} />
              </Button>
            </Dropdown>
          </Space>
        </div>

        {/* ══ Corpo: setas de status · card Detalhes · accordions ══ */}
        {(() => {
          const lc = buildLifecycle(doc.status)
          const stepCls = (s: StepStatus) =>
            s === 'finish' ? 'is-done' : s === 'process' ? 'is-current' : s === 'error' ? 'is-error' : 'is-wait'

          const metaCol = (label: React.ReactNode, value: React.ReactNode) => (
            <div style={{ minWidth: 110 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>{value}</div>
            </div>
          )
          const secLabel = (t: string) => (
            <div style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, marginBottom: 6 }}>{t}</div>
          )
          const cardDivider = <div style={{ height: 1, background: '#EFEFEF', margin: '18px 0' }} />
          const deptCount = (name: string) => 6 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 34)
          const deptos = doc.modalidadeEnvio !== 'pessoa' ? (doc.destinatariosPreview ?? []) : []

          /* Lembretes e prazos */
          const proxDias = doc.proximoLembreteEm ? dayjs(doc.proximoLembreteEm).startOf('day').diff(dayjs().startOf('day'), 'day') : null
          const prazoDias = doc.prazoAssinaturaEm ? dayjs(doc.prazoAssinaturaEm).startOf('day').diff(dayjs().startOf('day'), 'day') : null
          const maxTxt = doc.cobrancaMaxLembretes && doc.cobrancaMaxLembretes > 0 ? ` de ${doc.cobrancaMaxLembretes}` : ''
          const limiteAtingido = !!doc.cobrancaMaxLembretes && doc.cobrancaMaxLembretes > 0 && (doc.lembretesEnviados ?? 0) >= doc.cobrancaMaxLembretes
          const temLembretes = doc.cobrancaAutomatica || !!doc.prazoAssinaturaEm

          return (
            <>
              {/* Fluxo de status em setas */}
              <div className="cs-steps" role="list" aria-label="Situação do documento">
                {lc.items.map((it, i) => (
                  <span key={it.title} className={`cs-step ${i === 0 ? 'is-first' : ''} ${stepCls(it.status)}`}>{it.title}</span>
                ))}
              </div>

              {/* ── Card: Detalhes do documento (seção única) ── */}
              <div style={{
                background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10,
                boxShadow: '0 2px 3px rgba(156,156,156,0.2)', padding: '22px 24px', marginBottom: 16,
              }}>
                <Typography.Text strong style={{ fontFamily: FONT, fontSize: 18, color: colorTokens.textPrimary, display: 'block' }}>
                  Detalhes do documento
                </Typography.Text>
                <div style={{ height: 1, background: '#EFEFEF', margin: '16px -24px 20px' }} />

                {/* Grid de metadados */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px 44px' }}>
                  {metaCol('Criado em', fmt(doc.criadoEm))}
                  {metaCol('Gestão', GESTAO_MAP[doc.gestaoResponsavel] ?? doc.gestaoResponsavel)}
                  {metaCol('Classificação', doc.classificacoes.length > 0
                    ? (
                      <Space size={[6, 6]} wrap>
                        {doc.classificacoes.map((c) => (
                          <Tag key={c} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px', background: '#F9F0FF', border: '1px solid #D3ADF7', color: '#722ED1' }}>
                            {CLASSIF_MAP[c] ?? c}
                          </Tag>
                        ))}
                      </Space>
                    )
                    : '—')}
                  {metaCol('Versionamento', doc.tipo === 'adesao' ? 'Versionado' : 'Não versionado')}
                  {metaCol('Tipo de aceite', TIPO_LABEL[doc.tipo])}
                </div>

                {cardDivider}

                {/* Descrição */}
                {doc.descricao && (
                  <div style={{ marginBottom: 20 }}>
                    {secLabel('Descrição')}
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, lineHeight: '22px' }}>
                      {doc.descricao}
                    </Typography.Text>
                  </div>
                )}

                {/* Público alvo */}
                <div style={{ marginBottom: deptos.length > 0 ? 20 : 0 }}>
                  {secLabel('Público alvo')}
                  <Tag style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, borderRadius: 6, margin: 0, padding: '3px 12px', background: '#FAFAFA', border: '1px solid #D9D9D9', color: colorTokens.textPrimary }}>
                    {doc.modalidadeEnvio === 'pessoa' ? 'Por colaborador' : 'Por departamento'}
                  </Tag>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                      total de {doc.totalDestinatarios} destinatários
                    </Typography.Text>
                    <Button type="link" size="small" onClick={() => setPublicoOpen(true)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.primary, padding: 0, height: 'auto' }}>
                      Ver completo ↗
                    </Button>
                  </div>
                </div>

                {/* Departamentos (grupos de avatar) */}
                {deptos.length > 0 && (
                  <div>
                    {secLabel('Departamentos')}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 44px' }}>
                      {deptos.map((dep, di) => {
                        const count = deptCount(dep)
                        const shown = Math.min(3, count)
                        const extra = count - shown
                        return (
                          <div key={dep}>
                            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, marginBottom: 6 }}>{dep}:</div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {Array.from({ length: shown }).map((_, ai) => (
                                <Avatar key={ai} size={30} style={{ background: AVATAR_COLORS[(di * 3 + ai) % AVATAR_COLORS.length], border: '2px solid #fff', marginLeft: ai > 0 ? -8 : 0, zIndex: 10 - ai, fontFamily: FONT, fontWeight: 700, fontSize: 12 }}>
                                  {dep.charAt(0).toUpperCase()}
                                </Avatar>
                              ))}
                              {extra > 0 && (
                                <span style={{ marginLeft: -8, zIndex: 1, height: 30, minWidth: 30, padding: '0 7px', borderRadius: 15, background: '#E6F2FB', border: '2px solid #fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.primary }}>
                                  +{extra}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Adesão (Ativo/Concluído) */}
                {(doc.status === 'Ativo' || doc.status === 'Concluído') && (
                  <>
                    {cardDivider}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <Progress type="circle" percent={pct} size={52} strokeColor={barColor} trailColor="#EDEDED" format={(p) => <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: barColor }}>{p}%</span>} />
                      <div>
                        {secLabel('Adesão dos destinatários')}
                        <Typography.Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>
                          {doc.totalAceites} de {doc.totalDestinatarios} · {pendentes} pendente(s)
                        </Typography.Text>
                      </div>
                      <Button size="small" onClick={() => setPendenciasOpen(true)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6, height: 30, marginLeft: 'auto' }}>
                        {pendentes > 0 ? 'Ver pendentes' : 'Ver destinatários'}
                      </Button>
                    </div>
                  </>
                )}

                {/* Responsável + regras de leitura (dados complementares) */}
                {cardDivider}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 40px', fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, alignItems: 'center' }}>
                  <span>Responsável: <strong style={{ color: colorTokens.textPrimary, fontWeight: 600 }}>{creatorNome}{creatorDepto ? ` — ${creatorDepto}` : ''}</strong></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Regras de leitura:
                    <strong style={{ color: colorTokens.textPrimary, fontWeight: 600, marginLeft: 4 }}>
                      {personalizaPorDept ? 'Variável por setor' : `${fmtTempo(tempoLeitura)} · ${scrollObrigatorio ? 'scroll obrigatório' : 'sem trava'}`}
                    </strong>
                    {personalizaPorDept && (
                      <Button type="link" size="small" onClick={() => setRegrasDrawerOpen(true)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: colorTokens.primary, padding: '0 0 0 8px', height: 'auto' }}>
                        Ver regras ↗
                      </Button>
                    )}
                  </span>
                </div>
              </div>

              {/* ── Accordions (padrão Gestão de Relatos) ── */}
              <Collapse
                className="relato-accordion"
                bordered={false}
                defaultActiveKey={doc.status === 'Em revisão' ? ['fluxo'] : []}
                expandIconPosition="end"
                expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} style={{ fontSize: 13, color: colorTokens.textSecondary }} />}
                style={{ background: 'transparent' }}
                items={[
                  {
                    key: 'lembretes',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 600, fontSize: 16, color: colorTokens.textPrimary }}>
                        <BellOutlined style={{ fontSize: 18 }} /> Lembretes e prazos
                      </span>
                    ),
                    children: temLembretes ? (
                      <>
                        <Row gutter={[16, 12]}>
                          <Col xs={24} sm={8}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <BellOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, marginTop: 3, flexShrink: 0 }} />
                              <div>
                                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block' }}>Lembretes automáticos</Typography.Text>
                                <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                                  {doc.cobrancaAutomatica ? (doc.cobrancaFrequenciaDias === 1 ? 'Diário' : `A cada ${doc.cobrancaFrequenciaDias} dias`) : 'Desativados'}
                                </Typography.Text>
                                {doc.cobrancaAutomatica && (
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block' }}>
                                    {doc.lembretesEnviados ?? 0}{maxTxt} lembrete(s) enviado(s)
                                  </Typography.Text>
                                )}
                              </div>
                            </div>
                          </Col>
                          {doc.cobrancaAutomatica && (
                            <Col xs={24} sm={8}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ClockCircleOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, marginTop: 3, flexShrink: 0 }} />
                                <div>
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block' }}>Próximo lembrete</Typography.Text>
                                  <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: limiteAtingido ? colorTokens.textSecondary : colorTokens.textPrimary }}>
                                    {limiteAtingido ? 'Limite atingido' : proxDias === null ? '—' : proxDias <= 0 ? 'Hoje' : `Em ${proxDias} dia(s)`}
                                  </Typography.Text>
                                  {!limiteAtingido && doc.proximoLembreteEm && (
                                    <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block' }}>{fmt(doc.proximoLembreteEm)}</Typography.Text>
                                  )}
                                </div>
                              </div>
                            </Col>
                          )}
                          {doc.prazoAssinaturaEm && (
                            <Col xs={24} sm={8}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <FieldTimeOutlined style={{ color: colorTokens.textSecondary, fontSize: 13, marginTop: 3, flexShrink: 0 }} />
                                <div>
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block' }}>Prazo para assinatura</Typography.Text>
                                  <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: (prazoDias ?? 0) < 0 ? '#CF1322' : colorTokens.textPrimary }}>{fmt(doc.prazoAssinaturaEm)}</Typography.Text>
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: (prazoDias ?? 0) < 0 ? '#CF1322' : colorTokens.textSecondary, display: 'block' }}>
                                    {prazoDias === null ? '' : prazoDias < 0 ? `Encerrado há ${Math.abs(prazoDias)} dia(s)` : prazoDias === 0 ? 'Encerra hoje' : `Faltam ${prazoDias} dia(s)`}
                                  </Typography.Text>
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                        <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginTop: 12 }}>
                          Encerramento: <strong>{doc.encerramentoAutomatico ? 'Automático (100% de aceite ou fim do prazo)' : 'Manual'}</strong>
                        </Typography.Text>
                      </>
                    ) : (
                      <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                        Nenhum lembrete automático ou prazo de assinatura configurado para este documento.
                      </Typography.Text>
                    ),
                  },
                  {
                    key: 'fluxo',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 600, fontSize: 16, color: colorTokens.textPrimary }}>
                        <CheckSquareOutlined style={{ fontSize: 18 }} /> Fluxo de aprovação
                      </span>
                    ),
                    children: (
                      <>
                        {/* Banner do estado da aprovação */}
                        <div style={{
                          background: doc.status === 'Em revisão' ? '#F0F5FF' : '#F6FFED',
                          border: `1px solid ${doc.status === 'Em revisão' ? '#adc6ff' : '#b7eb8f'}`,
                          borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                        }}>
                          {doc.status === 'Em revisão'
                            ? <AuditOutlined style={{ fontSize: 20, color: '#1D39C4', flexShrink: 0 }} />
                            : <CheckCircleOutlined style={{ fontSize: 20, color: '#389e0d', flexShrink: 0 }} />}
                          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textPrimary }}>
                            {doc.status === 'Em revisão'
                              ? (doc.enviadoParaAprovacaoEm
                                ? <>Enviado para aprovação em <strong>{fmt(doc.enviadoParaAprovacaoEm)}</strong> — aguardando decisão.</>
                                : 'Documento aguardando revisão de um aprovador.')
                              : doc.status === 'Rascunho' ? 'Ainda não enviado para aprovação.'
                              : 'Documento aprovado e publicado.'}
                          </Typography.Text>
                        </div>

                        {/* Conversa da revisão */}
                        {revisaoComentarios.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: doc.status === 'Em revisão' ? 16 : 0 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FONT, fontSize: 12, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <MessageOutlined style={{ fontSize: 13 }} /> Conversa da revisão
                            </span>
                            {revisaoComentarios.map((c) => {
                              const isAjuste = c.tipo === 'ajuste'
                              const isAprov = c.tipo === 'aprovacao'
                              const accent = isAjuste ? '#D46B08' : isAprov ? '#389e0d' : colorTokens.primary
                              return (
                                <div key={c.id} style={{ border: `1px solid ${accent}22`, background: `${accent}0D`, borderRadius: 8, padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                    <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{c.autor}</Typography.Text>
                                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: accent, background: `${accent}1A`, border: `1px solid ${accent}55`, borderRadius: 4, padding: '0 6px' }}>
                                      {c.papel}{isAjuste ? ' · ajuste' : isAprov ? ' · aprovação' : ''}
                                    </span>
                                    <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>{fmt(c.data)}</Typography.Text>
                                  </div>
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{c.texto}</Typography.Text>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Decisão / comentar — somente quando em aprovação */}
                        {doc.status === 'Em revisão' && (
                          <>
                            <Input.TextArea
                              value={novoComentario}
                              onChange={(e) => setNovoComentario(e.target.value)}
                              placeholder={can('documento:aprovar') ? 'Comente ou descreva os ajustes necessários…' : 'Adicione um comentário…'}
                              rows={3}
                              maxLength={400}
                              style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none', marginBottom: 12 }}
                            />
                            <Space wrap>
                              <Button onClick={handleComentar} disabled={!novoComentario.trim()} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8 }}>
                                Comentar
                              </Button>
                              {can('documento:aprovar') && (
                                <>
                                  <Button onClick={handleSolicitarAjustes} icon={<EditOutlined />} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: '#FA8C16', color: '#D46B08' }}>
                                    Solicitar ajustes
                                  </Button>
                                  <Button type="primary" onClick={handleAprovar} icon={<CheckCircleOutlined />} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: '#389e0d', borderColor: '#389e0d' }}>
                                    Aprovar documento
                                  </Button>
                                </>
                              )}
                              {!can('documento:aprovar') && can('documento:gerenciar') && (
                                <Button danger onClick={handleCancelarAprovacao} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8 }}>
                                  Cancelar aprovação
                                </Button>
                              )}
                            </Space>
                          </>
                        )}

                        {doc.status !== 'Em revisão' && revisaoComentarios.length === 0 && (
                          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                            Nenhum comentário registrado na aprovação.
                          </Typography.Text>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'historico',
                    label: (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 600, fontSize: 16, color: colorTokens.textPrimary }}>
                        <HistoryOutlined style={{ fontSize: 18 }} /> Histórico de versões
                      </span>
                    ),
                    children: versoes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed #D9D9D9', borderRadius: 8, background: '#FAFAFA' }}>
                        <HistoryOutlined style={{ fontSize: 26, color: '#BFBFBF', marginBottom: 8, display: 'block' }} />
                        <Typography.Text style={{ fontFamily: FONT, color: colorTokens.textSecondary, fontSize: 13 }}>
                          Nenhum histórico de versão disponível.
                        </Typography.Text>
                      </div>
                    ) : (
                      <Timeline
                        style={{ paddingTop: 4 }}
                        items={versoes.map((v, idx) => {
                          const isCurrent = idx === 0
                          return {
                            dot: (
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: isCurrent ? barColor : '#F5F5F5', border: `2px solid ${isCurrent ? barColor : '#D9D9D9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: isCurrent ? '#fff' : colorTokens.textSecondary }}>{v.versao}</span>
                              </div>
                            ),
                            children: (
                              <div style={{ paddingBottom: 20, paddingLeft: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: colorTokens.textPrimary }}>{v.versao}</Typography.Text>
                                  {isCurrent && (
                                    <span style={{ fontSize: 10, fontWeight: 700, background: barColor + '1A', color: barColor, border: `1px solid ${barColor}55`, borderRadius: 4, padding: '1px 7px', fontFamily: FONT }}>Versão atual</span>
                                  )}
                                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>{fmt(v.data)}</Typography.Text>
                                </div>
                                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 10 }}>
                                  <UserOutlined style={{ marginRight: 5 }} />{v.responsavel} — {v.depto}
                                </Typography.Text>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                  <div style={{ background: '#F7F8FF', border: `1px solid ${colorTokens.primary}18`, borderRadius: 6, padding: '8px 12px', flex: 1, minWidth: 0 }}>
                                    <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{v.motivo}</Typography.Text>
                                  </div>
                                  <Button size="small" icon={<DownloadOutlined />} onClick={() => message.success(`Download do arquivo da ${v.versao} iniciado.`)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6, height: 30, flexShrink: 0 }}>
                                    Baixar {v.versao}
                                  </Button>
                                </div>
                              </div>
                            ),
                          }
                        })}
                      />
                    ),
                  },
                ]}
              />
            </>
          )
        })()}

      </div>

      <PendenciasDrawer open={pendenciasOpen} onClose={() => setPendenciasOpen(false)} doc={doc} />

      {/* ════ Modal: Encerrar Documento (finaliza coleta) ══════ */}
      <Modal
        open={encerrarOpen}
        onCancel={() => setEncerrarOpen(false)}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: colorTokens.primary, fontSize: 18 }} />
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
              Encerrar Documento
            </Typography.Text>
          </Space>
        }
        footer={[
          <Button key="cancel" onClick={() => setEncerrarOpen(false)} style={{ fontFamily: FONT, borderRadius: 8 }}>Cancelar</Button>,
          <Button key="ok" type="primary" loading={encerrarLoading} onClick={handleEncerrar} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: colorTokens.primary, borderColor: colorTokens.primary }}>
            Encerrar documento
          </Button>,
        ]}
        width={480}
        centered
        destroyOnHidden
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
          A coleta de aceites de <strong>{doc.titulo}</strong> será finalizada e o documento passará para <strong>Concluído</strong>.
          {pendentes > 0 && <> Restam <strong>{pendentes}</strong> destinatário(s) pendente(s), que ficarão registrados como não concluídos.</>}
          {' '}O histórico de aceites é preservado para auditoria.
        </Typography.Text>
      </Modal>

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

      <HistoricoDrawer open={historicoOpen} onClose={() => setHistoricoOpen(false)} docId={doc.id} />

      {/* ════ Modal: Pré-visualização do documento ═════════════ */}
      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#FF4D4F', fontSize: 18 }} />
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
              {doc.fileName ?? 'Documento'}
            </Typography.Text>
          </Space>
        }
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)} style={{ fontFamily: FONT, borderRadius: 8 }}>Fechar</Button>,
          <Button key="dl" type="primary" icon={<DownloadOutlined />} onClick={() => message.success('Download do documento iniciado.')} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: colorTokens.primary, borderColor: colorTokens.primary }}>
            Baixar arquivo
          </Button>,
        ]}
        width={760}
        centered
        destroyOnHidden
      >
        {/* Página simulada do documento */}
        <div style={{ background: '#F5F5F5', borderRadius: 8, padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', borderRadius: 4, padding: '48px 56px', maxWidth: 620, margin: '0 auto', minHeight: 480 }}>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {(doc.classificacoes ?? []).map((c) => CLASSIF_MAP[c] ?? c).join(' · ')}
            </Typography.Text>
            <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.textPrimary, marginTop: 0, marginBottom: 20 }}>
              {doc.titulo}
            </Typography.Title>
            <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '22px' }}>
              {doc.descricao || 'Conteúdo do documento.'}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '22px' }}>
              Esta é uma pré-visualização simulada do arquivo no protótipo. Em produção, o PDF original
              (imutável, com hash registrado) é renderizado aqui para conferência antes da aprovação.
            </Typography.Paragraph>
            {doc.fileHash && (
              <Typography.Text style={{ fontFamily: 'monospace', fontSize: 10, color: colorTokens.textMuted, display: 'block', marginTop: 24, wordBreak: 'break-all' }}>
                SHA-256: {doc.fileHash}
              </Typography.Text>
            )}
          </div>
        </div>
      </Modal>

      {/* ════ Drawer: Público-alvo completo ════════════════════ */}
      <Drawer
        open={publicoOpen}
        onClose={() => setPublicoOpen(false)}
        placement="right"
        width={420}
        title={
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
            Público-alvo ({doc.totalDestinatarios})
          </Typography.Text>
        }
        styles={{ header: { padding: '20px 24px', borderBottom: '1px solid #F0F0F0' }, body: { padding: '12px 24px' } }}
        destroyOnHidden
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 12 }}>
          {doc.modalidadeEnvio === 'pessoa'
            ? 'Envio por destinatários individuais.'
            : 'Envio por departamento. Todos os colaboradores dos setores abaixo recebem o documento.'}
        </Typography.Text>

        {doc.modalidadeEnvio === 'pessoa' ? (
          <List
            dataSource={COLABORADORES.slice(0, doc.totalDestinatarios).map((c) => c.label)}
            renderItem={(nome) => (
              <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                <Space size={10}>
                  <Avatar size={32} style={{ background: '#EEF2FF', color: colorTokens.primary, fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
                    {nome.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{nome}</Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Space size={[8, 8]} wrap>
            {(doc.destinatariosPreview ?? []).map((depto) => (
              <Tag key={depto} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, borderRadius: 6, padding: '4px 12px', margin: 0, background: '#FAFAFA', border: '1px solid #D9D9D9', color: colorTokens.textPrimary }}>
                {depto}
              </Tag>
            ))}
          </Space>
        )}
      </Drawer>

    </div>
  )
}
