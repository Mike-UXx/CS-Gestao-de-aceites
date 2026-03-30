import { Avatar, Input, Space, Typography } from 'antd'
import { SearchOutlined, ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography

export function AppHeader() {
  const [time, setTime] = useState('')

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
            <div style={{ fontSize: 11, color: colorTokens.textSecondary, lineHeight: 1.3 }}>
              Renner S.A
            </div>
          </div>
          <DownOutlined style={{ fontSize: 10, color: colorTokens.textSecondary }} />
        </Space>
      </Space>
    </header>
  )
}
