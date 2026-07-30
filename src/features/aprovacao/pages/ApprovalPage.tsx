/* ─────────────────────────────────────────────────────────────
   src/features/aprovacao/pages/ApprovalPage.tsx
   Tela de revisão/aprovação — documento (PDF) + chat entre Gestor e
   Aprovador, lado a lado (empilha em telas menores).
   Aprovador: comenta / solicita ajuste / aprova.
   Gestor: comenta / envia novo arquivo → reenvia ou conclui e ativa.
───────────────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Input, Avatar, Space, message, Row, Col, Steps, Modal, Select } from 'antd'
import {
  ArrowLeftOutlined, InfoCircleOutlined, EditOutlined, CheckCircleOutlined,
  FilePdfOutlined, UploadOutlined, PaperClipOutlined, DownloadOutlined, SendOutlined,
  CloseCircleOutlined,
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

/* Categorias da justificativa (spec 3.1: UX/UI, Negócio, Técnico, Erro de Dados) */
const CATEGORIA_OPTIONS = [
  { value: 'ux-ui',   label: 'UX/UI' },
  { value: 'negocio', label: 'Negócio' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'dados',   label: 'Erro de Dados' },
]
const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(CATEGORIA_OPTIONS.map((o) => [o.value, o.label]))

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
  const [confirmAprovarOpen, setConfirmAprovarOpen] = useState(false)
  const [justTipo, setJustTipo] = useState<'ajuste' | 'rejeicao' | null>(null)
  const [justCategoria, setJustCategoria] = useState<string | undefined>(undefined)
  const [justTexto, setJustTexto] = useState('')
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
  /* Abre a modal de justificativa categorizada (ajuste ou rejeição) */
  function abrirJustificativa(tipo: 'ajuste' | 'rejeicao') {
    setJustTipo(tipo)
    setJustCategoria(undefined)
    setJustTexto('')
  }
  function handleConfirmJustificativa() {
    if (!justTipo || !justCategoria || !justTexto.trim()) return
    const isRej = justTipo === 'rejeicao'
    addMensagem(justTexto.trim(), justTipo, justCategoria as ComentarioRevisao['categoria'])
    setJustTipo(null); setJustCategoria(undefined); setJustTexto('')
    if (isRej) {
      message.success('Documento rejeitado. Volta para Rascunho com a justificativa registrada.')
      setTimeout(() => navigate('/documentos'), 900)
    } else {
      message.success('Ajuste solicitado ao gestor.')
    }
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
                const isRejeicao = m.tipo === 'rejeicao'
                // O tipo tem prioridade sobre "próprio": ajuste=laranja claro, aprovação=verde claro,
                // rejeição=vermelho claro (texto escuro, título colorido legível). Só o comentário
                // padrão do usuário logado permanece azul.
                const bubbleBg = isAjuste ? '#FFF3E0' : isAprov ? '#F6FFED' : isRejeicao ? '#FFF1F0' : own ? '#1677FF' : '#F1F2F4'
                const bubbleColor = (!isAjuste && !isAprov && !isRejeicao && own) ? '#fff' : colorTokens.textPrimary
                const bubbleBorder = isAjuste ? '1px solid #FFD591' : isAprov ? '1px solid #B7EB8F' : isRejeicao ? '1px solid #FFA39E' : 'none'
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
                        {(isAjuste || isRejeicao) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <Typography.Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: isRejeicao ? '#CF1322' : '#D46B08' }}>
                              {isRejeicao ? 'Documento rejeitado' : 'Solicitação de ajuste'}
                            </Typography.Text>
                            {m.categoria && (
                              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: isRejeicao ? '#CF1322' : '#D46B08', background: '#fff', border: `1px solid ${isRejeicao ? '#FFA39E' : '#FFD591'}`, borderRadius: 4, padding: '0 6px' }}>{CATEGORIA_LABEL[m.categoria]}</span>
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
                    <Button icon={<EditOutlined />} onClick={() => abrirJustificativa('ajuste')} disabled={etapasConcluidas} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, ...(etapasConcluidas ? {} : { borderColor: '#FA8C16', color: '#D46B08' }) }}>Solicitar ajuste</Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => abrirJustificativa('rejeicao')} disabled={etapasConcluidas} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8 }}>Rejeitar</Button>
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setConfirmAprovarOpen(true)} disabled={etapasConcluidas} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, ...(etapasConcluidas ? {} : { background: '#389e0d', borderColor: '#389e0d' }) }}>{tipoRevisao === 'etapas' ? 'Aprovar etapa' : 'Aprovar'}</Button>
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

      {/* Justificativa categorizada — Solicitar ajuste / Rejeitar (spec 3.1) */}
      <Modal
        open={justTipo !== null}
        onCancel={() => setJustTipo(null)}
        onOk={handleConfirmJustificativa}
        width={480}
        centered
        destroyOnHidden
        okText={justTipo === 'rejeicao' ? 'Rejeitar documento' : 'Enviar solicitação'}
        cancelText="Cancelar"
        okButtonProps={{ disabled: !justCategoria || !justTexto.trim(), danger: justTipo === 'rejeicao', style: { fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38, ...(justTipo === 'ajuste' ? { background: '#FA8C16', borderColor: '#FA8C16' } : {}) } }}
        cancelButtonProps={{ style: { fontFamily: FONT, borderRadius: 8, height: 38 } }}
        title={
          <Space>
            {justTipo === 'rejeicao'
              ? <CloseCircleOutlined style={{ color: '#CF1322', fontSize: 18 }} />
              : <EditOutlined style={{ color: '#D46B08', fontSize: 18 }} />}
            <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
              {justTipo === 'rejeicao' ? 'Rejeitar documento' : 'Solicitar ajuste'}
            </Typography.Text>
          </Space>
        }
      >
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16, lineHeight: '20px' }}>
          {justTipo === 'rejeicao'
            ? 'A rejeição devolve o documento ao autor como Rascunho. A justificativa fica registrada no histórico.'
            : 'Descreva o que precisa ser ajustado. O gestor recebe a solicitação com a categoria e o comentário.'}
        </Typography.Text>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
          Categoria <span style={{ color: colorTokens.error }}>*</span>
        </Typography.Text>
        <Select
          value={justCategoria}
          onChange={setJustCategoria}
          options={CATEGORIA_OPTIONS}
          placeholder="Selecione a categoria da justificativa"
          style={{ width: '100%', fontFamily: FONT, marginBottom: 14 }}
        />
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', marginBottom: 6 }}>
          Comentário <span style={{ color: colorTokens.error }}>*</span>
        </Typography.Text>
        <Input.TextArea
          value={justTexto}
          onChange={(e) => setJustTexto(e.target.value)}
          placeholder={justTipo === 'rejeicao' ? 'Explique o motivo da rejeição…' : 'Descreva o ajuste necessário…'}
          rows={4}
          maxLength={600}
          showCount
          style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }}
        />
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
            : <>Ao aprovar, sua decisão sobre <strong style={{ color: colorTokens.textPrimary }}>{doc.titulo}</strong> fica registrada no histórico da aprovação. Confirme que revisou o documento antes de continuar.</>}
        </Typography.Text>
      </Modal>
    </div>
  )
}
