/* ─────────────────────────────────────────────────────────────
   src/features/aprovacao/pages/ApprovalPage.tsx
   Tela de revisão/aprovação — documento (PDF) + chat entre Gestor e
   Aprovador. Fase 1: shell + navegação. Fase 2: chat + PDF lado a lado.
───────────────────────────────────────────────────────────── */
import { useParams, useNavigate } from 'react-router-dom'
import { Typography } from 'antd'
import { ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { colorTokens } from '@/theme/tokens'

const FONT = "'Montserrat', sans-serif"

export function ApprovalPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const doc = MOCK_DOCUMENTOS.find((d) => d.id === id)

  return (
    <div style={{ padding: '28px 32px 56px', fontFamily: FONT, background: '#F5F6F8', minHeight: '100%' }}>
      <button
        onClick={() => navigate('/documentos')}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 16,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          color: colorTokens.primary, fontSize: 13, fontWeight: 500, fontFamily: FONT,
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 11 }} />
        Voltar
      </button>

      <Typography.Title level={3} style={{ fontFamily: FONT, color: colorTokens.primary, marginTop: 0, marginBottom: 0, fontSize: 24, fontWeight: 700 }}>
        {doc?.titulo ?? 'Documento'}
      </Typography.Title>
      <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginTop: 4, marginBottom: 20 }}>
        Revisão e aprovação
      </Typography.Text>

      <div style={{
        background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10,
        boxShadow: '0 2px 3px rgba(156,156,156,0.2)', padding: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <InfoCircleOutlined style={{ fontSize: 20, color: colorTokens.primary }} />
        <Typography.Text style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary }}>
          A tela de revisão (documento + chat entre gestor e aprovador) será construída na próxima fase.
        </Typography.Text>
      </div>
    </div>
  )
}
