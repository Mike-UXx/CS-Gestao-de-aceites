/* ─────────────────────────────────────────────────────────────
   src/features/configuracoes/pages/ConfiguracoesPage.tsx
   Configurações do sistema — landing com os cards de configuração.
───────────────────────────────────────────────────────────── */
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { FileTextOutlined, RightOutlined } from '@ant-design/icons'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography
const FONT = "'Montserrat', sans-serif"

export function ConfiguracoesPage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>
      <Typography.Title level={2} style={{ fontFamily: FONT, color: colorTokens.primary, margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px' }}>
        Configurações
      </Typography.Title>
      <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
        Configurações do sistema
      </Text>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24, marginTop: 24 }}>
        <Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary, display: 'block', marginBottom: 2 }}>
          Geral
        </Text>
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16 }}>
          Gerencie as configurações e preferências gerais da plataforma
        </Text>

        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/configuracoes/classificacoes')}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/configuracoes/classificacoes') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            border: `1px solid ${colorTokens.border}`, borderRadius: 10, padding: '16px 18px',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = colorTokens.primary }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = colorTokens.border }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#EEF2FF', color: colorTokens.primary, fontSize: 20,
          }}>
            <FileTextOutlined />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, display: 'block' }}>
              Classificações
            </Text>
            <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
              As classificações ajudam a organizar os documentos por tipo, facilitando a gestão, busca e geração de relatórios
            </Text>
          </div>
          <RightOutlined style={{ color: colorTokens.textMuted, fontSize: 14 }} />
        </div>
      </div>
    </div>
  )
}
