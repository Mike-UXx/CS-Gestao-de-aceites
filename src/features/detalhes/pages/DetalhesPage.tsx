/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/pages/DetalhesPage.tsx
   Detalhe de documento — layouts por status: Ativo / Concluído / Agendado
───────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography, Tag, Button, Progress, Row, Col, Divider,
  Space, Modal, List, Avatar, Dropdown, message,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeftOutlined, DownloadOutlined, UserOutlined,
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FilePdfOutlined, FileExcelOutlined, DownOutlined,
  SafetyCertificateOutlined, TeamOutlined, InfoCircleOutlined,
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
  ciencia: 'Ciência / Leitura',
}
const MODALIDADE_LABEL: Record<string, string> = {
  departamento: 'Por Departamento',
  pessoa:       'Por Pessoa',
}

/* ── Helpers ────────────────────────────────────────────────── */
function fmt(iso: string | null) {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '—'
}

/* ── Sub-componente: linha de metadado ──────────────────────── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
      <span style={{ color: colorTokens.textSecondary, fontSize: 15, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', lineHeight: '16px' }}>
          {label}
        </Typography.Text>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500 }}>
          {value}
        </Typography.Text>
      </div>
    </div>
  )
}

/* ── Componente principal ───────────────────────────────────── */
export function DetalhesPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pendenciasOpen, setPendenciasOpen] = useState(false)

  const doc = MOCK_DOCUMENTOS.find((d) => d.id === id)

  /* ── Documento não encontrado ── */
  if (!doc) {
    return (
      <div style={{ padding: '40px 32px', fontFamily: FONT, textAlign: 'center' }}>
        <InfoCircleOutlined style={{ fontSize: 40, color: colorTokens.textSecondary, marginBottom: 16 }} />
        <Typography.Title level={4} style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>
          Documento não encontrado
        </Typography.Title>
        <Button onClick={() => navigate('/documentos')} style={{ fontFamily: FONT }}>
          Voltar à listagem
        </Button>
      </div>
    )
  }

  /* ── Métricas ── */
  const pct      = doc.totalDestinatarios > 0
    ? Math.round((doc.totalAceites / doc.totalDestinatarios) * 100)
    : 0
  const pendentes = doc.totalDestinatarios - doc.totalAceites
  const barColor  = doc.tipo === 'adesao' ? colorTokens.primary : SEA_GREEN

  /* ── Pendências — mock de nomes ── */
  const pendentesNomes = COLABORADORES.slice(0, Math.max(pendentes, 0)).map((c) => c.label)

  /* ── Badge de status ── */
  const statusPalette: Record<string, { border: string; color: string; bg: string }> = {
    Ativo:     { border: '#52c41a', color: '#389e0d', bg: '#f6ffed' },
    Agendado:  { border: '#FA8C16', color: '#D46B08', bg: '#FFF7E6' },
    Concluído: { border: '#BFBFBF', color: '#8C8C8C', bg: '#FAFAFA' },
    Rascunho:  { border: '#D9D9D9', color: '#8C8C8C', bg: '#FAFAFA' },
  }
  const sp = statusPalette[doc.status] ?? statusPalette.Rascunho

  /* ── Download dropdown ── */
  const downloadItems: MenuProps['items'] = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />,
      label: 'Baixar como PDF',
      onClick: () => message.success('Download do relatório em PDF iniciado.'),
    },
    {
      key: 'excel',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      label: 'Baixar como Excel',
      onClick: () => message.success('Download do relatório em Excel iniciado.'),
    },
  ]

  return (
    <div style={{ padding: '28px 32px 48px', fontFamily: FONT }}>

      {/* ← Voltar */}
      <button
        onClick={() => navigate('/documentos')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: colorTokens.primary, fontSize: 13, fontWeight: 500,
          fontFamily: FONT, padding: 0, marginBottom: 14,
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> Voltar à listagem
      </button>

      {/* ── Main card ─────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 28,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ flex: 1, marginRight: 24 }}>
            <Typography.Title level={2} style={{
              fontFamily: FONT, color: colorTokens.primary,
              margin: 0, fontSize: 22, fontWeight: 700, lineHeight: '30px', marginBottom: 10,
            }}>
              {doc.titulo}
            </Typography.Title>

            {/* Status + classificações */}
            <Space size={6} wrap>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5,
                border: `1px solid ${sp.border}`, background: sp.bg,
                fontFamily: FONT, fontSize: 11, fontWeight: 600, color: sp.color,
              }}>
                {doc.status}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 5,
                border: `1px solid ${doc.tipo === 'adesao' ? colorTokens.primary + '44' : SEA_GREEN + '66'}`,
                background: doc.tipo === 'adesao' ? '#EEF2FF' : '#E6FFFD',
                fontFamily: FONT, fontSize: 11, fontWeight: 500,
                color: doc.tipo === 'adesao' ? colorTokens.primary : '#148D85',
              }}>
                {TIPO_LABEL[doc.tipo]}
              </span>
              {doc.classificacoes.map((c) => (
                <Tag key={c} style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 500, borderRadius: 4, margin: 0, padding: '1px 8px',
                  background: '#EEF2FF', border: `1px solid ${colorTokens.primary}22`, color: colorTokens.primary,
                }}>
                  {CLASSIF_MAP[c] ?? c}
                </Tag>
              ))}
            </Space>
          </div>

          {/* Ação principal no header */}
          {doc.status === 'Ativo' && (
            <Button
              type="primary" size="large" icon={<TeamOutlined />}
              onClick={() => setPendenciasOpen(true)}
              style={{
                fontFamily: FONT, fontWeight: 600, fontSize: 13,
                background: colorTokens.primary, borderColor: colorTokens.primary,
                borderRadius: 8, height: 42, flexShrink: 0,
              }}
            >
              Ver Pendências
            </Button>
          )}
          {doc.status === 'Concluído' && (
            <Dropdown menu={{ items: downloadItems }} trigger={['click']}>
              <Button
                size="large" icon={<DownloadOutlined />}
                style={{
                  fontFamily: FONT, fontWeight: 600, fontSize: 13,
                  borderColor: colorTokens.primary, color: colorTokens.primary,
                  borderRadius: 8, height: 42, flexShrink: 0,
                }}
              >
                Relatório de Auditoria <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          )}
        </div>

        <Divider style={{ margin: '20px 0' }} />

        {/* ── Corpo: Info + Métricas ──────────────────────────── */}
        <Row gutter={40}>

          {/* Coluna esquerda — metadados */}
          <Col xs={24} lg={14}>
            <Typography.Text style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              color: colorTokens.textSecondary, textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: 18,
            }}>
              Informações do Documento
            </Typography.Text>

            <Row gutter={0}>
              <Col span={12}>
                <InfoRow icon={<SafetyCertificateOutlined />} label="Tipo" value={TIPO_LABEL[doc.tipo]} />
                <InfoRow icon={<TeamOutlined />} label="Modalidade" value={MODALIDADE_LABEL[doc.modalidadeEnvio]} />
                <InfoRow icon={<UserOutlined />} label="Responsável" value={GESTAO_MAP[doc.gestaoResponsavel] ?? (doc.gestaoResponsavel || '—')} />
                <InfoRow
                  icon={<TeamOutlined />}
                  label="Público-alvo"
                  value={
                    <Space size={4} wrap>
                      {(doc.destinatariosPreview ?? []).map((t) => (
                        <Tag key={t} style={{ fontFamily: FONT, fontSize: 11, margin: 0, borderRadius: 4 }}>{t}</Tag>
                      ))}
                    </Space>
                  }
                />
              </Col>
              <Col span={12}>
                <InfoRow
                  icon={<CalendarOutlined />}
                  label="Vigência"
                  value={doc.dataLancamento
                    ? `${fmt(doc.dataLancamento)}${doc.dataExpiracao ? ` até ${fmt(doc.dataExpiracao)}` : ''}`
                    : '—'}
                />
                <InfoRow icon={<CalendarOutlined />} label="Criado em" value={fmt(doc.criadoEm)} />
                <InfoRow icon={<CalendarOutlined />} label="Publicado em" value={fmt(doc.dataLancamento)} />
                {doc.fileName && (
                  <InfoRow
                    icon={<FilePdfOutlined />}
                    label="Arquivo"
                    value={
                      <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.primary }}>
                        {doc.fileName}
                      </Typography.Text>
                    }
                  />
                )}
              </Col>
            </Row>

            {/* Hash */}
            {doc.fileHash && (
              <div style={{
                marginTop: 4, padding: '10px 14px', borderRadius: 8,
                background: '#F7F8FF', border: `1px solid ${colorTokens.primary}18`,
              }}>
                <Typography.Text style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>
                  Hash SHA-256
                </Typography.Text>
                <Typography.Text copyable style={{ fontFamily: 'monospace', fontSize: 11, color: colorTokens.textSecondary, wordBreak: 'break-all' }}>
                  {doc.fileHash}
                </Typography.Text>
              </div>
            )}
          </Col>

          {/* Coluna direita — métricas por status */}
          <Col xs={24} lg={10}>
            <div style={{ borderLeft: `1px solid #F0F0F0`, paddingLeft: 32, height: '100%' }}>

              {/* ── ATIVO ── */}
              {doc.status === 'Ativo' && (
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 20 }}>
                    Progresso de Adesão
                  </Typography.Text>

                  <Progress
                    type="circle" percent={pct}
                    strokeColor={barColor} trailColor="#F0F0F0"
                    strokeWidth={8} size={130}
                    format={(p) => (
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: barColor, lineHeight: '32px' }}>{p}%</div>
                        <div style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary, marginTop: 2 }}>aderido</div>
                      </div>
                    )}
                  />

                  <div style={{ marginTop: 20 }}>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary, display: 'block' }}>
                      {doc.totalAceites} de {doc.totalDestinatarios} assinaram
                    </Typography.Text>
                    {pendentes > 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 10px', borderRadius: 20, background: '#FFF7E6', border: '1px solid #FA8C16' }}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#D46B08' }} />
                        <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: '#D46B08', fontWeight: 600 }}>
                          {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
                        </Typography.Text>
                      </div>
                    )}
                  </div>

                  <Divider style={{ margin: '20px 0' }} />

                  <Button
                    type="primary" size="large" icon={<TeamOutlined />}
                    onClick={() => setPendenciasOpen(true)}
                    style={{
                      fontFamily: FONT, fontWeight: 600, fontSize: 13,
                      background: colorTokens.primary, borderColor: colorTokens.primary,
                      borderRadius: 8, height: 42, width: '100%',
                    }}
                  >
                    Ver Pendências ({pendentes})
                  </Button>
                </div>
              )}

              {/* ── CONCLUÍDO ── */}
              {doc.status === 'Concluído' && (
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 20 }}>
                    Resultado Final
                  </Typography.Text>

                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: '50%', background: '#f6ffed', border: '3px solid #52c41a', marginBottom: 16 }}>
                    <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a' }} />
                  </div>

                  <Typography.Title level={2} style={{ fontFamily: FONT, color: '#389e0d', margin: 0, fontWeight: 800, fontSize: 32 }}>
                    {pct}%
                  </Typography.Title>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, fontWeight: 600, display: 'block', marginTop: 4 }}>
                    {doc.totalAceites} de {doc.totalDestinatarios} assinaram
                  </Typography.Text>
                  {doc.dataExpiracao && (
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginTop: 6 }}>
                      Encerrado em {fmt(doc.dataExpiracao)}
                    </Typography.Text>
                  )}

                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: '#F7F8FF', border: `1px solid ${colorTokens.primary}18` }}>
                    <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                      O histórico de assinaturas está preservado e disponível para auditoria.
                    </Typography.Text>
                  </div>

                  <Divider style={{ margin: '20px 0' }} />

                  <Dropdown menu={{ items: downloadItems }} trigger={['click']}>
                    <Button
                      size="large" icon={<DownloadOutlined />}
                      style={{
                        fontFamily: FONT, fontWeight: 600, fontSize: 13,
                        borderColor: colorTokens.primary, color: colorTokens.primary,
                        borderRadius: 8, height: 42, width: '100%',
                      }}
                    >
                      Download Relatório de Auditoria <DownOutlined style={{ fontSize: 10 }} />
                    </Button>
                  </Dropdown>
                </div>
              )}

              {/* ── AGENDADO ── */}
              {doc.status === 'Agendado' && (
                <div style={{ textAlign: 'center' }}>
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 20 }}>
                    Envio Programado
                  </Typography.Text>

                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: '50%', background: '#FFF7E6', border: '3px solid #FA8C16', marginBottom: 16 }}>
                    <CalendarOutlined style={{ fontSize: 40, color: '#D46B08' }} />
                  </div>

                  <Typography.Text style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, fontWeight: 600, display: 'block' }}>
                    Lançamento em
                  </Typography.Text>
                  <Typography.Title level={3} style={{ fontFamily: FONT, color: '#D46B08', margin: '4px 0 12px', fontWeight: 700 }}>
                    {fmt(doc.dataLancamento)}
                  </Typography.Title>

                  <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>
                    {doc.totalDestinatarios} destinatários serão notificados automaticamente.
                  </Typography.Text>
                </div>
              )}

            </div>
          </Col>
        </Row>
      </div>

      {/* ── Modal: Pendências ─────────────────────────────────── */}
      <Modal
        open={pendenciasOpen}
        onCancel={() => setPendenciasOpen(false)}
        title={
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 15 }}>
            Pendências — {pendentes} {pendentes === 1 ? 'destinatário' : 'destinatários'}
          </Typography.Text>
        }
        footer={
          <Button onClick={() => setPendenciasOpen(false)} style={{ fontFamily: FONT }}>Fechar</Button>
        }
        width={480} centered
        styles={{ body: { maxHeight: 400, overflowY: 'auto', padding: '8px 0' } }}
      >
        {pendentes === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
            <Typography.Text style={{ fontFamily: FONT, display: 'block', color: colorTokens.textSecondary }}>
              Todos os destinatários já assinaram.
            </Typography.Text>
          </div>
        ) : (
          <List
            dataSource={pendentesNomes}
            renderItem={(nome) => (
              <List.Item style={{ padding: '10px 24px', borderBottom: '1px solid #F5F5F5' }}>
                <Space>
                  <Avatar size={32} icon={<UserOutlined />} style={{ background: '#EEF2FF', color: colorTokens.primary }} />
                  <Typography.Text style={{ fontFamily: FONT, fontSize: 13 }}>{nome}</Typography.Text>
                </Space>
                <span style={{
                  fontSize: 11, fontWeight: 600, fontFamily: FONT,
                  color: '#D46B08', background: '#FFF7E6', border: '1px solid #FA8C16',
                  borderRadius: 4, padding: '2px 8px',
                }}>
                  Pendente
                </span>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  )
}
