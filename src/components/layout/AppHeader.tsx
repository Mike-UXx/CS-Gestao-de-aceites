import { Avatar, Input, Space, Typography, Dropdown, Tag, Badge, Popover, Empty } from 'antd'
import type { MenuProps } from 'antd'
import {
  SearchOutlined, ClockCircleOutlined, DownOutlined, CheckOutlined,
  BellOutlined, ExclamationCircleFilled, ClockCircleFilled, TeamOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colorTokens } from '@/theme/tokens'
import { useRole } from '@/auth/RoleContext'
import { ROLES, roleMeta } from '@/auth/roles'
import { buildNotificacoes, type NotificacaoTipo } from '@/features/notificacoes/utils/notificacoes'

const { Text } = Typography

/* Ícone + cor por tipo de notificação */
const NOTIF_STYLE: Record<NotificacaoTipo, { icon: React.ReactNode; color: string }> = {
  vencido:   { icon: <ExclamationCircleFilled />, color: '#CF1322' },
  vencendo:  { icon: <ClockCircleFilled />,        color: '#D46B08' },
  pendencia: { icon: <TeamOutlined />,             color: colorTokens.primary },
}

export function AppHeader() {
  const [time, setTime] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()
  const { role, setRole, podeVerGestao } = useRole()
  const meta = roleMeta(role)

  /* Notificações escopadas pela gestão do perfil ativo */
  const notificacoes = useMemo(() => buildNotificacoes(podeVerGestao), [podeVerGestao])

  function abrirDocumento(docId: string) {
    setNotifOpen(false)
    navigate(`/documentos/${docId}`)
  }

  const notifPanel = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 10px', borderBottom: '1px solid #F0F0F0' }}>
        <Text strong style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 14, color: colorTokens.textPrimary }}>
          Notificações
        </Text>
        {notificacoes.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#D4380D', background: '#FFF2E8', border: '1px solid #ffbb96', borderRadius: 10, padding: '1px 8px' }}>
            {notificacoes.length}
          </span>
        )}
      </div>

      {notificacoes.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, color: colorTokens.textSecondary }}>Tudo em dia por aqui.</span>
        } style={{ padding: '20px 0' }} />
      ) : (
        <div style={{ maxHeight: 380, overflowY: 'auto', paddingTop: 4 }}>
          {notificacoes.map((n) => {
            const s = NOTIF_STYLE[n.tipo]
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => abrirDocumento(n.docId)}
                onKeyDown={(e) => { if (e.key === 'Enter') abrirDocumento(n.docId) }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 6px', borderRadius: 8, cursor: 'pointer', borderBottom: '1px solid #F7F7F7' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: s.color, fontSize: 15, marginTop: 2, flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.titulo}
                  </Text>
                  <Text style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, color: s.color }}>
                    {n.mensagem}
                  </Text>
                </div>
                <ArrowRightOutlined style={{ color: colorTokens.textMuted, fontSize: 12, marginTop: 3, flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const roleItems: MenuProps['items'] = [
    {
      key: 'header',
      disabled: true,
      label: (
        <div style={{ padding: '2px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colorTokens.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Visualizar como
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    ...ROLES.map((r) => ({
      key: r.value,
      onClick: () => setRole(r.value),
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0', minWidth: 220 }}>
          <Avatar size={30} style={{ background: r.value === role ? colorTokens.primary : '#EEF2FF', color: r.value === role ? '#fff' : colorTokens.primary, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {r.iniciais}
          </Avatar>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary }}>{r.label}</div>
            <div style={{ fontSize: 11, color: colorTokens.textSecondary }}>{r.descricao}</div>
          </div>
          {r.value === role && <CheckOutlined style={{ color: colorTokens.primary, fontSize: 12 }} />}
        </div>
      ),
    })),
  ]

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 64,
        background: '#fff',
        borderBottom: `1px solid #E5E7EB`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ minWidth: 160, display: 'flex', alignItems: 'center' }}>
        <img
          src={`${import.meta.env.BASE_URL}logo-contato-seguro.svg`}
          alt="Contato Seguro"
          style={{ height: 40, width: 'auto', display: 'block' }}
        />
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 480, margin: '0 24px' }}>
        <Input
          prefix={<SearchOutlined style={{ color: colorTokens.textMuted }} />}
          placeholder="Pesquisar"
          variant="filled"
          style={{ borderRadius: 8, height: 38 }}
        />
      </div>

      {/* Right: bell + clock + user */}
      <Space size={16} style={{ minWidth: 220, justifyContent: 'flex-end' }}>
        <Popover
          open={notifOpen}
          onOpenChange={setNotifOpen}
          trigger="click"
          placement="bottomRight"
          content={notifPanel}
          styles={{ body: { padding: 12 } }}
        >
          <Badge count={notificacoes.length} size="small" offset={[-2, 2]} style={{ boxShadow: 'none' }}>
            <BellOutlined style={{ fontSize: 18, color: colorTokens.textSecondary, cursor: 'pointer' }} />
          </Badge>
        </Popover>
        <Space size={4}>
          <ClockCircleOutlined style={{ color: colorTokens.textSecondary, fontSize: 14 }} />
          <Text style={{ fontSize: 13, color: colorTokens.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
            {time}
          </Text>
        </Space>
        <Dropdown menu={{ items: roleItems }} trigger={['click']} placement="bottomRight">
          <Space size={8} style={{ cursor: 'pointer' }}>
            <Avatar
              size={32}
              style={{ background: colorTokens.primary, fontSize: 13, fontWeight: 600 }}
            >
              MA
            </Avatar>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: colorTokens.textPrimary, lineHeight: 1.3 }}>
                Michael Ayres da S...
              </div>
              <Tag style={{
                fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, lineHeight: '15px',
                margin: 0, padding: '0 6px', borderRadius: 6,
                color: colorTokens.primary, background: '#EEF2FF', border: `1px solid #C3CAF5`,
              }}>
                {meta.label}
              </Tag>
            </div>
            <DownOutlined style={{ fontSize: 10, color: colorTokens.textSecondary }} />
          </Space>
        </Dropdown>
      </Space>
    </header>
  )
}
