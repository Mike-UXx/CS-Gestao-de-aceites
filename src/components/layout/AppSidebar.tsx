import { Menu, Layout } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { colorTokens } from '@/theme/tokens'
import { useRole } from '@/auth/RoleContext'
import type { Permission } from '@/auth/roles'

const { Sider } = Layout

/** Item de navegação + permissão necessária (undefined = sempre visível). */
interface NavDef {
  key: string
  icon: React.ReactNode
  label: string
  perm?: Permission
}

const NAV_DEFS: NavDef[] = [
  { key: '/home', icon: <HomeOutlined />, label: 'Home' },
  { key: '/documentos', icon: <FileTextOutlined />, label: 'Documentos' },
  // Configurações leva direto ao hub (Geral); as telas internas
  // (Classificações, Notificações) são acessadas pelos cards do hub.
  { key: '/configuracoes', icon: <SettingOutlined />, label: 'Configurações', perm: 'config:acessar' },
]

/** Todas as rotas conhecidas — para resolver o item ativo (subrotas de
    /configuracoes mantêm "Configurações" destacado por prefixo). */
const ALL_KEYS = ['/home', '/documentos', '/configuracoes']

interface AppSidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { can } = useRole()

  const navItems: MenuProps['items'] = NAV_DEFS
    .filter((d) => !d.perm || can(d.perm))
    .map((d) => ({ key: d.key, icon: d.icon, label: d.label }))

  // Item ativo = rota conhecida mais específica que casa com o pathname
  const selectedKey = ALL_KEYS
    .filter((k) => location.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] ?? '/home'

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={200}
      collapsedWidth={64}
      style={{
        background: '#fff',
        borderRight: `1px solid ${colorTokens.border}`,
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
      trigger={null}
    >
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0, paddingTop: 8 }}
        items={navItems}
      />
    </Sider>
  )
}
