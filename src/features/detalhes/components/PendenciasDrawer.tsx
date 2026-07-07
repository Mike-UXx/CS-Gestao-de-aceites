/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/components/PendenciasDrawer.tsx
   Drawer "Relatório de aceites" — acompanhamento de signatários
   (Pendentes / Concluídos) + exportação. Layout conforme EP03 (DS CS):
   grupos colapsáveis por departamento, avatares coloridos, rodapé fixo.
   Compartilhado entre DetalhesPage e ListagemPage.
───────────────────────────────────────────────────────────── */
import { useState, useEffect } from 'react'
import { Typography, Button, Drawer, Avatar, Spin, message, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  CheckCircleOutlined, TeamOutlined, DownOutlined,
  DownloadOutlined, FilePdfOutlined, FileExcelOutlined,
} from '@ant-design/icons'
import { colorTokens } from '@/theme/tokens'
import type { Documento } from '@/features/listagem/types/documento'
import { buildSignatarios } from '../utils/signatarios'
import { exportarRelatorioCSV, exportarRelatorioPDF } from '../utils/exportRelatorio'

const FONT = "'Montserrat', sans-serif"

/* Paleta de avatar (cores do DS/AntD) — atribuída de forma determinística. */
const AVATAR_COLORS = [
  '#EB2F96', '#52C41A', '#13C2C2', '#FA8C16', '#722ED1', '#2F54EB',
  '#F5222D', '#1677FF', '#08979C', '#389E0D', '#D4380D', '#9254DE',
]
function avatarColor(nome: string): string {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
/** Iniciais de 2 letras (primeiro + último nome). */
function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase()
}

/* Agrupa por departamento, ordenando por quantidade (desc). */
function groupByDepto<T extends { departamento?: string }>(items: T[], porDepto: boolean): [string, T[]][] {
  if (!porDepto) return items.length ? [['Destinatários', items]] : []
  const map = new Map<string, T[]>()
  for (const it of items) {
    const d = it.departamento ?? 'Sem departamento'
    if (!map.has(d)) map.set(d, [])
    map.get(d)!.push(it)
  }
  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
}

/* Linha de signatário: avatar colorido + nome (+ evidência à direita). */
function SignatarioRow({ nome, right }: { nome: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '10px 14px', borderTop: '1px solid #F0F0F0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar size={32} style={{ background: avatarColor(nome), color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {initials(nome)}
        </Avatar>
        <Typography.Text style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, fontWeight: 500 }} ellipsis>
          {nome}
        </Typography.Text>
      </div>
      {right}
    </div>
  )
}

/* Grupo colapsável por departamento (card com header, pill e "Ver mais"). */
type Tone = 'pendente' | 'concluido'
function DeptGroup({
  nome, count, tone, defaultOpen, children,
}: { nome: string; count: number; tone: Tone; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const pill = tone === 'concluido'
    ? { bg: '#F6FFED', border: '#B7EB8F', color: '#389E0D' }
    : { bg: '#FFF7E6', border: '#FFD591', color: '#D46B08' }
  return (
    <div style={{
      border: `1px solid ${open ? '#C3CAF5' : '#EBEBEB'}`, borderRadius: 8,
      marginBottom: 12, overflow: 'hidden', background: '#fff',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        <Typography.Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary }}>
          {nome}
        </Typography.Text>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 700,
            background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`,
            borderRadius: 12, padding: '2px 10px', whiteSpace: 'nowrap',
          }}>
            {count} {count === 1 ? 'Colaborador' : 'Colaboradores'}
          </span>
          <DownOutlined style={{ fontSize: 12, color: '#8C8C8C', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

/* Lista de um grupo com "Ver mais" (mostra os primeiros N; expande o resto). */
function GroupItems<T extends { nome: string }>({ items, render }: { items: T[]; render: (it: T) => React.ReactNode }) {
  const LIMIT = 8
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, LIMIT)
  return (
    <>
      {visible.map((it) => <div key={it.nome}>{render(it)}</div>)}
      {items.length > LIMIT && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            width: '100%', padding: '10px', background: 'transparent', border: 'none', borderTop: '1px solid #F0F0F0',
            cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          Ver mais <DownOutlined style={{ fontSize: 11 }} />
        </button>
      )}
    </>
  )
}

interface PendenciasDrawerProps {
  open: boolean
  onClose: () => void
  doc: Documento | null
}

export function PendenciasDrawer({ open, onClose, doc }: PendenciasDrawerProps) {
  const [tab, setTab] = useState<'pendentes' | 'concluidos'>('pendentes')
  const [loading, setLoading] = useState(false)

  const signatarios = doc ? buildSignatarios(doc) : []
  const porDepto = doc?.modalidadeEnvio === 'departamento'
  const pendentesSig = signatarios.filter((s) => s.situacao === 'Pendente')
  const concluidosSig = signatarios
    .filter((s) => s.situacao === 'Concluído')
    .map((s) => ({ nome: s.nome, data: s.dataAceite ?? '—', departamento: s.departamento }))

  /* Abre em "Concluídos" quando não há pendentes; simula carregamento. */
  useEffect(() => {
    if (!open || !doc) return
    setTab(pendentesSig.length === 0 ? 'concluidos' : 'pendentes')
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc?.id])

  if (!doc) return <Drawer open={open} onClose={onClose} width={480} destroyOnHidden />

  /* Exportação (PDF / Excel). */
  function handleExportPDF() {
    const ok = exportarRelatorioPDF(doc!)
    if (ok) message.success('Abrindo o relatório para impressão/PDF.')
    else message.warning('Permita pop-ups neste site para gerar o PDF.')
  }
  function handleExportCSV() {
    exportarRelatorioCSV(doc!)
    message.success('Relatório de auditoria (Excel/CSV) gerado.')
  }
  const exportItems: MenuProps['items'] = [
    { key: 'pdf', icon: <FilePdfOutlined style={{ color: '#FF4D4F' }} />, label: 'Exportar como PDF', onClick: handleExportPDF },
    { key: 'excel', icon: <FileExcelOutlined style={{ color: '#52c41a' }} />, label: 'Exportar como Excel', onClick: handleExportCSV },
  ]

  /* ── Aba de tabs (rótulo + contador colorido) ── */
  const TabButton = ({ id, label, count, tone }: { id: 'pendentes' | 'concluidos'; label: string; count: number; tone: Tone }) => {
    const active = tab === id
    const c = tone === 'concluido'
      ? { bg: '#F6FFED', border: '#B7EB8F', color: '#389E0D' }
      : { bg: '#FFF7E6', border: '#FFD591', color: '#D46B08' }
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 2px', marginRight: 24,
          background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? colorTokens.primary : 'transparent'}`,
          cursor: 'pointer', fontFamily: FONT, fontSize: 14, fontWeight: active ? 600 : 500,
          color: active ? colorTokens.primary : colorTokens.textSecondary,
        }}
      >
        {label}
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color,
          border: `1px solid ${c.border}`, borderRadius: 12, padding: '1px 8px',
        }}>
          {count}
        </span>
      </button>
    )
  }

  const emptyState = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      {icon}
      <Typography.Text strong style={{ fontFamily: FONT, fontSize: 14, color: colorTokens.textPrimary, display: 'block', marginTop: 16, marginBottom: 6 }}>
        {title}
      </Typography.Text>
      <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, lineHeight: '20px' }}>
        {subtitle}
      </Typography.Text>
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={480}
      title={
        <div>
          <Typography.Text strong style={{ fontFamily: FONT, fontSize: 18, color: colorTokens.primary, display: 'block' }}>
            Relatório de aceites
          </Typography.Text>
          <Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, fontWeight: 400 }}>
            Acompanhe o status dos aceites e exporte o relatório
          </Typography.Text>
        </div>
      }
      styles={{
        header: { padding: '20px 24px', borderBottom: '1px solid #F0F0F0', alignItems: 'flex-start' },
        body: { padding: '16px 24px', background: '#FAFAFA' },
        footer: { padding: '12px 24px' },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onClose} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40, minWidth: 96 }}>
            Voltar
          </Button>
          <Dropdown menu={{ items: exportItems }} trigger={['click']} placement="topRight">
            <Button type="primary" icon={<DownloadOutlined />} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40, background: colorTokens.primary, borderColor: colorTokens.primary }}>
              Exportar relatório
            </Button>
          </Dropdown>
        </div>
      }
      destroyOnHidden
    >
      <Spin spinning={loading} style={{ minHeight: 200 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EBEBEB', marginBottom: 16 }}>
          <TabButton id="pendentes" label="Pendentes" count={pendentesSig.length} tone="pendente" />
          <TabButton id="concluidos" label="Concluídos" count={concluidosSig.length} tone="concluido" />
        </div>

        {/* Conteúdo por aba */}
        {tab === 'pendentes' ? (
          pendentesSig.length === 0 ? (
            emptyState(
              <CheckCircleOutlined style={{ fontSize: 44, color: '#52c41a' }} />,
              'Tudo em dia!',
              'Todos os destinatários já concluíram este documento.',
            )
          ) : (
            groupByDepto(pendentesSig, porDepto).map(([dept, items], i) => (
              <DeptGroup key={dept} nome={dept} count={items.length} tone="pendente" defaultOpen={i === 0}>
                <GroupItems items={items} render={(it) => <SignatarioRow nome={it.nome} />} />
              </DeptGroup>
            ))
          )
        ) : (
          concluidosSig.length === 0 ? (
            emptyState(
              <TeamOutlined style={{ fontSize: 40, color: '#BFBFBF' }} />,
              'Nenhum aceite ainda',
              'Assim que houver aceites, eles aparecem aqui.',
            )
          ) : (
            groupByDepto(concluidosSig, porDepto).map(([dept, items], i) => (
              <DeptGroup key={dept} nome={dept} count={items.length} tone="concluido" defaultOpen={i === 0}>
                <GroupItems
                  items={items}
                  render={(it) => (
                    <SignatarioRow
                      nome={it.nome}
                      right={<Typography.Text style={{ fontFamily: FONT, fontSize: 13, color: '#8C8C8C', whiteSpace: 'nowrap', flexShrink: 0 }}>Concluído em {it.data}</Typography.Text>}
                    />
                  )}
                />
              </DeptGroup>
            ))
          )
        )}
      </Spin>
    </Drawer>
  )
}
