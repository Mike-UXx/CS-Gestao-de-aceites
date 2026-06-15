/* ─────────────────────────────────────────────────────────────
   src/features/dashboard/pages/DashboardPage.tsx
   Dashboard do Gestor (B1) — visão agregada cross-documento:
   KPIs, adesão geral, pendências por área e vigências que requerem atenção.
───────────────────────────────────────────────────────────── */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Row, Col, Card, Statistic, Progress, List, Tag, Button, Empty, Space,
} from 'antd'
import {
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, BellOutlined,
  PlusOutlined, ArrowRightOutlined, WarningOutlined, RiseOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { colorTokens } from '@/theme/tokens'
import { getDashboardMetrics } from '../utils/metrics'

dayjs.locale('pt-br')

const FONT = "'Montserrat', sans-serif"
const GESTOR_NOME = 'Michael'

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  border: 'none',
}

function saudacao(hora: number): string {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Cor da barra de adesão conforme o percentual. */
function adesaoColor(pct: number): string {
  if (pct >= 80) return colorTokens.success
  if (pct >= 50) return colorTokens.warning
  return colorTokens.error
}

export function DashboardPage() {
  const navigate = useNavigate()
  const hoje = useMemo(() => dayjs(), [])
  const m = useMemo(() => getDashboardMetrics(MOCK_DOCUMENTOS, hoje), [hoje])

  const kpis = [
    {
      key: 'ativos',
      titulo: 'Documentos ativos',
      valor: m.ativos,
      icon: <FileTextOutlined />,
      cor: colorTokens.primary,
      onClick: () => navigate('/documentos'),
    },
    {
      key: 'agendados',
      titulo: 'Agendados',
      valor: m.agendados,
      icon: <ClockCircleOutlined />,
      cor: '#FA8C16',
      onClick: () => navigate('/documentos'),
    },
    {
      key: 'concluidos',
      titulo: 'Concluídos',
      valor: m.concluidos,
      icon: <CheckCircleOutlined />,
      cor: colorTokens.success,
      onClick: () => navigate('/documentos'),
    },
    {
      key: 'pendencias',
      titulo: 'Pendências de aceite',
      valor: m.pendenciasTotais,
      icon: <BellOutlined />,
      cor: colorTokens.error,
      onClick: () => navigate('/documentos'),
    },
  ]

  const maxAreaPend = Math.max(1, ...m.pendenciasPorArea.map((a) => a.pendencias))

  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{
            fontFamily: FONT, color: colorTokens.primary,
            margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px',
          }}>
            {saudacao(hoje.hour())}, {GESTOR_NOME}!
          </Typography.Title>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            {hoje.format('dddd, D [de] MMMM [de] YYYY')} · Visão geral dos seus documentos e aceites.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documentos/criar')} style={{
          height: 40, fontWeight: 600, fontSize: 13, fontFamily: FONT,
          background: colorTokens.primary, borderColor: colorTokens.primary, borderRadius: 8, marginTop: 4,
        }}>
          Documento
        </Button>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {kpis.map((k) => (
          <Col xs={24} sm={12} lg={6} key={k.key}>
            <Card
              styles={{ body: { padding: 20 } }}
              style={{ ...CARD_STYLE, cursor: 'pointer' }}
              onClick={k.onClick}
              hoverable
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${k.cor}15`, color: k.cor, fontSize: 20,
                }}>
                  {k.icon}
                </div>
                <Statistic
                  title={<span style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>{k.titulo}</span>}
                  value={k.valor}
                  valueStyle={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: colorTokens.textPrimary }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Adesão geral + Pendências por área ─────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Adesão geral */}
        <Col xs={24} lg={9}>
          <Card
            style={{ ...CARD_STYLE, height: '100%' }}
            styles={{ body: { padding: 24 } }}
            title={
              <Space size={8}>
                <RiseOutlined style={{ color: colorTokens.primary }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>
                  Adesão geral
                </span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Progress
                type="dashboard"
                percent={m.adesaoMedia}
                strokeColor={adesaoColor(m.adesaoMedia)}
                size={180}
                format={(pct) => (
                  <div style={{ fontFamily: FONT }}>
                    <div style={{ fontSize: 32, fontWeight: 700, color: colorTokens.textPrimary }}>{pct}%</div>
                    <div style={{ fontSize: 12, color: colorTokens.textSecondary }}>média de aceites</div>
                  </div>
                )}
              />
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: colorTokens.success }}>
                    {m.aceitesTotais}
                  </div>
                  <div style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>Aceites</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: colorTokens.error }}>
                    {m.pendenciasTotais}
                  </div>
                  <div style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>Pendentes</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: colorTokens.textPrimary }}>
                    {m.destinatariosTotais}
                  </div>
                  <div style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>Destinatários</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Pendências por área */}
        <Col xs={24} lg={15}>
          <Card
            style={{ ...CARD_STYLE, height: '100%' }}
            styles={{ body: { padding: 24 } }}
            title={
              <Space size={8}>
                <BellOutlined style={{ color: colorTokens.primary }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>
                  Pendências por área
                </span>
              </Space>
            }
          >
            {m.pendenciasPorArea.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem documentos ativos." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {m.pendenciasPorArea.map((a) => (
                  <div key={a.area}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textPrimary }}>
                        {a.area}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: a.pendencias > 0 ? colorTokens.error : colorTokens.success }}>
                        {a.pendencias} {a.pendencias === 1 ? 'pendência' : 'pendências'}
                      </span>
                    </div>
                    <Progress
                      percent={Math.round((a.pendencias / maxAreaPend) * 100)}
                      showInfo={false}
                      strokeColor={a.pendencias > 0 ? colorTokens.error : colorTokens.success}
                      trailColor="#F0F0F0"
                      strokeWidth={8}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Requer atenção (vigência) ──────────────────────────── */}
      <Card
        style={CARD_STYLE}
        styles={{ body: { padding: 24 } }}
        title={
          <Space size={8}>
            <WarningOutlined style={{ color: colorTokens.warning }} />
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>
              Requer atenção — vigência
            </span>
            {m.atencao.length > 0 && (
              <span style={{
                padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: '#FFF2E8', color: '#D4380D', border: '1px solid #ffbb96',
              }}>
                {m.atencao.length}
              </span>
            )}
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/documentos')} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, padding: 0 }}>
            Ver todos <ArrowRightOutlined />
          </Button>
        }
      >
        {m.atencao.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
                Nenhum documento ativo vencido ou vencendo nos próximos 30 dias.
              </span>
            }
          />
        ) : (
          <List
            dataSource={m.atencao}
            renderItem={(d) => {
              const vencido = d.diasRestantes < 0
              const tagCor = vencido ? { bg: '#FFF2F0', color: '#CF1322', border: '#ffa39e' }
                : d.diasRestantes <= 7 ? { bg: '#FFF2E8', color: '#D4380D', border: '#ffbb96' }
                : { bg: '#FFF7E6', color: '#D46B08', border: '#ffd591' }
              const tagTexto = vencido
                ? `Vencido há ${Math.abs(d.diasRestantes)}d`
                : d.diasRestantes === 0 ? 'Vence hoje' : `Vence em ${d.diasRestantes}d`
              return (
                <List.Item
                  style={{ padding: '12px 0', cursor: 'pointer' }}
                  onClick={() => navigate(`/documentos/${d.id}`)}
                  actions={[
                    <ArrowRightOutlined key="go" style={{ color: colorTokens.textMuted }} />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary }}>
                        {d.titulo}
                      </span>
                    }
                    description={
                      <Space size={8} wrap>
                        <Tag style={{
                          fontFamily: FONT, fontSize: 11, fontWeight: 600, borderRadius: 6, margin: 0,
                          background: tagCor.bg, color: tagCor.color, border: `1px solid ${tagCor.border}`,
                        }}>
                          {tagTexto}
                        </Tag>
                        <span style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>
                          {d.area} · vigência até {dayjs(d.dataExpiracao).format('DD/MM/YYYY')}
                          {d.pendencias > 0 && ` · ${d.pendencias} pendente(s)`}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Card>

    </div>
  )
}
