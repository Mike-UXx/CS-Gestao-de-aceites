/* ─────────────────────────────────────────────────────────────
   src/features/listagem/pages/ListagemPage.tsx
   Página principal da listagem de documentos — Sprint 2
───────────────────────────────────────────────────────────── */
import { Typography } from 'antd'

const { Title, Text } = Typography
const FONT = "'Montserrat', sans-serif"

export function ListagemPage() {
  return (
    <div style={{ padding: '32px 40px', fontFamily: FONT }}>
      <Title level={3} style={{ fontFamily: FONT, marginBottom: 4 }}>
        Documentos
      </Title>
      <Text type="secondary" style={{ fontFamily: FONT }}>
        Gerencie todos os documentos enviados, agendados e em rascunho.
      </Text>
    </div>
  )
}
