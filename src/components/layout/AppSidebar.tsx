import { Menu, Layout } from 'antd'
import {
  HomeOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { colorTokens } from '@/theme/tokens'

const { Sider } = Layout

const navItems = [
  { key: '/home', icon: <HomeOutlined />, label: 'Home' },
  { key: '/documentos', icon: <FileTextOutlined />, label: 'Documentos' },
  { key: '/estatisticas', icon: <BarChartOutlined />, label: 'Estatísticas' },
  {
    key: '/configuracoes',
    icon: <SettingOutlined />,
    label: 'Configurações',
  },
]

interface AppSidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeKey = navItems.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key ?? '/documentos'

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
        selectedKeys={[activeKey]}
        style={{ height: '100%', borderRight: 0, paddingTop: 8 }}
        items={navItems.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          onClick: () => navigate(item.key),
          style:
            item.key === activeKey
              ? {
                  color: colorTokens.primary,
                  fontWeight: 600,
                  background: '#EEF2FF',
                  borderRadius: 8,
                }
              : {},
        }))}
      />
    </Sider>
  )
}
