/* ─────────────────────────────────────────────────────────────
   src/features/configuracoes/pages/ClassificacoesPage.tsx
   US 2.1 — Configurações > Classificações (Nova / Editar / Excluir)
   Classificações escopadas por gestão responsável. Tabela única no
   padrão da listagem de documentos, com a gestão como COLUNA (filtrável
   pelo cabeçalho) — sem segundo Select de empresa/gestão.
───────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Table, Button, Tag, Dropdown, Modal, Input, Select, ColorPicker,
  Space, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import {
  PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { MOCK_CLASSIFICACOES, USUARIO_GESTOES, type Classificacao } from '@/data/mockClassificacoes'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography
const FONT = "'Montserrat', sans-serif"
const COR_PADRAO = '#263072'

const GESTAO_MAP = Object.fromEntries(GESTOES_RESPONSAVEIS.map((g) => [g.value, g.label]))
const gestaoLabel = (v: string) => GESTAO_MAP[v] ?? v

/** Opções de gestão que o usuário pode usar (apenas as que ele acessa). */
const GESTAO_OPTIONS = GESTOES_RESPONSAVEIS
  .filter((g) => USUARIO_GESTOES.includes(g.value))
  .map((g) => ({ value: g.value, label: g.label }))

/* ── Tag colorida de classificação ──────────────────────────── */
function ClassifTag({ nome, cor }: { nome: string; cor: string }) {
  return (
    <Tag style={{
      fontFamily: FONT, fontSize: 12, fontWeight: 600, borderRadius: 6,
      padding: '2px 10px', margin: 0,
      color: cor, border: `1px solid ${cor}`, background: `${cor}14`,
    }}>
      {nome}
    </Tag>
  )
}

export function ClassificacoesPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<Classificacao[]>(
    () => MOCK_CLASSIFICACOES.filter((c) => USUARIO_GESTOES.includes(c.gestao)),
  )

  /* ── Modal de criar/editar ── */
  const [formOpen,   setFormOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Classificacao | null>(null)
  const [fNome,      setFNome]      = useState('')
  const [fDescricao, setFDescricao] = useState('')
  const [fGestao,    setFGestao]    = useState<string | undefined>(undefined)
  const [fCor,       setFCor]       = useState<string>(COR_PADRAO)

  /* ── Modal de excluir / migrar ── */
  const [deleteTarget, setDeleteTarget] = useState<Classificacao | null>(null)
  const [migrarPara,   setMigrarPara]   = useState<string | undefined>(undefined)

  function openCreate() {
    setEditTarget(null)
    setFNome(''); setFDescricao(''); setFGestao(undefined); setFCor(COR_PADRAO)
    setFormOpen(true)
  }

  function openEdit(item: Classificacao) {
    setEditTarget(item)
    setFNome(item.nome); setFDescricao(item.descricao); setFGestao(item.gestao); setFCor(item.cor)
    setFormOpen(true)
  }

  const formValido = !!fNome.trim() && !!fGestao
  // A gestão é imutável enquanto houver documentos vinculados (evita quebrar a
  // coerência Gestão→Classificação e deixar documentos com classificação de outra área).
  const gestaoBloqueada = !!editTarget && editTarget.documentos > 0

  function handleSave() {
    if (!formValido) return
    if (editTarget) {
      setItems((prev) => prev.map((c) => c.id === editTarget.id
        ? { ...c, nome: fNome.trim(), descricao: fDescricao.trim(), gestao: fGestao!, cor: fCor }
        : c))
      message.success('Classificação atualizada com sucesso.')
    } else {
      const nova: Classificacao = {
        id: `cl-${Date.now()}`,
        nome: fNome.trim(), descricao: fDescricao.trim(), gestao: fGestao!, cor: fCor, documentos: 0,
      }
      setItems((prev) => [...prev, nova])
      message.success('Classificação criada com sucesso.')
    }
    setFormOpen(false)
  }

  /* ── Alvos de migração: classificações da MESMA gestão ── */
  const migracaoOptions = useMemo(() => {
    if (!deleteTarget) return []
    return items
      .filter((c) => c.gestao === deleteTarget.gestao && c.id !== deleteTarget.id)
      .map((c) => ({ value: c.id, label: c.nome }))
  }, [deleteTarget, items])

  const precisaMigrar = !!deleteTarget && deleteTarget.documentos > 0
  const podeExcluir = !precisaMigrar || !!migrarPara

  function openDelete(item: Classificacao) {
    setDeleteTarget(item)
    setMigrarPara(undefined)
  }

  function handleDelete() {
    if (!deleteTarget || !podeExcluir) return
    setItems((prev) => {
      let next = prev
      if (precisaMigrar && migrarPara) {
        // transfere a contagem de documentos para a classificação de destino
        next = next.map((c) => c.id === migrarPara
          ? { ...c, documentos: c.documentos + deleteTarget.documentos }
          : c)
      }
      return next.filter((c) => c.id !== deleteTarget.id)
    })
    message.success(
      precisaMigrar
        ? `Classificação excluída e ${deleteTarget.documentos} documento(s) migrado(s) com sucesso.`
        : 'Classificação excluída com sucesso.',
    )
    setDeleteTarget(null)
  }

  /* ── Colunas (padrão da listagem de documentos) ── */
  const gestoesPresentes = Array.from(new Set(items.map((c) => c.gestao)))
  const columns: ColumnsType<Classificacao> = [
    {
      title: 'Classificação', key: 'nome', width: 200,
      sorter: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
      render: (_, r) => <ClassifTag nome={r.nome} cor={r.cor} />,
    },
    {
      title: 'Descrição', dataIndex: 'descricao', key: 'descricao',
      render: (d: string) => (
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>{d}</Text>
      ),
    },
    {
      title: 'Gestão responsável', key: 'gestao', width: 190,
      filters: gestoesPresentes.map((g) => ({ text: gestaoLabel(g), value: g })),
      onFilter: (value, r) => r.gestao === value,
      sorter: (a, b) => gestaoLabel(a.gestao).localeCompare(gestaoLabel(b.gestao), 'pt-BR'),
      render: (_, r) => (
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>
          {gestaoLabel(r.gestao)}
        </Text>
      ),
    },
    {
      title: 'Documentos', dataIndex: 'documentos', key: 'documentos', width: 130, align: 'center' as const,
      sorter: (a, b) => a.documentos - b.documentos,
      render: (n: number) => (
        <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.textPrimary }}>{n}</Text>
      ),
    },
    {
      title: '', key: 'acoes', width: 56, align: 'right' as const,
      render: (_, r) => {
        const menu: MenuProps['items'] = [
          { key: 'editar', icon: <EditOutlined />, label: 'Editar', onClick: () => openEdit(r) },
          { key: 'excluir', icon: <DeleteOutlined />, label: 'Excluir', danger: true, onClick: () => openDelete(r) },
        ]
        return (
          <Dropdown menu={{ items: menu }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined style={{ fontSize: 15 }} />} style={{
              width: 32, height: 32, color: colorTokens.textSecondary, borderRadius: 6,
            }} />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT }}>

      {/* ── Voltar ── */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/configuracoes')}
        style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.primary, padding: 0, marginBottom: 8 }}
      >
        Voltar
      </Button>

      {/* ── Cabeçalho ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Typography.Title level={2} style={{ fontFamily: FONT, color: colorTokens.primary, margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px' }}>
            Classificações
          </Typography.Title>
          <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            Organize os documentos por classificações para facilitar a gestão e análise.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{
          height: 40, fontWeight: 600, fontSize: 13, fontFamily: FONT,
          background: colorTokens.primary, borderColor: colorTokens.primary, borderRadius: 10,
        }}>
          Classificação
        </Button>
      </div>

      {/* ── Tabela ── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 8 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: 'Nenhuma classificação cadastrada.' }}
        />
      </div>

      {/* ══ Modal: Criar / Editar ══════════════════════════════════ */}
      <Modal
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        title={
          <Text strong style={{ fontFamily: FONT, fontSize: 16, color: colorTokens.textPrimary }}>
            {editTarget ? 'Editar classificação' : 'Criar classificação'}
          </Text>
        }
        footer={[
          <Button key="cancel" onClick={() => setFormOpen(false)} style={{ fontFamily: FONT, borderRadius: 8 }}>Cancelar</Button>,
          <Button key="ok" type="primary" disabled={!formValido} onClick={handleSave} style={{
            fontFamily: FONT, borderRadius: 8, background: formValido ? colorTokens.primary : undefined, borderColor: formValido ? colorTokens.primary : undefined,
          }}>
            {editTarget ? 'Salvar' : 'Criar'}
          </Button>,
        ]}
        width={440}
        destroyOnHidden
      >
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16 }}>
          Use classificações para organizar documentos e facilitar buscas e relatórios.
        </Text>

        <FieldLabel label="Nome da classificação" required />
        <Input
          value={fNome}
          onChange={(e) => setFNome(e.target.value)}
          maxLength={30}
          placeholder="Ex: Políticas, Procedimentos, Termos…"
          style={{ fontFamily: FONT, borderRadius: 8, marginBottom: 16 }}
        />

        <FieldLabel label="Gestão responsável" required />
        <Select
          value={fGestao}
          onChange={setFGestao}
          options={GESTAO_OPTIONS}
          placeholder="Selecione a gestão"
          disabled={gestaoBloqueada}
          style={{ width: '100%', fontFamily: FONT, marginBottom: gestaoBloqueada ? 6 : 16 }}
        />
        {gestaoBloqueada && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <ExclamationCircleFilled style={{ color: colorTokens.warning, fontSize: 13, marginTop: 2, flexShrink: 0 }} />
            <Text style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary, lineHeight: '17px' }}>
              Esta classificação tem <Text strong style={{ fontSize: 12 }}>{editTarget?.documentos}</Text> documento(s) vinculado(s),
              então a gestão não pode ser alterada. Para movê-la de área, crie uma nova classificação na gestão de destino e migre os documentos.
            </Text>
          </div>
        )}

        <FieldLabel label="Descrição" />
        <Input.TextArea
          value={fDescricao}
          onChange={(e) => setFDescricao(e.target.value)}
          rows={3}
          maxLength={100}
          showCount={{ formatter: ({ count, maxLength }) => `${count} / ${maxLength}` }}
          placeholder="Descreva o propósito desta classificação"
          style={{ fontFamily: FONT, borderRadius: 8, marginBottom: 16, resize: 'none' }}
        />

        <FieldLabel label="Cor de exibição" required />
        <Space size={10} align="center">
          <ColorPicker
            value={fCor}
            onChange={(_, hex) => setFCor(hex)}
            presets={[{
              label: 'Sugeridas',
              colors: ['#FA541C', '#FAAD14', '#A0D911', '#13C2C2', '#2F54EB', '#722ED1', '#EB2F96', '#263072'],
            }]}
          />
          <ClassifTag nome={fNome.trim() || 'Pré-visualização'} cor={fCor} />
        </Space>
      </Modal>

      {/* ══ Modal: Excluir / Migrar ════════════════════════════════ */}
      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        title={
          <Space size={8}>
            <ExclamationCircleFilled style={{ color: precisaMigrar ? colorTokens.warning : colorTokens.error }} />
            <Text strong style={{ fontFamily: FONT, fontSize: 16, color: colorTokens.textPrimary }}>
              {precisaMigrar ? 'Migrar documentos e excluir classificação' : 'Excluir classificação'}
            </Text>
          </Space>
        }
        footer={[
          <Button key="cancel" onClick={() => setDeleteTarget(null)} style={{ fontFamily: FONT, borderRadius: 8 }}>Cancelar</Button>,
          <Button key="ok" danger type="primary" disabled={!podeExcluir} onClick={handleDelete} style={{ fontFamily: FONT, borderRadius: 8 }}>
            {precisaMigrar ? 'Migrar e excluir' : 'Excluir'}
          </Button>,
        ]}
        width={460}
        destroyOnHidden
      >
        {precisaMigrar ? (
          <>
            <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16 }}>
              A classificação <Text strong>{deleteTarget?.nome}</Text> tem <Text strong>{deleteTarget?.documentos}</Text> documento(s)
              vinculado(s). Selecione uma nova classificação <Text strong>da mesma gestão ({gestaoLabel(deleteTarget?.gestao ?? '')})</Text> para
              esses documentos antes de excluir.
            </Text>
            <FieldLabel label="Nova classificação para os documentos afetados" required />
            {migracaoOptions.length === 0 ? (
              <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.error, display: 'block' }}>
                Não há outra classificação nesta gestão para receber os documentos. Crie uma antes de excluir.
              </Text>
            ) : (
              <Select
                value={migrarPara}
                onChange={setMigrarPara}
                options={migracaoOptions}
                placeholder="Selecione"
                style={{ width: '100%', fontFamily: FONT }}
              />
            )}
          </>
        ) : (
          <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
            A classificação <Text strong>{deleteTarget?.nome}</Text> será removida. As demais classificações vinculadas
            aos documentos não sofrerão alterações.
          </Text>
        )}
      </Modal>
    </div>
  )
}

/* ── Label de campo ─────────────────────────────────────────── */
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textPrimary, marginBottom: 6 }}>
      {label}{required && <span style={{ color: colorTokens.error, marginLeft: 2 }}>*</span>}
    </Text>
  )
}
