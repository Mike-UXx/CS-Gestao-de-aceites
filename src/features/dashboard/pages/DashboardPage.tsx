/* ─────────────────────────────────────────────────────────────
   src/features/dashboard/pages/DashboardPage.tsx
   Dashboard do Gestor (B1) — visão agregada cross-documento.
   Primeira tela do sistema: layout limpo, cards alinhados e agrupados.
───────────────────────────────────────────────────────────── */
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Row, Col, Card, Statistic, Progress, List, Tag, Button, Empty, Space,
} from 'antd'
import {
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, BellOutlined,
  ArrowRightOutlined, WarningOutlined, RiseOutlined, PieChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { colorTokens } from '@/theme/tokens'
import { getDashboardMetrics } from '../utils/metrics'

dayjs.locale('pt-br')

const FONT = "'Montserrat', sans-serif"
const GESTOR_NOME = 'Michael'

/* ── Estilo base dos cards (sombra suave em camadas, cantos 16) ── */
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid #EEF0F4',
  boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  height: '100%',
  width: '100%',
}
const CARD_BODY: React.CSSProperties = { padding: 22 }

/* ── CSS injetado: hover, entrada escalonada, barras slim ──────── */
const DASH_CSS = `
  .dash-card { transition: box-shadow .22s ease, transform .22s ease; }
  .dash-card.clickable { cursor: pointer; }
  .dash-card.clickable:hover { box-shadow: 0 10px 28px rgba(16,24,40,0.10); transform: translateY(-3px); }
  .dash-row { align-items: stretch !important; }
  .dash-enter { opacity: 0; transform: translateY(10px); animation: dashFade .5s cubic-bezier(.22,.61,.36,1) forwards; }
  @keyframes dashFade { to { opacity: 1; transform: none; } }
  .dash-card .ant-card-head { border-bottom: 1px solid #F2F4F7; min-height: 52px; padding: 0 22px; }
  .dash-card .ant-card-head-title { padding: 14px 0; }
  .dash-bar-track { width: 100%; height: 8px; border-radius: 999px; background: #F2F4F7; overflow: hidden; }
  .dash-bar-fill { height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.22,.61,.36,1); }
`

function saudacao(hora: number): string {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function adesaoColor(pct: number): string {
  if (pct >= 80) return colorTokens.success
  if (pct >= 50) return colorTokens.warning
  return colorTokens.error
}

/* ── Paleta da distribuição por status ── */
const STATUS_VIZ: { key: string; label: string; cor: string }[] = [
  { key: 'ativos',     label: 'Ativos',     cor: '#16A34A' },
  { key: 'agendados',  label: 'Agendados',  cor: '#F59E0B' },
  { key: 'concluidos', label: 'Concluídos', cor: '#3B82F6' },
  { key: 'expirados',  label: 'Expirados',  cor: '#EF4444' },
  { key: 'inativos',   label: 'Inativos',   cor: '#98A2B3' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const hoje = useMemo(() => dayjs(), [])
  const m = useMemo(() => getDashboardMetrics(MOCK_DOCUMENTOS, hoje), [hoje])

  /* injeta CSS do dashboard */
  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'dashboard-styles'
    el.textContent = DASH_CSS
    document.head.appendChild(el)
    return () => { document.getElementById('dashboard-styles')?.remove() }
  }, [])

  const kpis = [
    { key: 'ativos',     titulo: 'Documentos ativos',  valor: m.ativos,           contexto: `de ${m.totalPublicados} publicados`,                          icon: <FileTextOutlined />,   cor: colorTokens.primary },
    { key: 'agendados',  titulo: 'Agendados',          valor: m.agendados,        contexto: m.agendados ? 'aguardando publicação' : 'nenhum agendado',     icon: <ClockCircleOutlined />, cor: '#F59E0B' },
    { key: 'concluidos', titulo: 'Concluídos',         valor: m.concluidos,       contexto: 'aceite finalizado',                                          icon: <CheckCircleOutlined />, cor: '#16A34A' },
    { key: 'pendencias', titulo: 'Pendências de aceite', valor: m.pendenciasTotais, contexto: `em ${m.documentosComPendencia} ${m.documentosComPendencia === 1 ? 'documento' : 'documentos'}`, icon: <BellOutlined />, cor: colorTokens.error },
  ]

  /* ── Distribuição por status (donut conic-gradient) ── */
  const statusData = STATUS_VIZ
    .map((s) => ({ ...s, valor: m[s.key as keyof typeof m] as number }))
    .filter((s) => s.valor > 0)
  const totalStatus = statusData.reduce((acc, s) => acc + s.valor, 0) || 1
  let cursor = 0
  const gradientStops = statusData.map((s) => {
    const start = (cursor / totalStatus) * 360
    cursor += s.valor
    const end = (cursor / totalStatus) * 360
    return `${s.cor} ${start}deg ${end}deg`
  }).join(', ')
  const donutGradient = statusData.length
    ? `conic-gradient(${gradientStops})`
    : '#F2F4F7'

  const maxAreaPend = Math.max(1, ...m.pendenciasPorArea.map((a) => a.pendencias))

  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="dash-enter" style={{ marginBottom: 24 }}>
        <Typography.Title level={2} style={{
          fontFamily: FONT, color: colorTokens.primary,
          margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px',
        }}>
          {saudacao(hoje.hour())}, {GESTOR_NOME}!
        </Typography.Title>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, textTransform: 'capitalize' }}>
          {hoje.format('dddd, D [de] MMMM [de] YYYY')}
        </Typography.Text>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────── */}
      <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <Col xs={24} sm={12} xl={6} key={k.key}>
            <Card
              className="dash-card clickable dash-enter"
              styles={{ body: { padding: 22 } }}
              style={{ ...CARD_STYLE, animationDelay: `${0.05 * (i + 1)}s` }}
              onClick={() => navigate('/documentos')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textSecondary }}>
                  {k.titulo}
                </Typography.Text>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${k.cor}14`, color: k.cor, fontSize: 19,
                }}>
                  {k.icon}
                </div>
              </div>
              <Statistic
                value={k.valor}
                groupSeparator="."
                valueStyle={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: colorTokens.textPrimary, lineHeight: 1.1 }}
              />
              <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textMuted, display: 'block', marginTop: 6 }}>
                {k.contexto}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Adesão geral + Pendências por área ─────────────────── */}
      <Row className="dash-row" gutter={[20, 20]} style={{ marginBottom: 20 }}>
        {/* Adesão geral */}
        <Col xs={24} lg={9} style={{ display: 'flex' }}>
          <Card
            className="dash-card dash-enter"
            style={{ ...CARD_STYLE, animationDelay: '0.30s' }}
            styles={{ body: CARD_BODY }}
            title={
              <Space size={8}>
                <RiseOutlined style={{ color: colorTokens.primary }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>Adesão geral</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 4 }}>
              <Progress
                type="circle"
                percent={m.adesaoMedia}
                strokeColor={adesaoColor(m.adesaoMedia)}
                trailColor="#F2F4F7"
                size={172}
                format={(pct) => (
                  <div style={{ fontFamily: FONT }}>
                    <div style={{ fontSize: 34, fontWeight: 700, color: colorTokens.textPrimary }}>{pct}%</div>
                    <div style={{ fontSize: 12, color: colorTokens.textSecondary }}>média de aceites</div>
                  </div>
                )}
              />
              <div style={{ display: 'flex', width: '100%', textAlign: 'center' }}>
                {[
                  { v: m.aceitesTotais,       l: 'Aceites',       c: colorTokens.success },
                  { v: m.pendenciasTotais,    l: 'Pendentes',     c: colorTokens.error },
                  { v: m.destinatariosTotais, l: 'Destinatários', c: colorTokens.textPrimary },
                ].map((s, idx) => (
                  <div key={s.l} style={{ flex: 1, borderLeft: idx > 0 ? '1px solid #F0F1F4' : 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: s.c }}>{s.v.toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* Pendências por área */}
        <Col xs={24} lg={15} style={{ display: 'flex' }}>
          <Card
            className="dash-card dash-enter"
            style={{ ...CARD_STYLE, animationDelay: '0.35s' }}
            styles={{ body: CARD_BODY }}
            title={
              <Space size={8}>
                <BellOutlined style={{ color: colorTokens.primary }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>Pendências por área</span>
              </Space>
            }
          >
            {m.pendenciasPorArea.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem documentos ativos." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>
                {m.pendenciasPorArea.map((a) => {
                  const pos = a.pendencias > 0
                  return (
                    <div key={a.area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textPrimary }}>{a.area}</span>
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: pos ? colorTokens.error : colorTokens.success }}>
                          {a.pendencias} {a.pendencias === 1 ? 'pendência' : 'pendências'}
                        </span>
                      </div>
                      <div className="dash-bar-track">
                        <div className="dash-bar-fill" style={{
                          width: `${Math.max(Math.round((a.pendencias / maxAreaPend) * 100), pos ? 4 : 0)}%`,
                          background: pos ? colorTokens.error : colorTokens.success,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Distribuição por status + Requer atenção ───────────── */}
      <Row className="dash-row" gutter={[20, 20]}>
        {/* Distribuição por status (donut) */}
        <Col xs={24} lg={9} style={{ display: 'flex' }}>
          <Card
            className="dash-card dash-enter"
            style={{ ...CARD_STYLE, animationDelay: '0.40s' }}
            styles={{ body: CARD_BODY }}
            title={
              <Space size={8}>
                <PieChartOutlined style={{ color: colorTokens.primary }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>Documentos por status</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingTop: 4, flexWrap: 'wrap' }}>
              {/* Donut */}
              <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: donutGradient }} />
                <div style={{
                  position: 'absolute', inset: 18, background: '#fff', borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px #F2F4F7',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FONT, color: colorTokens.textPrimary, lineHeight: 1 }}>{m.totalPublicados}</div>
                  <div style={{ fontSize: 11, color: colorTokens.textSecondary, fontFamily: FONT }}>documentos</div>
                </div>
              </div>
              {/* Legenda */}
              <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {statusData.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.cor, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, flex: 1 }}>{s.label}</span>
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: colorTokens.textPrimary }}>{s.valor}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textMuted, width: 38, textAlign: 'right' }}>
                      {Math.round((s.valor / totalStatus) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* Requer atenção */}
        <Col xs={24} lg={15} style={{ display: 'flex' }}>
          <Card
            className="dash-card dash-enter"
            style={{ ...CARD_STYLE, animationDelay: '0.45s' }}
            styles={{ body: CARD_BODY }}
            title={
              <Space size={8}>
                <WarningOutlined style={{ color: colorTokens.warning }} />
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: colorTokens.textPrimary }}>Requer atenção — vigência</span>
                {m.atencao.length > 0 && (
                  <span style={{
                    padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: '#FFF2E8', color: '#D4380D', border: '1px solid #ffbb96',
                  }}>{m.atencao.length}</span>
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
                description={<span style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>Nenhum documento ativo vencido ou vencendo nos próximos 30 dias.</span>}
              />
            ) : (
              <List
                dataSource={m.atencao}
                split={false}
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
                      style={{ padding: '12px 10px', cursor: 'pointer', borderRadius: 10, transition: 'background .15s' }}
                      onClick={() => navigate(`/documentos/${d.id}`)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAFAFB' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      actions={[<ArrowRightOutlined key="go" style={{ color: colorTokens.textMuted }} />]}
                    >
                      <List.Item.Meta
                        title={<span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary }}>{d.titulo}</span>}
                        description={
                          <Space size={8} wrap>
                            <Tag style={{
                              fontFamily: FONT, fontSize: 11, fontWeight: 600, borderRadius: 6, margin: 0,
                              background: tagCor.bg, color: tagCor.color, border: `1px solid ${tagCor.border}`,
                            }}>{tagTexto}</Tag>
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
        </Col>
      </Row>

    </div>
  )
}
