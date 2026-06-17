import { Avatar, Input, Space, Typography, Dropdown, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { SearchOutlined, ClockCircleOutlined, DownOutlined, CheckOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { colorTokens } from '@/theme/tokens'
import { useRole } from '@/auth/RoleContext'
import { ROLES, roleMeta } from '@/auth/roles'

const { Text } = Typography

export function AppHeader() {
  const [time, setTime] = useState('')
  const { role, setRole } = useRole()
  const meta = roleMeta(role)

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
          src="/logo-contato-seguro.svg"
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

      {/* Right: clock + user */}
      <Space size={16} style={{ minWidth: 220, justifyContent: 'flex-end' }}>
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
