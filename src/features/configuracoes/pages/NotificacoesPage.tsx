/* ─────────────────────────────────────────────────────────────
   src/features/configuracoes/pages/NotificacoesPage.tsx
   EP06 · US 6.3 — Configurações > Notificações (preferências).
   Toggles por tipo de evento de e-mail: salvam imediatamente
   (sem botão "Salvar"), todos habilitados por padrão. Só e-mail
   nesta versão — não há central de notificações in-app.
───────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Button, Switch, Divider, message } from 'antd'
import {
  ArrowLeftOutlined, NotificationOutlined, ClockCircleOutlined,
  FileAddOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography
const FONT = "'Montserrat', sans-serif"

/* ── Tipos de notificação (US 6.2 / US 6.3 AC1) ─────────────── */
interface TipoNotificacao {
  key: string
  icon: React.ReactNode
  titulo: string
  descricao: string
}

const TIPOS: TipoNotificacao[] = [
  {
    key: 'publicacao',
    icon: <NotificationOutlined />,
    titulo: 'Documento publicado na gestão responsável',
    descricao: 'Receba um e-mail quando um documento for publicado em uma gestão da qual você faz parte.',
  },
  {
    key: 'expiracao',
    icon: <ClockCircleOutlined />,
    titulo: 'Expiração de vigência próxima',
    descricao: 'Aviso antecipado quando a vigência de um documento estiver perto do fim.',
  },
  {
    key: 'rascunho',
    icon: <FileAddOutlined />,
    titulo: 'Novo rascunho criado',
    descricao: 'Quando um rascunho de documento é criado na sua gestão responsável.',
  },
  {
    key: 'aceito_por_todos',
    icon: <CheckCircleOutlined />,
    titulo: 'Documento aceito por todos',
    descricao: 'Quando todos os destinatários concluírem o aceite de um documento.',
  },
]

/* Preferências em memória (protótipo): persistem durante a sessão.
   US 6.3 AC4 — todos os tipos habilitados por padrão. */
const prefsStore: Record<string, boolean> = Object.fromEntries(TIPOS.map((t) => [t.key, true]))

export function NotificacoesPage() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({ ...prefsStore }))

  /* US 6.3 AC3 — a alteração é salva imediatamente, sem ação extra. */
  function togglePref(key: string, checked: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: checked }))
    prefsStore[key] = checked
    message.success(checked ? 'Notificação habilitada' : 'Notificação desabilitada')
  }

  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>

      {/* ── Voltar ── */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/configuracoes')}
        style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.primary, padding: 0, marginBottom: 8 }}
      >
        Voltar
      </Button>

      {/* ── Cabeçalho ── */}
      <Typography.Title level={2} style={{ fontFamily: FONT, color: colorTokens.primary, margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px' }}>
        Notificações
      </Typography.Title>
      <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
        Gerencie quais notificações por e-mail você recebe
      </Text>

      {/* ── Card de preferências ── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24, marginTop: 24 }}>
        <Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary, display: 'block', marginBottom: 2 }}>
          Preferências de notificação
        </Text>
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block' }}>
          Os e-mails são enviados para o seu endereço cadastrado na plataforma. As alterações são salvas automaticamente.
        </Text>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TIPOS.map((tipo) => {
            const ativo = prefs[tipo.key]
            return (
              <div
                key={tipo.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  border: `1px solid ${colorTokens.border}`, borderRadius: 10, padding: '16px 18px',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: ativo ? '#EEF2FF' : '#F5F5F5',
                  color: ativo ? colorTokens.primary : colorTokens.textSecondary,
                  fontSize: 20, transition: 'background 0.2s, color 0.2s',
                }}>
                  {tipo.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, display: 'block' }}>
                    {tipo.titulo}
                  </Text>
                  <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
                    {tipo.descricao}
                  </Text>
                </div>
                <Switch
                  checked={ativo}
                  onChange={(v) => togglePref(tipo.key, v)}
                  aria-label={tipo.titulo}
                  style={{ background: ativo ? colorTokens.primary : undefined, flexShrink: 0 }}
                />
              </div>
            )
          })}
        </div>

        {/* RN3 (US 6.3): preferências não afetam os lembretes de aceite ao colaborador */}
        <Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginTop: 16 }}>
          Estas preferências valem apenas para os e-mails enviados a você. Os lembretes de aceite aos
          colaboradores são configurados por documento, na etapa de criação.
        </Text>
      </div>
    </div>
  )
}
