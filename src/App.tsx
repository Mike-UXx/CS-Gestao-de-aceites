import { useState } from 'react'
import { Layout, ConfigProvider } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'
import { SelectTemplate } from '@/features/criacao/pages/SelectTemplate'
import { InformacoesStep } from '@/features/criacao/pages/InformacoesStep'
import { DestinatariosStep } from '@/features/criacao/pages/DestinatariosStep'
import { RegrasStep } from '@/features/criacao/pages/RegrasStep'
import { RevisaoStep } from '@/features/criacao/pages/RevisaoStep'
import { DocumentFormProvider } from '@/features/criacao/context/DocumentFormContext'
import { ListagemPage } from '@/features/listagem'
import { DashboardPage } from '@/features/dashboard'
import { ConfiguracoesPage, ClassificacoesPage, NotificacoesPage } from '@/features/configuracoes'
import { EnvioLotePage } from '@/features/envio-lote'
import { DetalhesPage } from '@/features/detalhes'
import { ApprovalPage } from '@/features/aprovacao/pages/ApprovalPage'
import { EditarAtivoPage, EditarAgendadoPage } from '@/features/edicao'
import { NovaVersaoPage } from '@/features/versao/pages/NovaVersaoPage'
import { colorTokens } from '@/theme/tokens'
import { RoleProvider, useRole } from '@/auth/RoleContext'
import type { Permission } from '@/auth/roles'
import type { ReactNode } from 'react'

const { Content } = Layout

/** Guarda de rota: redireciona se o perfil não tiver a permissão. */
function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can } = useRole()
  return can(perm) ? <>{children}</> : <Navigate to="/documentos" replace />
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Layout>
        <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout style={{ background: colorTokens.bgLayout }}>
          <Content style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<DashboardPage />} />
                <Route path="/documentos" element={<ListagemPage />} />
                <Route path="/documentos/:id" element={<DetalhesPage />} />
                <Route path="/documentos/:id/aprovacao" element={<ApprovalPage />} />
                <Route path="/documentos/:id/nova-versao" element={<RequirePermission perm="documento:criar"><NovaVersaoPage /></RequirePermission>} />
                <Route path="/documentos/:id/editar" element={<EditarAtivoPage />} />
                <Route path="/documentos/:id/editar-agendado" element={<EditarAgendadoPage />} />
                <Route path="/documentos/listagem" element={<Navigate to="/documentos" replace />} />
                <Route path="/documentos/envio-lote" element={<RequirePermission perm="documento:criar"><EnvioLotePage /></RequirePermission>} />
                <Route path="/documentos/criar" element={<RequirePermission perm="documento:criar"><SelectTemplate /></RequirePermission>} />
                <Route path="/documentos/criar/informacoes" element={<RequirePermission perm="documento:criar"><InformacoesStep /></RequirePermission>} />
                <Route path="/documentos/criar/destinatarios" element={<RequirePermission perm="documento:criar"><DestinatariosStep /></RequirePermission>} />
                <Route path="/documentos/criar/regras" element={<RequirePermission perm="documento:criar"><RegrasStep /></RequirePermission>} />
                <Route path="/documentos/criar/revisao" element={<RequirePermission perm="documento:criar"><RevisaoStep /></RequirePermission>} />
                <Route path="/configuracoes" element={<RequirePermission perm="config:acessar"><ConfiguracoesPage /></RequirePermission>} />
                <Route path="/configuracoes/classificacoes" element={<RequirePermission perm="config:acessar"><ClassificacoesPage /></RequirePermission>} />
                <Route path="/configuracoes/notificacoes" element={<RequirePermission perm="config:acessar"><NotificacoesPage /></RequirePermission>} />
                <Route path="*" element={<Navigate to="/documentos" replace />} />
              </Routes>
            </div>
            <AppFooter />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colorTokens.primary,
          borderRadius: 8,
          fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Menu: {
            itemSelectedBg: '#EEF2FF',
            itemSelectedColor: colorTokens.primary,
            itemBorderRadius: 8,
          },
          Layout: {
            siderBg: '#ffffff',
          },
        },
      }}
    >
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <RoleProvider>
          <DocumentFormProvider>
            <AppShell />
          </DocumentFormProvider>
        </RoleProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}
