import { Card, Button, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { colorTokens, borderRadius } from '@/theme/tokens'

const { Text } = Typography

interface NewDocumentCardProps {
  onCreate?: () => void
}

export function NewDocumentCard({ onCreate }: NewDocumentCardProps) {
  return (
    <Card
      style={{
        borderRadius: borderRadius.card,
        border: `1.5px dashed ${colorTokens.border}`,
        background: '#FAFAFA',
        boxShadow: 'none',
        maxHeight: 380,
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px 24px',
          gap: 12,
        },
      }}
    >
      {/* Plus icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: `2px dashed ${colorTokens.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <PlusOutlined style={{ fontSize: 28, color: colorTokens.textMuted }} />
      </div>

      <Text strong style={{ fontSize: 15, color: colorTokens.textPrimary }}>
        Novo documento
      </Text>
      <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
        Criar do zero
      </Text>

      <Button
        type="primary"
        onClick={onCreate}
        style={{
          marginTop: 8,
          background: colorTokens.primary,
          borderColor: colorTokens.primary,
          borderRadius: borderRadius.button,
          fontWeight: 500,
          width: '100%',
        }}
      >
        Criar
      </Button>
    </Card>
  )
}
