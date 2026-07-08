/* ─────────────────────────────────────────────────────────────
   src/features/configuracoes/pages/ConfiguracoesPage.tsx
   Configurações do sistema — landing com os cards de configuração.
───────────────────────────────────────────────────────────── */
import { useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { BellOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons'
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ConfigItem
            icon={<FileTextOutlined />}
            titulo="Classificações"
            descricao="As classificações ajudam a organizar os documentos por tipo, facilitando a gestão, busca e geração de relatórios"
            onClick={() => navigate('/configuracoes/classificacoes')}
          />
          <ConfigItem
            icon={<BellOutlined />}
            titulo="Notificações"
            descricao="Escolha quais eventos dos documentos você acompanha por e-mail"
            onClick={() => navigate('/configuracoes/notificacoes')}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Linha de configuração do hub (padrão Figma EP06: ícone + título + descrição) ── */
function ConfigItem({
  icon, titulo, descricao, onClick,
}: { icon: React.ReactNode; titulo: string; descricao: string; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
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
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, display: 'block' }}>
          {titulo}
        </Text>
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
          {descricao}
        </Text>
      </div>
      <RightOutlined style={{ color: colorTokens.textMuted, fontSize: 14 }} />
    </div>
  )
}
