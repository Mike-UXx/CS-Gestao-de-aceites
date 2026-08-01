/* ─────────────────────────────────────────────────────────────
   src/features/versao/pages/NovaVersaoPage.tsx
   Fluxo enxuto de publicação de NOVA VERSÃO de um documento Ativo/Expirado.
   Arquivo obrigatório · versão auto-incrementada · resumo de mudanças (IA,
   editável) · decisão de aceite (sem padrão) · versão anterior sai de circulação.
───────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Typography, Button, Upload, Input, Radio, Space, message, DatePicker, ConfigProvider, Checkbox } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import ptBR from 'antd/locale/pt_BR'
import {
  ArrowLeftOutlined, InboxOutlined, FilePdfOutlined, InfoCircleOutlined,
  ReloadOutlined, CheckCircleOutlined, HistoryOutlined,
} from '@ant-design/icons'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { VERSION_HISTORY } from '@/data/mockVersoes'
import { colorTokens } from '@/theme/tokens'

const FONT = "'Montserrat', sans-serif"

/* Versão atual + próxima (auto-incremento) */
function versoes(id?: string): { atual: string; nova: string } {
  const hist = id ? (VERSION_HISTORY[id] ?? []) : []
  const atual = hist.length ? hist[hist.length - 1].versao : 'V1'
  const num = parseInt(atual.replace(/\D/g, ''), 10) || 1
  return { atual, nova: `V${num + 1}` }
}

/* Resumo de mudanças "gerado por IA" (mock, editável) */
function resumoIA(titulo: string): string {
  return `A nova versão de "${titulo}" atualiza o conteúdo do documento. Principais mudanças:
• Revisão de cláusulas e termos para adequação normativa;
• Correções pontuais e atualização de referências;
• Ajustes de conformidade identificados na revisão.

(Resumo gerado automaticamente — edite para refletir com precisão o que mudou. Ele é exibido ao colaborador no aceite e no histórico de versões.)`
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10,
  boxShadow: '0 2px 3px rgba(156,156,156,0.2)', padding: '20px 24px', marginBottom: 16,
}
const labelStyle: React.CSSProperties = { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: colorTokens.textPrimary, display: 'block', marginBottom: 4 }
const hintStyle: React.CSSProperties = { fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 14 }

export function NovaVersaoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const doc = MOCK_DOCUMENTOS.find((d) => d.id === id)

  const [arquivo, setArquivo] = useState<string | null>(null)
  const [resumo, setResumo] = useState(() => resumoIA(doc?.titulo ?? 'documento'))
  const [aceite, setAceite] = useState<'reiniciar' | 'notificar' | undefined>(undefined)
  const [alterarValidade, setAlterarValidade] = useState(false)
  const [novaValidade, setNovaValidade] = useState<Dayjs | null>(null)

  if (!doc) {
    return (
      <div style={{ padding: '60px 32px', fontFamily: FONT, textAlign: 'center' }}>
        <InfoCircleOutlined style={{ fontSize: 40, color: colorTokens.textSecondary, marginBottom: 16 }} />
        <Typography.Title level={4} style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>Documento não encontrado</Typography.Title>
        <Button type="primary" onClick={() => navigate('/documentos')} style={{ fontFamily: FONT }}>Ir para listagem</Button>
      </div>
    )
  }

  const { atual, nova } = versoes(id)
  const podePublicar = !!arquivo && !!aceite && !!resumo.trim() && (!alterarValidade || !!novaValidade)

  function handlePublicar() {
    if (!podePublicar) return
    const dec = aceite === 'reiniciar'
      ? 'Aceite reiniciado para todos os destinatários.'
      : 'Quem já aceitou foi apenas notificado; pendentes aceitam a nova versão.'
    message.success(`${nova} publicada. A versão ${atual} saiu de circulação. ${dec}`, 5)
    setTimeout(() => navigate('/documentos'), 900)
  }

  return (
    <div style={{ padding: '24px 32px 40px', fontFamily: FONT, background: '#F5F6F8', minHeight: '100%' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 5, color: colorTokens.primary, fontSize: 13, fontWeight: 500, fontFamily: FONT }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> Voltar
      </button>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.primary, marginTop: 0, marginBottom: 6, fontSize: 22, fontWeight: 700 }}>
          Nova versão · {doc.titulo}
        </Typography.Title>
        <Space size={10} wrap>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, background: '#EEF2FF', border: `1px solid ${colorTokens.primary}33`, color: colorTokens.primary, borderRadius: 6, padding: '2px 10px' }}>
            <HistoryOutlined /> Versão {atual} → {nova}
          </span>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            Publique uma nova versão substituindo o arquivo. A versão anterior sai de circulação.
          </Typography.Text>
        </Space>
      </div>

      {/* Banner explicativo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFF7E6', border: '1px solid #FFD591', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
        <InfoCircleOutlined style={{ color: '#D46B08', fontSize: 15, marginTop: 2, flexShrink: 0 }} />
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: '#874d00', lineHeight: '19px' }}>
          Ao publicar a <strong>{nova}</strong>, a <strong>{atual}</strong> sai de circulação. Destinatários e regras de leitura são mantidos da versão atual (edite abaixo apenas o que mudou).
        </Typography.Text>
      </div>

      {/* 1 · Novo arquivo (obrigatório) */}
      <div style={cardStyle}>
        <Typography.Text style={labelStyle}>1 · Novo arquivo <span style={{ color: colorTokens.error }}>*</span></Typography.Text>
        <Typography.Text style={hintStyle}>Envie o PDF revisado. Ele substitui o arquivo da versão atual (imutável, com novo hash).</Typography.Text>
        <Upload.Dragger
          multiple={false}
          maxCount={1}
          accept=".pdf"
          beforeUpload={(file) => { setArquivo(file.name); return false }}
          onRemove={() => setArquivo(null)}
          style={{ fontFamily: FONT, background: '#FAFBFF', borderColor: arquivo ? '#B7EB8F' : '#C3CAF5', borderRadius: 8 }}
        >
          <p style={{ margin: 0 }}>
            {arquivo
              ? <FilePdfOutlined style={{ fontSize: 30, color: '#389e0d' }} />
              : <InboxOutlined style={{ fontSize: 30, color: colorTokens.primary }} />}
          </p>
          <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, margin: '8px 0 2px' }}>
            {arquivo ?? 'Arraste o novo arquivo ou clique para selecionar'}
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, margin: 0 }}>
            {arquivo ? 'Arquivo pronto — clique para trocar' : 'PDF · substituição obrigatória'}
          </p>
        </Upload.Dragger>
      </div>

      {/* 2 · Validade (opcional) */}
      <div style={cardStyle}>
        <Typography.Text style={labelStyle}>2 · Vigência</Typography.Text>
        <Typography.Text style={hintStyle}>Por padrão, a vigência da versão atual é mantida. Marque abaixo para definir uma nova.</Typography.Text>
        <Checkbox checked={alterarValidade} onChange={(e) => { setAlterarValidade(e.target.checked); if (!e.target.checked) setNovaValidade(null) }} style={{ fontFamily: FONT, fontSize: 13 }}>
          Definir nova data de validade
        </Checkbox>
        {alterarValidade && (
          <ConfigProvider locale={ptBR}>
            <div style={{ marginTop: 12 }}>
              <DatePicker
                value={novaValidade}
                onChange={(d) => setNovaValidade(d)}
                format="DD/MM/YYYY"
                placeholder="Nova data de validade"
                disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                style={{ fontFamily: FONT }}
              />
            </div>
          </ConfigProvider>
        )}
      </div>

      {/* 3 · Resumo das mudanças (IA, editável) */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
          <Typography.Text style={{ ...labelStyle, marginBottom: 0 }}>3 · Resumo das mudanças <span style={{ color: colorTokens.error }}>*</span></Typography.Text>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => { setResumo(resumoIA(doc.titulo)); message.info('Resumo regenerado pela IA.') }} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: colorTokens.primary, color: colorTokens.primary, borderRadius: 6 }}>
            Gerar novamente
          </Button>
        </div>
        <Typography.Text style={hintStyle}>Gerado por IA e editável. É exibido ao colaborador no aceite e no histórico de versões, citando as principais mudanças entre a {atual} e a {nova}.</Typography.Text>
        <Input.TextArea
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          autoSize={{ minRows: 5, maxRows: 10 }}
          maxLength={1000}
          showCount
          style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, resize: 'none' }}
        />
      </div>

      {/* 4 · Fluxo de aceite (sem padrão) */}
      <div style={cardStyle}>
        <Typography.Text style={labelStyle}>4 · Fluxo de aceite <span style={{ color: colorTokens.error }}>*</span></Typography.Text>
        <Typography.Text style={hintStyle}>Defina como a nova versão afeta quem já aceitou. Nenhuma opção vem pré-selecionada.</Typography.Text>
        <Radio.Group value={aceite} onChange={(e) => setAceite(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Radio value="reiniciar" style={{ fontFamily: FONT, alignItems: 'flex-start' }}>
            <div>
              <Typography.Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600, color: colorTokens.textPrimary, display: 'block' }}>Reiniciar aceite para todos</Typography.Text>
              <Typography.Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>Todos os destinatários precisam aceitar novamente a nova versão. Indicado para mudanças relevantes.</Typography.Text>
            </div>
          </Radio>
          <Radio value="notificar" style={{ fontFamily: FONT, alignItems: 'flex-start' }}>
            <div>
              <Typography.Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600, color: colorTokens.textPrimary, display: 'block' }}>Notificar quem já aceitou</Typography.Text>
              <Typography.Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>Quem já aceitou recebe apenas uma notificação da alteração; só os pendentes aceitam. Indicado para ajustes menores.</Typography.Text>
            </div>
          </Radio>
        </Radio.Group>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
        <Button onClick={() => navigate(-1)} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40 }}>Cancelar</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} disabled={!podePublicar} onClick={handlePublicar} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40, ...(podePublicar ? { background: colorTokens.primary, borderColor: colorTokens.primary } : {}) }}>
          Publicar {nova}
        </Button>
      </div>
    </div>
  )
}
