/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/components/HistoricoDrawer.tsx
   Drawer "Histórico do documento" — 2 abas: Histórico de versões
   (resumo textual da mudança) e Histórico de ações (auditoria).
   Compartilhado entre DetalhesPage e ListagemPage.
───────────────────────────────────────────────────────────── */
import { Typography, Space, Timeline, Badge, Drawer, Tabs, Button, message } from 'antd'
import {
  CheckCircleOutlined, FileTextOutlined, HistoryOutlined,
  StopOutlined, AuditOutlined, TeamOutlined, SwapOutlined, UserOutlined,
  DownloadOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { colorTokens } from '@/theme/tokens'
import { VERSION_HISTORY } from '@/data/mockVersoes'

const FONT = "'Montserrat', sans-serif"

/* ── Tipos do histórico de ações ────────────────────────────── */
type HistoricoTipo = 'publicacao' | 'edicao_metadata' | 'nova_versao' | 'inativacao' | 'encerramento' | 'destinatarios'

interface HistoricoItem {
  data: string
  autor: string
  tipo: HistoricoTipo
  descricao: string
}

/* ── Mock: histórico geral de auditoria administrativa ──────── */
const HISTORICO_GERAL: Record<string, HistoricoItem[]> = {
  'doc-001': [
    { data: '2024-10-10T09:00:00Z', autor: 'Ana Silva',    tipo: 'publicacao',        descricao: 'Documento publicado e enviado para 148 destinatários.' },
    { data: '2024-10-15T14:22:00Z', autor: 'Bruno Costa',  tipo: 'edicao_metadata',   descricao: 'Título atualizado de "Código de Conduta" para "Código de Conduta e Ética Empresarial".' },
    { data: '2025-02-14T10:05:00Z', autor: 'Carla Mendes', tipo: 'nova_versao',        descricao: 'Nova versão V2 criada. Revisão de cláusulas para adequação à Lei 14.611/2023.' },
    { data: '2025-02-14T10:06:00Z', autor: 'Carla Mendes', tipo: 'destinatarios',      descricao: '12 novos destinatários adicionados ao departamento de Compliance.' },
    { data: '2025-12-31T08:00:00Z', autor: 'Carla Mendes', tipo: 'nova_versao',        descricao: 'Nova versão V3 criada. Atualização dos itens 4.2 e 7.1 — nova política de privacidade LGPD.' },
  ],
  'doc-002': [
    { data: '2025-03-10T14:30:00Z', autor: 'Daniel Oliveira', tipo: 'publicacao',      descricao: 'Documento publicado e enviado para 148 destinatários.' },
    { data: '2025-08-01T09:15:00Z', autor: 'Eduarda Lima',    tipo: 'nova_versao',     descricao: 'Nova versão V2 criada. Inclusão de seção sobre segurança em nuvem (AWS/Azure).' },
    { data: '2026-03-14T07:59:00Z', autor: 'Sistema',         tipo: 'encerramento',   descricao: 'Vigência encerrada automaticamente. Documento movido para Concluídos.' },
  ],
  'doc-003': [
    { data: '2025-01-08T11:00:00Z', autor: 'Felipe Rocha',  tipo: 'publicacao',        descricao: 'Documento publicado e enviado para 38 destinatários.' },
    { data: '2025-03-20T16:45:00Z', autor: 'Felipe Rocha',  tipo: 'edicao_metadata',   descricao: 'Classificação adicionada: "Procedimentos".' },
  ],
  'doc-004': [
    { data: '2025-02-01T10:00:00Z', autor: 'Gabriela Souza', tipo: 'publicacao',       descricao: 'Documento publicado e enviado para 12 destinatários específicos.' },
  ],
  'doc-005': [
    { data: '2025-10-15T10:00:00Z', autor: 'Henrique Alves',  tipo: 'publicacao',      descricao: 'Documento publicado e enviado para 20 destinatários.' },
    { data: '2025-12-16T08:01:00Z', autor: 'Sistema',         tipo: 'encerramento',    descricao: 'Vigência encerrada automaticamente. Documento movido para Concluídos.' },
  ],
  'doc-006': [
    { data: '2025-03-20T16:00:00Z', autor: 'Isabela Ferreira', tipo: 'publicacao',     descricao: 'Documento criado e agendado para envio em 15/04/2026.' },
  ],
  'doc-007': [
    { data: '2025-03-28T10:00:00Z', autor: 'João Pedro', tipo: 'publicacao',           descricao: 'Documento criado e agendado para envio em 20/04/2026.' },
  ],
  'doc-008': [
    { data: '2025-02-14T09:00:00Z', autor: 'Karina Matos', tipo: 'publicacao',         descricao: 'Comunicado publicado e enviado para 148 destinatários.' },
    { data: '2025-02-20T11:30:00Z', autor: 'Karina Matos', tipo: 'destinatarios',      descricao: '8 destinatários adicionados para cobrir novos contratos.' },
  ],
}

/* ── Helper: ícone e cor por tipo de ação ───────────────────── */
function historicoConfig(tipo: HistoricoTipo): { color: string; icon: React.ReactNode; label: string } {
  switch (tipo) {
    case 'publicacao':      return { color: '#52c41a', icon: <CheckCircleOutlined />,  label: 'Publicação'        }
    case 'edicao_metadata': return { color: '#1677ff', icon: <FileTextOutlined />,     label: 'Edição de metadados' }
    case 'nova_versao':     return { color: '#722ed1', icon: <HistoryOutlined />,      label: 'Nova versão'       }
    case 'inativacao':      return { color: '#ff4d4f', icon: <StopOutlined />,         label: 'Inativação'        }
    case 'encerramento':    return { color: '#8C8C8C', icon: <AuditOutlined />,        label: 'Encerramento'      }
    case 'destinatarios':   return { color: '#fa8c16', icon: <TeamOutlined />,         label: 'Destinatários'     }
    default:                return { color: '#8C8C8C', icon: <SwapOutlined />,         label: 'Ação'              }
  }
}

function fmtData(iso: string) {
  return dayjs(iso).format('DD/MM/YYYY')
}

/* ══ Aba: Histórico de versões (resumo textual da mudança) ══ */
function VersoesTab({ docId }: { docId: string | null }) {
  const versoes = docId ? [...(VERSION_HISTORY[docId] ?? [])].reverse() : []
  const primary = colorTokens.primary

  if (versoes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <HistoryOutlined style={{ fontSize: 34, color: '#BFBFBF', marginBottom: 10, display: 'block' }} />
        <Typography.Text style={{ fontFamily: FONT, color: colorTokens.textSecondary, fontSize: 13 }}>Nenhuma versão registrada.</Typography.Text>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#EEF2FF', border: `1px solid ${primary}22`, borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
        <InfoCircleOutlined style={{ color: primary, fontSize: 14, marginTop: 2, flexShrink: 0 }} />
        <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, lineHeight: '18px' }}>
          Cada versão registra um <strong style={{ color: colorTokens.textPrimary }}>resumo da mudança</strong>. Ajustes menores incrementam a versão; um novo ciclo de aprovação gera uma versão maior.
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {versoes.map((v, idx) => {
          const isCurrent = idx === 0
          return (
            <div key={v.versao} style={{ border: `1px solid ${isCurrent ? primary + '55' : '#EBEBEB'}`, borderRadius: 10, padding: '14px 16px', background: isCurrent ? primary + '08' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: isCurrent ? primary : '#F0F0F0', color: isCurrent ? '#fff' : colorTokens.textSecondary, fontFamily: FONT, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{v.versao}</span>
                <Typography.Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary }}>{v.versao}</Typography.Text>
                {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, background: primary + '1A', color: primary, border: `1px solid ${primary}55`, borderRadius: 4, padding: '1px 7px', fontFamily: FONT }}>Versão atual</span>}
                <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, marginLeft: 'auto' }}>{fmtData(v.data)}</Typography.Text>
              </div>
              <Typography.Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, display: 'block', marginBottom: 10 }}>
                <UserOutlined style={{ marginRight: 5 }} />{v.responsavel} — {v.depto}
              </Typography.Text>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: colorTokens.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Resumo da mudança</div>
                <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, lineHeight: '20px' }}>{v.motivo}</Typography.Text>
              </div>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => message.success(`Download do arquivo da ${v.versao} iniciado.`)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderColor: primary, color: primary, borderRadius: 6 }}>Baixar {v.versao}</Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══ Aba: Histórico de ações (auditoria) ══ */
function AcoesTab({ docId }: { docId: string | null }) {
  const historico = docId ? [...(HISTORICO_GERAL[docId] ?? [])].reverse() : []

  if (historico.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <AuditOutlined style={{ fontSize: 34, color: '#BFBFBF', marginBottom: 10, display: 'block' }} />
        <Typography.Text style={{ fontFamily: FONT, color: colorTokens.textSecondary, fontSize: 13 }}>Nenhuma ação registrada.</Typography.Text>
      </div>
    )
  }

  return (
    <Timeline
      style={{ paddingTop: 8 }}
      items={historico.map((h) => {
        const cfg = historicoConfig(h.tipo)
        return {
          color: cfg.color,
          dot: (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: cfg.color + '18', border: `1.5px solid ${cfg.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: cfg.color, fontSize: 12 }}>{cfg.icon}</span>
            </div>
          ),
          children: (
            <div style={{ paddingBottom: 16, paddingLeft: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <Badge count={cfg.label} style={{ backgroundColor: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}44`, fontFamily: FONT, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '0 7px', boxShadow: 'none' }} />
                <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                  {dayjs(h.data).format('DD/MM/YYYY [às] HH:mm')}
                </Typography.Text>
              </div>
              <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary, display: 'block', lineHeight: '20px', marginBottom: 4 }}>
                {h.descricao}
              </Typography.Text>
              <Typography.Text style={{ fontFamily: FONT, fontSize: 11, color: colorTokens.textSecondary }}>
                <UserOutlined style={{ marginRight: 4 }} />{h.autor}
              </Typography.Text>
            </div>
          ),
        }
      })}
    />
  )
}

interface HistoricoDrawerProps {
  open: boolean
  onClose: () => void
  docId: string | null
}

export function HistoricoDrawer({ open, onClose, docId }: HistoricoDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <HistoryOutlined style={{ color: colorTokens.primary }} />
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 15 }}>Histórico do documento</span>
        </Space>
      }
      width={480}
      styles={{ header: { padding: '18px 24px 0' }, body: { padding: '0 24px 24px' } }}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey="versoes"
        items={[
          { key: 'versoes', label: 'Histórico de versões', children: <VersoesTab docId={docId} /> },
          { key: 'acoes',   label: 'Histórico de ações',   children: <AcoesTab docId={docId} /> },
        ]}
      />
    </Drawer>
  )
}
