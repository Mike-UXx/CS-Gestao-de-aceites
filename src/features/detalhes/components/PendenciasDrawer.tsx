/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/components/PendenciasDrawer.tsx
   Drawer: Acompanhamento de Destinatários (Pendentes / Concluídos)
   Compartilhado entre DetalhesPage e ListagemPage
───────────────────────────────────────────────────────────── */
import { useState, useEffect } from 'react'
import {
  Typography, Button, Drawer, List, Avatar, Space, Tabs, Spin, message,
} from 'antd'
import {
  BellOutlined, SendOutlined, CheckCircleOutlined, TeamOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { COLABORADORES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'
import type { Documento } from '@/features/listagem/types/documento'

const FONT = "'Montserrat', sans-serif"

/* ── Cooldown para evitar disparo repetido de lembretes ─────── */
const REMINDER_COOLDOWN_MS = 5 * 60_000  // 5min — lembrete individual e "lembrar todos"

function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface PendenciasDrawerProps {
  open: boolean
  onClose: () => void
  doc: Documento | null
}

export function PendenciasDrawer({ open, onClose, doc }: PendenciasDrawerProps) {
  const [pendenciasTab,      setPendenciasTab]      = useState<'pendentes' | 'concluidos'>('pendentes')
  const [drawerLoading,      setDrawerLoading]      = useState(false)
  const [reminderLoadingKey, setReminderLoadingKey] = useState<string | null>(null)
  const [reminderAllLoading, setReminderAllLoading] = useState(false)
  const [reminderCooldowns,  setReminderCooldowns]  = useState<Record<string, number>>({})
  const [allCooldownUntil,   setAllCooldownUntil]   = useState<number | null>(null)
  const [now,                setNow]                = useState(() => Date.now())

  const pendentes = doc ? doc.totalDestinatarios - doc.totalAceites : 0

  /* ── Pendentes mock ── */
  const pendentesNomes = doc ? COLABORADORES.slice(0, Math.max(pendentes, 0)).map((c) => c.label) : []

  /* ── Abre direto na aba "Concluídos" se não houver pendentes ── */
  useEffect(() => {
    if (!open || !doc) return
    setPendenciasTab(pendentes === 0 ? 'concluidos' : 'pendentes')
    setDrawerLoading(true)
    const timer = setTimeout(() => setDrawerLoading(false), 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id])

  /* ── Atualiza contadores de cooldown a cada segundo ── */
  useEffect(() => {
    const hasActiveCooldown = allCooldownUntil !== null || Object.keys(reminderCooldowns).length > 0
    if (!hasActiveCooldown) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [reminderCooldowns, allCooldownUntil])

  function handleReminder(nome: string) {
    setReminderLoadingKey(nome)
    setTimeout(() => {
      setReminderLoadingKey(null)
      setReminderCooldowns((prev) => ({ ...prev, [nome]: Date.now() + REMINDER_COOLDOWN_MS }))
      message.success(`Lembrete enviado para ${nome}.`)
    }, 900)
  }

  function handleReminderAll() {
    setReminderAllLoading(true)
    setTimeout(() => {
      setReminderAllLoading(false)
      const until = Date.now() + REMINDER_COOLDOWN_MS
      setAllCooldownUntil(until)
      setReminderCooldowns((prev) => {
        const next = { ...prev }
        pendentesNomes.forEach((nome) => { next[nome] = until })
        return next
      })
      message.success(`Lembretes enviados para ${pendentes} ${pendentes === 1 ? 'destinatário' : 'destinatários'} pendentes.`)
    }, 1200)
  }

  if (!doc) return <Drawer open={open} onClose={onClose} width={480} destroyOnHidden />

  /* ── Concluídos mock (com datas determinísticas) ── */
  const concluidosMock = COLABORADORES
    .slice(Math.max(pendentes, 0), doc.totalDestinatarios)
    .map((c, i) => ({
      nome: c.label,
      data: dayjs(doc.dataLancamento ?? doc.criadoEm).add(i * 2 + 1, 'day').format('DD/MM/YYYY'),
    }))

  /* ── Cooldown do botão "Lembrar todos os pendentes" ── */
  const allRemaining = allCooldownUntil ? Math.max(0, Math.ceil((allCooldownUntil - now) / 1000)) : 0
  const allInCooldown = allRemaining > 0

  return (
    <Drawer
      open={open}
      onClose={onClose}
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
                          icon={allInCooldown ? <ClockCircleOutlined /> : <BellOutlined />}
                          loading={reminderAllLoading}
                          disabled={allInCooldown}
                          onClick={handleReminderAll}
                          style={{
                            fontFamily: FONT, fontWeight: 600, fontSize: 13,
                            borderRadius: 8, height: 38,
                            background: allInCooldown ? undefined : colorTokens.primary,
                            borderColor: allInCooldown ? undefined : colorTokens.primary,
                            width: '100%',
                          }}
                        >
                          {allInCooldown ? `Aguarde ${formatCooldown(allRemaining)} para reenviar` : 'Lembrar todos os pendentes'}
                        </Button>
                      </div>

                      {/* Lista de pendentes */}
                      <List
                        dataSource={pendentesNomes}
                        renderItem={(nome) => {
                          const cooldownUntil = reminderCooldowns[nome]
                          const remaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0
                          const inCooldown = remaining > 0
                          return (
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
                                icon={inCooldown ? <ClockCircleOutlined style={{ fontSize: 11 }} /> : <SendOutlined style={{ fontSize: 11 }} />}
                                loading={reminderLoadingKey === nome}
                                disabled={inCooldown}
                                onClick={() => handleReminder(nome)}
                                style={{
                                  fontFamily: FONT, fontSize: 12, fontWeight: 600,
                                  color: inCooldown ? '#8C8C8C' : colorTokens.primary, padding: '0 4px',
                                  height: 'auto', flexShrink: 0,
                                }}
                              >
                                {inCooldown ? `Aguarde ${formatCooldown(remaining)}` : 'Enviar lembrete'}
                              </Button>
                            </List.Item>
                          )
                        }}
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
  )
}
