/* ─────────────────────────────────────────────────────────────
   src/features/aprovacao/pages/ApprovalPage.tsx
   Tela de revisão/aprovação — Detalhes do documento + PDF + chat.
   Gestor: edita os detalhes (modal), envia novo arquivo, reenvia/conclui.
   Aprovador: visualiza detalhes, comenta, solicita ajuste (categorizado), aprova.
───────────────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Input, Avatar, Space, message, Row, Col, Steps, Modal, Select, Tag, DatePicker, ConfigProvider } from 'antd'
import {
  ArrowLeftOutlined, InfoCircleOutlined, EditOutlined, CheckCircleOutlined,
  FilePdfOutlined, UploadOutlined, PaperClipOutlined, DownloadOutlined, SendOutlined,
  RedoOutlined, CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import ptBR from 'antd/locale/pt_BR'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import type { ComentarioRevisao } from '@/features/listagem/types/documento'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'
import { useRole } from '@/auth/RoleContext'

dayjs.locale('pt-br')

const FONT = "'Montserrat', sans-serif"
const CLASSIF_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))
const GESTAO_MAP = Object.fromEntries(GESTOES_RESPONSAVEIS.map((g) => [g.value, g.label]))
const TIPO_ACEITE: Record<string, string> = { adesao: 'Aceite formal', ciencia: 'Apenas leitura' }

/* Paleta determinística para avatares (por nome) */
const AVATAR_PALETTE = ['#3BA55D', '#EB2F96', '#722ED1', '#F5222D', '#FA8C16', '#1890FF', '#13C2C2', '#2F54EB']
function avatarColor(nome: string) {
  const sum = [...nome].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length]
}
function iniciais(nome: string) {
  return nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('')
}
function fmtData(iso: string) {
  return dayjs(iso).format('DD/MM/YYYY HH:mm')
}

/* Categorias da solicitação de ajuste */
const CATEGORIA_OPTIONS = [
  { value: 'detalhe', label: 'Detalhe do documento' },
  { value: 'dados',   label: 'Dados do documento' },
]
const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(CATEGORIA_OPTIONS.map((o) => [o.value, o.label]))

const APPROVAL_CSS = `
  .aprov-panel {
    height: calc(100vh - 320px);
    min-height: 460px;
  }
  .aprov-chat-scroll { scrollbar-width: thin; }
  .aprov-chat-scroll::-webkit-scrollbar { width: 6px; }
  .aprov-chat-scroll::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 3px; }
  @media (max-width: 991px) {
    .aprov-panel { height: 540px; min-height: 0; }
  }
`

interface Detalhes {
  titulo: string
  descricao: string
  classificacoes: string[]
  gestaoResponsavel: string
}

export function ApprovalPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useRole()

  const doc = MOCK_DOCUMENTOS.find((d) => d.id === id)
  const papelAtual: ComentarioRevisao['papel'] = can('documento:aprovar') ? 'Aprovador' : 'Gestor'
  const ehAprovador = papelAtual === 'Aprovador'

  const [mensagens, setMensagens] = useState<ComentarioRevisao[]>([])
  const [texto, setTexto] = useState('')
  const [arquivoEnviado, setArquivoEnviado] = useState(false)
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [confirmAprovarOpen, setConfirmAprovarOpen] = useState(false)
  const [ajusteOpen, setAjusteOpen] = useState(false)
  const [ajusteCategoria, setAjusteCategoria] = useState<string | undefined>(undefined)
  const [ajusteTexto, setAjusteTexto] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [simultaneaAprovada, setSimultaneaAprovada] = useState(false)
  const [agendarOpen, setAgendarOpen] = useState(false)
  const [dataPublicacao, setDataPublicacao] = useState<Dayjs | null>(null)
  const [detalhes, setDetalhes] = useState<Detalhes>({ titulo: '', descricao: '', classificacoes: [], gestaoResponsavel: '' })
  const [editDraft, setEditDraft] = useState<Detalhes>({ titulo: '', descricao: '', classificacoes: [], gestaoResponsavel: '' })
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMensagens(doc?.comentariosRevisao ?? [])
    setTexto('')
    setArquivoEnviado(false)
    setEtapaAtual(doc?.etapaAtual ?? 0)
    setSimultaneaAprovada(false)
    setDetalhes({
      titulo: doc?.titulo ?? '',
      descricao: doc?.descricao ?? '',
      classificacoes: doc?.classificacoes ?? [],
      gestaoResponsavel: doc?.gestaoResponsavel ?? '',
    })
  }, [doc?.id, doc?.titulo, doc?.descricao, doc?.classificacoes, doc?.gestaoResponsavel, doc?.etapaAtual])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length])

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'approval-styles'
    el.textContent = APPROVAL_CSS
    document.head.appendChild(el)
    return () => { document.getElementById('approval-styles')?.remove() }
  }, [])

  if (!doc) {
    return (
      <div style={{ padding: '60px 32px', fontFamily: FONT, textAlign: 'center' }}>
        <InfoCircleOutlined style={{ fontSize: 40, color: colorTokens.textSecondary, marginBottom: 16 }} />
        <Typography.Title level={4} style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>Documento não encontrado</Typography.Title>
        <Button type="primary" onClick={() => navigate('/documentos')} style={{ fontFamily: FONT }}>Ir para listagem</Button>
      </div>
    )
  }

  const temAjustePendente = mensagens.some((m) => m.tipo === 'ajuste')
  const tipoRevisao = doc.tipoRevisao ?? 'simultanea'
  const aprovadores = doc.aprovadores ?? []
  const etapasConcluidas = tipoRevisao === 'etapas' && etapaAtual >= aprovadores.length
  // Documento totalmente aprovado → estado de finalização (gestor publica/agenda/reenvia)
  const documentoAprovado = etapasConcluidas || (tipoRevisao === 'simultanea' && simultaneaAprovada)

  function addMensagem(txt: string, tipo: ComentarioRevisao['tipo'], categoria?: ComentarioRevisao['categoria']) {
    const nova: ComentarioRevisao = {
      id: `c-${Date.now()}`, autor: 'Você', papel: papelAtual, texto: txt, data: new Date().toISOString(), tipo,
      ...(categoria ? { categoria } : {}),
    }
    setMensagens((prev) => [...prev, nova])
  }

  function handleComentar() {
    if (!texto.trim()) return
    addMensagem(texto.trim(), 'comentario')
    setTexto('')
  }
  function abrirAjuste() {
    setAjusteCategoria(undefined)
    setAjusteTexto('')
    setAjusteOpen(true)
  }
  function handleConfirmAjuste() {
    if (!ajusteCategoria || !ajusteTexto.trim()) return
    addMensagem(ajusteTexto.trim(), 'ajuste', ajusteCategoria as ComentarioRevisao['categoria'])
    setAjusteOpen(false); setAjusteCategoria(undefined); setAjusteTexto('')
    message.success('Ajuste solicitado ao gestor.')
  }
  function handleAprovar() {
    if (tipoRevisao === 'etapas') {
      const nome = aprovadores[etapaAtual] ?? `Etapa ${etapaAtual + 1}`
      const ultima = etapaAtual >= aprovadores.length - 1
      addMensagem(ultima ? `Aprovei a etapa "${nome}". Todas as etapas foram concluídas.` : `Aprovei a etapa "${nome}".`, 'aprovacao')
      setEtapaAtual((e) => e + 1)
      message.success(ultima ? 'Todas as etapas aprovadas. O documento pode ser ativado.' : `Etapa aprovada. Segue para ${aprovadores[etapaAtual + 1]}.`)
      return
    }
    addMensagem('Documento aprovado para publicação.', 'aprovacao')
    setSimultaneaAprovada(true)
    message.success('Documento aprovado.')
  }
  function handleEnviarNovoArquivo() {
    setArquivoEnviado(true)
    addMensagem('Enviei o arquivo já ajustado para nova análise.', 'comentario')
    message.success('Novo arquivo enviado (simulado).')
  }
  function handleReenviar() {
    message.success('Documento reenviado para aprovação.')
    setTimeout(() => navigate('/documentos'), 700)
  }
  function handleConcluir() {
    message.success('Aprovação concluída. Documento ativado.')
    setTimeout(() => navigate('/documentos'), 700)
  }
  /* ── Finalização (gestor, após aprovação completa) ── */
  function handlePublicarAgora() {
    message.success('Documento publicado e ativado.')
    setTimeout(() => navigate('/documentos'), 700)
  }
  function handleConfirmAgendar() {
    if (!dataPublicacao) return
    setAgendarOpen(false)
    message.success(`Publicação agendada para ${dataPublicacao.format('DD/MM/YYYY [às] HH:mm')}.`)
    setTimeout(() => navigate('/documentos'), 800)
  }
  function handleReenviarAprovacao() {
    Modal.confirm({
      title: 'Reenviar para nova aprovação?',
      icon: <RedoOutlined style={{ color: colorTokens.primary }} />,
      content: 'Inicia um novo ciclo de aprovação com os mesmos aprovadores. O histórico da conversa é preservado.',
      okText: 'Reenviar',
      cancelText: 'Cancelar',
      okButtonProps: { style: { fontFamily: FONT, fontWeight: 600, background: colorTokens.primary, borderColor: colorTokens.primary } },
      cancelButtonProps: { style: { fontFamily: FONT } },
      onOk: () => {
        setEtapaAtual(0)
        setSimultaneaAprovada(false)
        setArquivoEnviado(false)
        addMensagem('Documento reenviado para uma nova rodada de aprovação.', 'comentario')
        message.success('Nova rodada de aprovação iniciada.')
      },
    })
  }
  function abrirEdicao() {
    setEditDraft({ ...detalhes })
    setEditOpen(true)
  }
  function handleSalvarDetalhes() {
    if (!editDraft.titulo.trim()) { message.warning('O título é obrigatório.'); return }
    setDetalhes({ ...editDraft })
    setEditOpen(false)
    message.success('Detalhes do documento atualizados.')
  }

  const roleTag = (papel: ComentarioRevisao['papel']) => {
    const g = papel === 'Gestor'
    return (
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '0 7px', lineHeight: '18px',
        background: g ? '#E6F4FF' : '#FFF7E6',
        border: `1px solid ${g ? '#91CAFF' : '#FFD591'}`,
        color: g ? '#1677FF' : '#D46B08',
      }}>{papel}</span>
    )
  }

  const metaItem = (label: string, value: React.ReactNode) => (
    <div style={{ minWidth: 130 }}>
      <div style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary }}>{value}</div>
    </div>
  )

  return (
    <div style={{ padding: '24px 32px 32px', fontFamily: FONT, background: '#F5F6F8', minHeight: '100%' }}>
      {/* ── Header ── */}
      <button
        onClick={() => navigate('/documentos')}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 5, color: colorTokens.primary, fontSize: 13, fontWeight: 500, fontFamily: FONT }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> Voltar
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.primary, marginTop: 0, marginBottom: 4, fontSize: 22, fontWeight: 700 }}>
            {detalhes.titulo}
          </Typography.Title>
          <Space size={8} wrap>
            {documentoAprovado
              ? <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#389e0d', background: '#F6FFED', border: '1px solid #B7EB8F', borderRadius: 6, padding: '2px 10px' }}>Aprovado</span>
              : <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#1677FF', background: '#E6F4FF', border: '1px solid #91CAFF', borderRadius: 6, padding: '2px 10px' }}>Em aprovação</span>}
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
              Revise o documento e converse com {ehAprovador ? 'o gestor' : 'os aprovadores'} para alinhar ajustes.
            </Typography.Text>
          </Space>
        </div>
      </div>

      {/* ── Fluxo de aprovação (tipo de revisão + timeline) ── */}
      {aprovadores.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, boxShadow: '0 2px 3px rgba(156,156,156,0.2)', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: FONT, fontSize: 12, fontWeight: 700, borderRadius: 6, padding: '2px 10px',
              ...(tipoRevisao === 'etapas'
                ? { background: '#F9F0FF', border: '1px solid #D3ADF7', color: '#722ED1' }
                : { background: '#E6F4FF', border: '1px solid #91CAFF', color: '#1677FF' }),
            }}>
              {tipoRevisao === 'etapas' ? 'Revisão em etapas' : 'Revisão simultânea'}
            </span>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
              {tipoRevisao === 'etapas'
                ? (etapasConcluidas ? 'Todas as etapas foram aprovadas.' : `Aprovação sequencial — etapa atual: ${aprovadores[etapaAtual]}.`)
                : (documentoAprovado ? 'Documento aprovado por todos os aprovadores.' : `${aprovadores.length} aprovadores revisam em paralelo.`)}
            </Typography.Text>
          </div>
          {tipoRevisao === 'etapas' ? (
            <Steps
              size="small"
              current={etapaAtual}
              items={[
                ...aprovadores.map((nome, i) => ({
                  title: nome,
                  status: (i < etapaAtual ? 'finish' : i === etapaAtual ? 'process' : 'wait') as 'finish' | 'process' | 'wait',
                })),
                { title: 'Documento aprovado', status: (etapasConcluidas ? 'finish' : 'wait') as 'finish' | 'wait', icon: <CheckCircleOutlined /> },
              ]}
              style={{ fontFamily: FONT }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {aprovadores.map((nome) => (
                <span key={nome} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F5F6F8', borderRadius: 20, padding: '4px 12px 4px 4px' }}>
                  <Avatar size={26} style={{ background: avatarColor(nome), fontFamily: FONT, fontWeight: 700, fontSize: 11 }}>{iniciais(nome)}</Avatar>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textPrimary }}>{nome}</Typography.Text>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detalhes do documento (visível para os dois papéis; gestor edita) ── */}
      <div style={{ background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, boxShadow: '0 2px 3px rgba(156,156,156,0.2)', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>Detalhes do documento</Typography.Text>
          {!ehAprovador && !documentoAprovado && (
            <Button size="small" icon={<EditOutlined />} onClick={abrirEdicao} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6 }}>Editar</Button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 40px', marginBottom: detalhes.descricao ? 14 : 0 }}>
          {metaItem('Criado em', dayjs(doc.criadoEm).format('DD/MM/YYYY'))}
          {metaItem('Gestão responsável', GESTAO_MAP[detalhes.gestaoResponsavel] ?? detalhes.gestaoResponsavel ?? '—')}
          {metaItem('Classificações', detalhes.classificacoes.length > 0
            ? (
              <Space size={[6, 6]} wrap>
                {detalhes.classificacoes.map((c) => (
                  <Tag key={c} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px', background: '#F9F0FF', border: '1px solid #D3ADF7', color: '#722ED1' }}>{CLASSIF_MAP[c] ?? c}</Tag>
                ))}
              </Space>
            )
            : '—')}
          {metaItem('Tipo de aceite', TIPO_ACEITE[doc.tipo] ?? doc.tipo)}
        </div>
        {detalhes.descricao && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, marginBottom: 4 }}>Descrição</div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '20px' }}>{detalhes.descricao}</Typography.Text>
          </div>
        )}
      </div>

      {/* ── Split: PDF (esquerda) + Chat (direita) ── */}
      <Row gutter={[16, 16]}>
        {/* Documento / PDF */}
        <Col xs={24} lg={14}>
          <div className="aprov-panel" style={{ background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, boxShadow: '0 2px 3px rgba(156,156,156,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* topo do painel — arquivo + ações (Baixar / Enviar novo arquivo) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #F0F0F0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <FilePdfOutlined style={{ color: '#FF4D4F', fontSize: 20, flexShrink: 0 }} />
                <Typography.Text strong ellipsis style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  {doc.fileName ?? 'documento.pdf'}
                </Typography.Text>
                {arquivoEnviado && (
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#389e0d', background: '#F6FFED', border: '1px solid #B7EB8F', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>versão ajustada</span>
                )}
              </div>
              <Space size={8}>
                <Button size="small" icon={<DownloadOutlined />} onClick={() => message.success('Download do documento iniciado.')} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6 }}>Baixar</Button>
                {!ehAprovador && !documentoAprovado && (
                  <Button size="small" type="primary" icon={<UploadOutlined />} onClick={handleEnviarNovoArquivo} disabled={arquivoEnviado} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderRadius: 6, background: arquivoEnviado ? undefined : colorTokens.primary, borderColor: arquivoEnviado ? undefined : colorTokens.primary }}>
                    {arquivoEnviado ? 'Arquivo enviado' : 'Enviar novo arquivo'}
                  </Button>
                )}
              </Space>
            </div>
            {/* corpo — PDF simulado */}
            <div className="aprov-chat-scroll" style={{ flex: 1, overflowY: 'auto', background: '#F5F5F5', padding: 20 }}>
              <div style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', borderRadius: 4, padding: '44px 52px', maxWidth: 620, margin: '0 auto', minHeight: 720 }}>
                <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  {detalhes.classificacoes.map((c) => CLASSIF_MAP[c] ?? c).join(' · ')}
                </Typography.Text>
                <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.textPrimary, marginTop: 0, marginBottom: 20 }}>{detalhes.titulo}</Typography.Title>
                <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '22px' }}>{detalhes.descricao || 'Conteúdo do documento.'}</Typography.Paragraph>
                <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '22px' }}>
                  Pré-visualização simulada do arquivo no protótipo. Em produção, o PDF original (imutável, com hash registrado) é renderizado aqui para conferência durante a aprovação.
                </Typography.Paragraph>
                {doc.fileHash && (
                  <Typography.Text style={{ fontFamily: 'monospace', fontSize: 10, color: colorTokens.textMuted, display: 'block', marginTop: 24, wordBreak: 'break-all' }}>SHA-256: {doc.fileHash}</Typography.Text>
                )}
              </div>
            </div>
          </div>
        </Col>

        {/* Chat de aprovação */}
        <Col xs={24} lg={10}>
          <div className="aprov-panel" style={{ background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, boxShadow: '0 2px 3px rgba(156,156,156,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F0F0F0' }}>
              <Typography.Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary }}>Conversa de aprovação</Typography.Text>
            </div>

            {/* mensagens */}
            <div className="aprov-chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
              {mensagens.length === 0 && (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>Nenhuma mensagem ainda. Inicie a conversa abaixo.</Typography.Text>
              )}
              {mensagens.map((m) => {
                const own = m.autor === 'Você'
                const isAjuste = m.tipo === 'ajuste'
                const isAprov = m.tipo === 'aprovacao'
                // Tipo tem prioridade: ajuste=laranja claro, aprovação=verde claro (texto escuro,
                // título colorido legível). Só o comentário padrão do usuário logado fica azul.
                const bubbleBg = isAjuste ? '#FFF3E0' : isAprov ? '#F6FFED' : own ? '#1677FF' : '#F1F2F4'
                const bubbleColor = (!isAjuste && !isAprov && own) ? '#fff' : colorTokens.textPrimary
                const bubbleBorder = isAjuste ? '1px solid #FFD591' : isAprov ? '1px solid #B7EB8F' : 'none'
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: own ? 'row-reverse' : 'row', gap: 10, marginBottom: 18 }}>
                    <Avatar size={38} style={{ background: own ? colorTokens.primary : avatarColor(m.autor), fontFamily: FONT, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {own ? 'EU' : iniciais(m.autor)}
                    </Avatar>
                    <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                      {!own && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{m.autor}</Typography.Text>
                          {roleTag(m.papel)}
                        </div>
                      )}
                      <div style={{ background: bubbleBg, color: bubbleColor, border: bubbleBorder, borderRadius: 10, padding: '10px 14px' }}>
                        {isAjuste && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#D46B08' }}>Solicitação de ajuste</Typography.Text>
                            {m.categoria && (
                              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#D46B08', background: '#fff', border: '1px solid #FFD591', borderRadius: 4, padding: '0 6px' }}>{CATEGORIA_LABEL[m.categoria]}</span>
                            )}
                          </div>
                        )}
                        {isAprov && (
                          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#389e0d', display: 'block', marginBottom: 4 }}>Documento aprovado</Typography.Text>
                        )}
                        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: bubbleColor, lineHeight: '20px' }}>{m.texto}</Typography.Text>
                      </div>
                      <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary, marginTop: 5 }}>{fmtData(m.data)}</Typography.Text>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {documentoAprovado ? (
              /* Finalização — gestor publica/agenda/reenvia; aprovador vê o histórico */
              <div style={{ borderTop: '1px solid #F0F0F0', padding: '14px 16px' }}>
                {ehAprovador ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: '#389e0d', fontSize: 16, flexShrink: 0 }} />
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>Aprovação concluída — conversa em modo histórico.</Typography.Text>
                  </div>
                ) : (
                  <>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#389e0d', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <CheckCircleOutlined style={{ marginRight: 6 }} />Documento aprovado — finalize a publicação
                    </Typography.Text>
                    <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                      <Button icon={<RedoOutlined />} onClick={handleReenviarAprovacao} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8 }}>Reenviar para aprovação</Button>
                      <Button icon={<CalendarOutlined />} onClick={() => setAgendarOpen(true)} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: colorTokens.primary, color: colorTokens.primary }}>Agendar publicação</Button>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={handlePublicarAgora} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: '#389e0d', borderColor: '#389e0d' }}>Publicar agora</Button>
                    </Space>
                  </>
                )}
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #F0F0F0', padding: '12px 16px 14px' }}>
                <Input.TextArea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escreva sua mensagem"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  maxLength={600}
                  style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none', marginBottom: 10 }}
                />
                <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button icon={<SendOutlined />} onClick={handleComentar} disabled={!texto.trim()} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8 }}>Enviar</Button>

                  {/* Aprovador — solicitar ajuste / aprovar */}
                  {ehAprovador && (
                    <>
                      <Button icon={<EditOutlined />} onClick={abrirAjuste} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: '#FA8C16', color: '#D46B08' }}>Solicitar ajuste</Button>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setConfirmAprovarOpen(true)} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: '#389e0d', borderColor: '#389e0d' }}>{tipoRevisao === 'etapas' ? 'Aprovar etapa' : 'Aprovar'}</Button>
                    </>
                  )}

                  {/* Gestor — após enviar novo arquivo: reenviar / concluir */}
                  {!ehAprovador && arquivoEnviado && (
                    <>
                      <Button icon={<PaperClipOutlined />} onClick={handleReenviar} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: colorTokens.primary, color: colorTokens.primary }}>Reenviar para aprovação</Button>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConcluir} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: '#389e0d', borderColor: '#389e0d' }}>Concluir e ativar</Button>
                    </>
                  )}
                </Space>
                {!ehAprovador && temAjustePendente && !arquivoEnviado && (
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: '#D46B08', display: 'block', marginTop: 8 }}>
                    <EditOutlined style={{ marginRight: 6 }} />Há um ajuste solicitado — envie o arquivo corrigido (botão ao lado de "Baixar") para seguir.
                  </Typography.Text>
                )}
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Modal — Solicitar ajuste (justificativa categorizada) */}
      <Modal
        open={ajusteOpen}
        onCancel={() => setAjusteOpen(false)}
        onOk={handleConfirmAjuste}
        width={480}
        centered
        destroyOnHidden
        okText="Enviar solicitação"
        cancelText="Cancelar"
        okButtonProps={{
          disabled: !ajusteCategoria || !ajusteTexto.trim(),
          style: {
            fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38,
            ...((ajusteCategoria && ajusteTexto.trim()) ? { background: colorTokens.primary, borderColor: colorTokens.primary, color: '#fff' } : {}),
          },
        }}
        cancelButtonProps={{ style: { fontFamily: FONT, borderRadius: 8, height: 38 } }}
        title={
          <Space>
            <EditOutlined style={{ color: '#D46B08', fontSize: 18 }} />
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>Solicitar ajuste</Typography.Text>
          </Space>
        }
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16, lineHeight: '20px' }}>
          Descreva o que precisa ser ajustado. O gestor recebe a solicitação com a categoria e o comentário.
        </Typography.Text>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
          Categoria <span style={{ color: colorTokens.error }}>*</span>
        </Typography.Text>
        <Select
          value={ajusteCategoria}
          onChange={(v) => setAjusteCategoria(v)}
          options={CATEGORIA_OPTIONS}
          placeholder="Selecione a categoria do ajuste"
          style={{ width: '100%', fontFamily: FONT, marginBottom: 14 }}
        />
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
          Comentário <span style={{ color: colorTokens.error }}>*</span>
        </Typography.Text>
        <Input.TextArea
          value={ajusteTexto}
          onChange={(e) => setAjusteTexto(e.target.value)}
          placeholder="Descreva o ajuste necessário…"
          rows={4}
          maxLength={600}
          showCount
          style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }}
        />
      </Modal>

      {/* Modal — Editar detalhes do documento (só gestor) */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSalvarDetalhes}
        width={520}
        centered
        destroyOnHidden
        okText="Salvar alterações"
        cancelText="Cancelar"
        okButtonProps={{ style: { fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38, background: colorTokens.primary, borderColor: colorTokens.primary } }}
        cancelButtonProps={{ style: { fontFamily: FONT, borderRadius: 8, height: 38 } }}
        title={
          <Space>
            <EditOutlined style={{ color: colorTokens.primary, fontSize: 18 }} />
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>Editar detalhes do documento</Typography.Text>
          </Space>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
              Título <span style={{ color: colorTokens.error }}>*</span>
            </Typography.Text>
            <Input value={editDraft.titulo} onChange={(e) => setEditDraft((d) => ({ ...d, titulo: e.target.value }))} maxLength={120} style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8 }} />
          </div>
          <div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>Gestão responsável</Typography.Text>
            <Select value={editDraft.gestaoResponsavel || undefined} onChange={(v) => setEditDraft((d) => ({ ...d, gestaoResponsavel: v }))} options={GESTOES_RESPONSAVEIS} placeholder="Selecione a gestão" style={{ width: '100%', fontFamily: FONT }} />
          </div>
          <div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>Classificações</Typography.Text>
            <Select mode="multiple" value={editDraft.classificacoes} onChange={(v) => setEditDraft((d) => ({ ...d, classificacoes: v }))} options={CLASSIFICATIONS} placeholder="Selecione as classificações" style={{ width: '100%', fontFamily: FONT }} />
          </div>
          <div>
            <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>Descrição</Typography.Text>
            <Input.TextArea value={editDraft.descricao} onChange={(e) => setEditDraft((d) => ({ ...d, descricao: e.target.value }))} rows={4} maxLength={600} showCount style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }} />
          </div>
        </div>
      </Modal>

      {/* Confirmação de aprovação — evita aprovar por engano */}
      <Modal
        open={confirmAprovarOpen}
        onCancel={() => setConfirmAprovarOpen(false)}
        onOk={() => { setConfirmAprovarOpen(false); handleAprovar() }}
        width={460}
        centered
        destroyOnHidden
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#389e0d', fontSize: 18 }} />
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
              {tipoRevisao === 'etapas' ? 'Aprovar esta etapa?' : 'Aprovar documento?'}
            </Typography.Text>
          </Space>
        }
        okText={tipoRevisao === 'etapas' ? 'Confirmar aprovação da etapa' : 'Confirmar aprovação'}
        cancelText="Cancelar"
        okButtonProps={{ style: { fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38, background: '#389e0d', borderColor: '#389e0d' } }}
        cancelButtonProps={{ style: { fontFamily: FONT, borderRadius: 8, height: 38 } }}
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '21px' }}>
          {tipoRevisao === 'etapas'
            ? (etapaAtual >= aprovadores.length - 1
                ? <>Esta é a <strong style={{ color: colorTokens.textPrimary }}>última etapa</strong>. Ao aprovar, todas as etapas ficam concluídas e o documento poderá ser ativado. Confirme que revisou o documento.</>
                : <>Ao aprovar a etapa de <strong style={{ color: colorTokens.textPrimary }}>{aprovadores[etapaAtual]}</strong>, o fluxo segue para <strong style={{ color: colorTokens.textPrimary }}>{aprovadores[etapaAtual + 1]}</strong>. A ação fica registrada no histórico.</>)
            : <>Ao aprovar, sua decisão sobre <strong style={{ color: colorTokens.textPrimary }}>{detalhes.titulo}</strong> fica registrada no histórico da aprovação. Confirme que revisou o documento antes de continuar.</>}
        </Typography.Text>
      </Modal>

      {/* Modal — Agendar publicação (gestor, após aprovação) */}
      <ConfigProvider locale={ptBR}>
        <Modal
          open={agendarOpen}
          onCancel={() => setAgendarOpen(false)}
          onOk={handleConfirmAgendar}
          width={440}
          centered
          destroyOnHidden
          okText="Agendar publicação"
          cancelText="Cancelar"
          okButtonProps={{ disabled: !dataPublicacao, style: { fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38, ...(dataPublicacao ? { background: colorTokens.primary, borderColor: colorTokens.primary, color: '#fff' } : {}) } }}
          cancelButtonProps={{ style: { fontFamily: FONT, borderRadius: 8, height: 38 } }}
          title={
            <Space>
              <CalendarOutlined style={{ color: colorTokens.primary, fontSize: 18 }} />
              <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>Agendar publicação</Typography.Text>
            </Space>
          }
        >
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 14, lineHeight: '20px' }}>
            O documento aprovado será publicado automaticamente na data e hora escolhidas.
          </Typography.Text>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
            Data e hora <span style={{ color: colorTokens.error }}>*</span>
          </Typography.Text>
          <DatePicker
            value={dataPublicacao}
            onChange={(d) => setDataPublicacao(d)}
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder="Selecione data e hora"
            disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
            style={{ width: '100%', fontFamily: FONT }}
          />
        </Modal>
      </ConfigProvider>
    </div>
  )
}
