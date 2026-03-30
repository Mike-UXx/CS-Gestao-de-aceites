import { Card, Button, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined, BookOutlined } from '@ant-design/icons'
import { colorTokens, borderRadius } from '@/theme/tokens'
import { DocumentThumbnail } from './DocumentThumbnail'

const { Text, Paragraph } = Typography

export interface TemplateCardProps {
  title: string
  description: string
  headerColor: string
  onDownload?: () => void
}

const TOOLTIP_TEXT =
  'Modelo elaborado e validado pela Contato Seguro, seguindo boas práticas de compliance e governança corporativa.'

export function TemplateCard({ title, description, headerColor, onDownload }: TemplateCardProps) {
  return (
    <Card
      style={{
        borderRadius: borderRadius.card,
        overflow: 'hidden',
        border: `1px solid ${colorTokens.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 380,
      }}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      {/* Colored header */}
      <div
        style={{
          background: headerColor,
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <DocumentThumbnail color={headerColor} />
        {/* Bookmark badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 6,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BookOutlined style={{ color: '#fff', fontSize: 14 }} />
        </div>
      </div>

      {/* Card body */}
      <div
        style={{
          padding: '16px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Title + tooltip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14, color: colorTokens.textPrimary, lineHeight: 1.3 }}>
            {title}
          </Text>
          <Tooltip title={TOOLTIP_TEXT} overlayStyle={{ maxWidth: 220 }}>
            <InfoCircleOutlined
              style={{ color: colorTokens.textSecondary, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
            />
          </Tooltip>
        </div>

        {/* Description */}
        <Paragraph
          style={{
            fontSize: 12,
            color: colorTokens.textSecondary,
            margin: 0,
            flex: 1,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Paragraph>

        {/* CTA */}
        <Button
          block
          onClick={onDownload}
          style={{
            marginTop: 16,
            borderRadius: borderRadius.button,
            borderColor: colorTokens.primary,
            color: colorTokens.primary,
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          Baixar e editar modelo
        </Button>
      </div>
    </Card>
  )
}
