import { Modal, Typography, Button, Space } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography

interface CancelModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CancelModal({ open, onCancel, onConfirm }: CancelModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={416}
      centered
      closable={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px', textAlign: 'center', gap: 12 }}>
        <ExclamationCircleOutlined
          style={{ fontSize: 40, color: colorTokens.warning, marginBottom: 4 }}
        />
        <Text strong style={{ fontSize: 16, color: colorTokens.textPrimary }}>
          Sair da criação de documento
        </Text>
        <Text style={{ fontSize: 14, color: colorTokens.textSecondary }}>
          Seu progresso até aqui será perdido
        </Text>
        <Space style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} size={12}>
          <Button
            onClick={onCancel}
            style={{ minWidth: 100 }}
          >
            Cancelar
          </Button>
          <Button
            danger
            type="primary"
            onClick={onConfirm}
            style={{ minWidth: 100 }}
          >
            Sair
          </Button>
        </Space>
      </div>
    </Modal>
  )
}
