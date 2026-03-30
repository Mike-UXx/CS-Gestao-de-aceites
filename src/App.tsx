import { useState } from 'react'
import { Layout, ConfigProvider } from 'antd'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'
import { SelectTemplate } from '@/pages/CreateDocument/SelectTemplate'
import { InformacoesStep } from '@/pages/CreateDocument/InformacoesStep'
import { DestinatariosStep } from '@/pages/CreateDocument/DestinatariosStep'
import { ConfiguracoesStep } from '@/pages/CreateDocument/ConfiguracoesStep'
import { RevisaoStep } from '@/pages/CreateDocument/RevisaoStep'
import { DocumentFormProvider } from '@/context/DocumentFormContext'
import { colorTokens } from '@/theme/tokens'

const { Content } = Layout

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
                <Route path="/" element={<Navigate to="/documentos/criar" replace />} />
                <Route path="/documentos/criar" element={<SelectTemplate />} />
                <Route path="/documentos/criar/informacoes" element={<InformacoesStep />} />
                <Route path="/documentos/criar/destinatarios" element={<DestinatariosStep />} />
                <Route path="/documentos/criar/configuracoes" element={<ConfiguracoesStep />} />
                <Route path="/documentos/criar/revisao" element={<RevisaoStep />} />
                <Route path="*" element={<Navigate to="/documentos/criar" replace />} />
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
      <BrowserRouter>
        <DocumentFormProvider>
          <AppShell />
        </DocumentFormProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}
