import { Steps } from 'antd'
import { colorTokens } from '@/theme/tokens'

const STEPS = ['Informações', 'Destinatários', 'Configurações', 'Revisão']

interface DocumentStepperProps {
  current: number
  hasError?: boolean
}

export function DocumentStepper({ current, hasError }: DocumentStepperProps) {
  return (
    <Steps
      current={current}
      size="small"
      style={{ maxWidth: 640 }}
      items={STEPS.map((title, index) => ({
        title,
        status:
          index < current ? 'finish'
          : index === current ? (hasError ? 'error' : 'process')
          : 'wait',
      }))}
    />
  )
}

/* Token overrides via CSS-in-JS style tag (runs once) */
const el = document.createElement('style')
el.textContent = `
  .ant-steps-item-process .ant-steps-item-icon {
    background-color: ${colorTokens.primary} !important;
    border-color: ${colorTokens.primary} !important;
  }
  .ant-steps-item-finish .ant-steps-item-icon {
    border-color: ${colorTokens.primary} !important;
  }
  .ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon {
    color: ${colorTokens.primary} !important;
  }
  .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after {
    background-color: ${colorTokens.primary} !important;
  }
  .ant-steps-item-error .ant-steps-item-icon {
    border-color: ${colorTokens.error} !important;
    background-color: ${colorTokens.error} !important;
  }
`
document.head.appendChild(el)
