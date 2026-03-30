import { colorTokens } from '@/theme/tokens'

export function AppFooter() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderTop: `1px solid ${colorTokens.border}`,
        background: '#fff',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {/* Logo mini */}
      <img
        src="/logo-contato-seguro.svg"
        alt="Contato Seguro"
        style={{ height: 28, width: 'auto', display: 'block' }}
      />

      <span style={{ fontSize: 11, color: colorTokens.textSecondary }}>
        © Copyright 2022 Todos os direitos reservados.{' '}
        <span style={{ color: colorTokens.primary, fontWeight: 500 }}>
          Administrado por Contato Seguro
        </span>
      </span>
    </footer>
  )
}
