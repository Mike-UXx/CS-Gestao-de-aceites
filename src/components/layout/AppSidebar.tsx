import { useState } from 'react'
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
  children?: { key: string; label: string }[]
}

const NAV_DEFS: NavDef[] = [
  { key: '/home', icon: <HomeOutlined />, label: 'Home' },
  { key: '/documentos', icon: <FileTextOutlined />, label: 'Documentos' },
  {
    key: '/configuracoes',
    icon: <SettingOutlined />,
    label: 'Configurações',
    perm: 'config:acessar',
    children: [
      { key: '/configuracoes/classificacoes', label: 'Classificações' },
    ],
  },
]

/** Todas as rotas conhecidas (inclui filhas) — para resolver o item ativo. */
const ALL_KEYS = ['/home', '/documentos', '/configuracoes/classificacoes', '/configuracoes']

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
    .map((d) => ({
      key: d.key,
      icon: d.icon,
      label: d.label,
      ...(d.children ? { children: d.children } : {}),
    }))

  // Item ativo = rota conhecida mais específica que casa com o pathname
  const selectedKey = ALL_KEYS
    .filter((k) => location.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0] ?? '/home'

  const [openKeys, setOpenKeys] = useState<string[]>(
    location.pathname.startsWith('/configuracoes') ? ['/configuracoes'] : [],
  )

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
        openKeys={openKeys}
        onOpenChange={(keys) => setOpenKeys(keys as string[])}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0, paddingTop: 8 }}
        items={navItems}
      />
    </Sider>
  )
}
