/* ─────────────────────────────────────────────────────────────
   src/features/aprovacao/pages/ApprovalPage.tsx
   Tela de revisão/aprovação — documento (PDF) + chat entre Gestor e
   Aprovador, lado a lado (empilha em telas menores).
   Aprovador: comenta / solicita ajuste / aprova.
   Gestor: comenta / envia novo arquivo → reenvia ou conclui e ativa.
───────────────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Input, Avatar, Space, message, Row, Col, Steps } from 'antd'
import {
  ArrowLeftOutlined, InfoCircleOutlined, EditOutlined, CheckCircleOutlined,
  FilePdfOutlined, UploadOutlined, PaperClipOutlined, DownloadOutlined, SendOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import type { ComentarioRevisao } from '@/features/listagem/types/documento'
import { CLASSIFICATIONS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'
import { useRole } from '@/auth/RoleContext'

dayjs.locale('pt-br')

const FONT = "'Montserrat', sans-serif"
const CLASSIF_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.value, c.label]))

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

const APPROVAL_CSS = `
  .aprov-panel {
    height: calc(100vh - 232px);
    min-height: 520px;
  }
  .aprov-chat-scroll { scrollbar-width: thin; }
  .aprov-chat-scroll::-webkit-scrollbar { width: 6px; }
  .aprov-chat-scroll::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 3px; }
  @media (max-width: 991px) {
    .aprov-panel { height: 560px; min-height: 0; }
  }
`

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
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMensagens(doc?.comentariosRevisao ?? [])
    setTexto('')
    setArquivoEnviado(false)
    setEtapaAtual(doc?.etapaAtual ?? 0)
  }, [doc?.id, doc?.etapaAtual])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length])

  /* CSS de layout responsivo */
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

  function addMensagem(txt: string, tipo: ComentarioRevisao['tipo']) {
    const nova: ComentarioRevisao = {
      id: `c-${Date.now()}`, autor: 'Você', papel: papelAtual, texto: txt, data: new Date().toISOString(), tipo,
    }
    setMensagens((prev) => [...prev, nova])
  }

  function handleComentar() {
    if (!texto.trim()) return
    addMensagem(texto.trim(), 'comentario')
    setTexto('')
  }
  function handleSolicitarAjuste() {
    if (!texto.trim()) { message.warning('Descreva o ajuste necessário antes de enviar.'); return }
    addMensagem(texto.trim(), 'ajuste')
    setTexto('')
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
            {doc.titulo}
          </Typography.Title>
          <Space size={8} wrap>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#1677FF', background: '#E6F4FF', border: '1px solid #91CAFF', borderRadius: 6, padding: '2px 10px' }}>Em aprovação</span>
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
                : `${aprovadores.length} aprovadores revisam em paralelo.`}
            </Typography.Text>
          </div>
          {tipoRevisao === 'etapas' ? (
            <Steps
              size="small"
              current={etapaAtual}
              items={aprovadores.map((nome, i) => ({
                title: nome,
                status: (i < etapaAtual ? 'finish' : i === etapaAtual ? 'process' : 'wait') as 'finish' | 'process' | 'wait',
              }))}
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

      {/* ── Split: PDF (esquerda) + Chat (direita) ── */}
      <Row gutter={[16, 16]}>
        {/* Documento / PDF */}
        <Col xs={24} lg={14}>
          <div className="aprov-panel" style={{ background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, boxShadow: '0 2px 3px rgba(156,156,156,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* topo do painel */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #F0F0F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <FilePdfOutlined style={{ color: '#FF4D4F', fontSize: 20, flexShrink: 0 }} />
                <Typography.Text strong ellipsis style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
                  {doc.fileName ?? 'documento.pdf'}
                </Typography.Text>
                {arquivoEnviado && (
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#389e0d', background: '#F6FFED', border: '1px solid #B7EB8F', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>versão ajustada</span>
                )}
              </div>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => message.success('Download do documento iniciado.')} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6, flexShrink: 0 }}>Baixar</Button>
            </div>
            {/* corpo — PDF simulado */}
            <div className="aprov-chat-scroll" style={{ flex: 1, overflowY: 'auto', background: '#F5F5F5', padding: 20 }}>
              <div style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', borderRadius: 4, padding: '44px 52px', maxWidth: 620, margin: '0 auto', minHeight: 720 }}>
                <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  {(doc.classificacoes ?? []).map((c) => CLASSIF_MAP[c] ?? c).join(' · ')}
                </Typography.Text>
                <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.textPrimary, marginTop: 0, marginBottom: 20 }}>{doc.titulo}</Typography.Title>
                <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '22px' }}>{doc.descricao || 'Conteúdo do documento.'}</Typography.Paragraph>
                <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '22px' }}>
                  Pré-visualização simulada do arquivo no protótipo. Em produção, o PDF original (imutável, com hash registrado) é renderizado aqui para conferência durante a aprovação.
                </Typography.Paragraph>
                <Typography.Paragraph style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '22px' }}>
                  §15 — Cláusula referente ao código 32182849. As partes reconhecem e concordam com os termos aqui descritos, observadas as normas internas da companhia.
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
            {/* topo do chat */}
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
                // O tipo tem prioridade sobre "próprio": ajuste sempre em laranja claro e
                // aprovação em verde claro (texto escuro), para dar contraste ao título colorido.
                // Só o comentário padrão do usuário logado permanece azul.
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
                          <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#D46B08', display: 'block', marginBottom: 4 }}>Solicitação de ajuste</Typography.Text>
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

            {/* input + ações */}
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

                {/* Aprovador */}
                {ehAprovador && (
                  <>
                    <Button icon={<EditOutlined />} onClick={handleSolicitarAjuste} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: '#FA8C16', color: '#D46B08' }}>Solicitar ajuste</Button>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAprovar} disabled={etapasConcluidas} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, ...(etapasConcluidas ? {} : { background: '#389e0d', borderColor: '#389e0d' }) }}>{tipoRevisao === 'etapas' ? 'Aprovar etapa' : 'Aprovar'}</Button>
                  </>
                )}

                {/* Gestor */}
                {!ehAprovador && !arquivoEnviado && (
                  <Button
                    icon={<UploadOutlined />}
                    onClick={handleEnviarNovoArquivo}
                    type={temAjustePendente ? 'primary' : 'default'}
                    style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, ...(temAjustePendente ? { background: colorTokens.primary, borderColor: colorTokens.primary } : { borderColor: colorTokens.primary, color: colorTokens.primary }) }}
                  >
                    Enviar novo arquivo
                  </Button>
                )}
                {!ehAprovador && arquivoEnviado && (
                  <>
                    <Button icon={<PaperClipOutlined />} onClick={handleReenviar} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, borderColor: colorTokens.primary, color: colorTokens.primary }}>Reenviar para aprovação</Button>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConcluir} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, background: '#389e0d', borderColor: '#389e0d' }}>Concluir e ativar</Button>
                  </>
                )}
              </Space>
              {!ehAprovador && temAjustePendente && !arquivoEnviado && (
                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: '#D46B08', display: 'block', marginTop: 8 }}>
                  <EditOutlined style={{ marginRight: 6 }} />Há um ajuste solicitado — envie o arquivo corrigido para seguir.
                </Typography.Text>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}
