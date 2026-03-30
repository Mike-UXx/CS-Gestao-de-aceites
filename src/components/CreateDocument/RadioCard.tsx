/**
 * RadioCard — card clicável com círculo de rádio customizado.
 * Reutilizado em Destinatários (Step 2) e Configurações (Step 3).
 */
import { Typography } from 'antd'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography

export interface RadioCardProps {
  value: string
  title: string
  description?: string
  selected: boolean
  onClick: () => void
  /** Ícone ou badge opcional exibido antes do texto */
  badge?: React.ReactNode
  /** Estilos adicionais para o container (ex: flex layout externo) */
  style?: React.CSSProperties
}

export function RadioCard({ title, description, selected, onClick, badge, style }: RadioCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        display: 'flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 16,
        padding: '16px 20px',
        borderRadius: 8,
        border: `1px solid ${selected ? colorTokens.primary : '#D9D9D9'}`,
        background: selected ? '#EEF2FF' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        userSelect: 'none',
        outline: 'none',
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${colorTokens.primary}33` }}
      onBlur={(e)  => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Círculo radio */}
      <div
        style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          marginTop: description ? 2 : 0,
          border: `2px solid ${selected ? colorTokens.primary : '#D9D9D9'}`,
          background: selected ? colorTokens.primary : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              display: 'block', fontSize: 14, fontWeight: 600,
              fontFamily: "'Montserrat', sans-serif",
              color: selected ? colorTokens.primary : colorTokens.textPrimary,
              transition: 'color 0.2s ease',
              lineHeight: '22px',
            }}
          >
            {title}
          </Text>
          {badge}
        </div>
        {description && (
          <Text
            style={{
              display: 'block', fontSize: 12,
              fontFamily: "'Montserrat', sans-serif",
              color: colorTokens.textSecondary,
              lineHeight: '20px',
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </div>
    </div>
  )
}
