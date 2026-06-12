import { useState, useCallback, useRef } from 'react'
import {
  Typography, Switch, Table, Space,
  Tooltip, Modal, Divider, Select, Radio, Button,
  Checkbox, InputNumber,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  InfoCircleOutlined, ThunderboltOutlined, MailOutlined, WhatsAppOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import { DEPARTAMENTOS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography
const FONT = "'Montserrat', sans-serif"

/* ─── Opções ─────────────────────────────────────────────────── */
const TEMPO_OPTIONS = [
  { value: 0,   label: 'Sem trava'   },
  { value: 60,  label: '1 minuto'    },
  { value: 120, label: '2 minutos'   },
  { value: 180, label: '3 minutos'   },
  { value: 300, label: '5 minutos'   },
  { value: 600, label: '10 minutos'  },
]

const RENOVACAO_OPTIONS = [
  { value: '6_meses',       label: 'A cada 6 meses'   },
  { value: '12_meses',      label: 'A cada 12 meses'  },
  { value: '24_meses',      label: 'A cada 24 meses'  },
  { value: 'personalizado', label: 'Personalizado…'   },
]

/* ─── Tipo da linha da tabela ────────────────────────────────── */
interface DeptRow {
  key: string
  nome: string
  scrollObrigatorio: boolean
  tempoLeitura: number
}

/* ─── Label auxiliar ─────────────────────────────────────────── */
function FieldLabel({
  label, required, tooltip,
}: { label: string; required?: boolean; tooltip?: string }) {
  return (
    <Space size={4} align="center">
      <Text style={{ fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500, fontFamily: FONT }}>
        {label}
        {required && <span style={{ color: colorTokens.error, marginLeft: 2 }}>*</span>}
      </Text>
      {tooltip && (
        <Tooltip title={tooltip} overlayStyle={{ maxWidth: 280 }}>
          <InfoCircleOutlined style={{ color: '#BFBFBF', fontSize: 13, cursor: 'pointer' }} />
        </Tooltip>
      )}
    </Space>
  )
}

/* ─── Divisor de seção ────────────────────────────────────────── */
function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <Divider style={{ margin: '0 0 20px' }} />
      <Text strong style={{
        display: 'block', fontSize: 14, color: colorTokens.textPrimary,
        fontFamily: FONT, marginBottom: subtitle ? 4 : 16,
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{
          display: 'block', fontSize: 13, color: colorTokens.textSecondary,
          fontFamily: FONT, marginBottom: 16,
        }}>
          {subtitle}
        </Text>
      )}
    </>
  )
}

/* ─── Card de garantia de leitura ────────────────────────────── */
function ReadingGuardCard({
  title, description, active, right,
}: {
  title: string
  description: string
  active: boolean
  right: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '16px 20px', borderRadius: 8,
      border: `1px solid ${active ? colorTokens.primary : '#D9D9D9'}`,
      background: active ? '#EEF2FF' : '#FFFFFF',
      transition: 'all 0.25s ease',
    }}>
      <div>
        <Text strong style={{
          display: 'block', fontSize: 13, fontFamily: FONT,
          color: active ? colorTokens.primary : colorTokens.textPrimary,
          transition: 'color 0.25s ease',
        }}>
          {title}
        </Text>
        <Text style={{
          display: 'block', fontSize: 12, fontFamily: FONT,
          color: active ? colorTokens.primary : colorTokens.textSecondary,
          transition: 'color 0.25s ease', marginTop: 2,
        }}>
          {description}
        </Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {right}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export function RegrasStep() {
  const navigate = useNavigate()
  const tableRef = useRef<HTMLDivElement>(null)
  const { data, dispatch, saveDraft } = useDocumentForm()

  const [showCancel, setShowCancel] = useState(false)

  /* ── Aceite ── */
  const [exigeAceite, setExigeAceite] = useState<boolean>(data.exigeAceite ?? false)

  /* ── Canais de notificação ── */
  const [canalEmail] = useState<boolean>(data.canalEmail ?? true)
  const [canalWhatsapp, setCanalWhatsapp] = useState<boolean>(data.canalWhatsapp ?? false)

  /* ── Frequência de Renovação ── */
  const [renovacaoAtiva,  setRenovacaoAtiva]  = useState<boolean>(data.renovacaoAtiva ?? false)
  const [renovacao,       setRenovacao]       = useState<string>(data.renovacaoAceite ?? '12_meses')
  const [renovacaoMeses,  setRenovacaoMeses]  = useState<number>(data.renovacaoMesesPersonalizado || 6)

  /* ── Tempo de leitura ── */
  const savedTempo = data.tempoLeituraGlobal ?? 0
  const [tempoEnabled, setTempoEnabled] = useState(savedTempo > 0)
  const [tempoValue,   setTempoValue]   = useState(savedTempo > 0 ? savedTempo : 120)

  /* ── Scroll obrigatório ── */
  const [scrollObrigatorio, setScrollObrigatorio] = useState<boolean>(data.scrollObrigatorioGlobal ?? false)

  /* ── Personalização por departamento ── */
  const isByDept      = data.modalidadeEnvio === 'departamento'
  const selectedDepts = data.departamentos ?? []
  const [personalizarPorDept, setPersonalizarPorDept] = useState<boolean>(data.personalizarPorDept ?? false)

  /* ── Linhas da tabela ── */
  function buildDeptRows(tempo: number, scroll: boolean): DeptRow[] {
    return selectedDepts.map((val) => ({
      key: val,
      nome: DEPARTAMENTOS.find((d) => d.value === val)?.label ?? val,
      scrollObrigatorio: scroll,
      tempoLeitura: tempo,
    }))
  }

  const [deptRows, setDeptRows] = useState<DeptRow[]>(() => {
    const saved = data.deptConfig
    if (saved && Object.keys(saved).length > 0) {
      return selectedDepts.map((val) => ({
        key: val,
        nome: DEPARTAMENTOS.find((d) => d.value === val)?.label ?? val,
        scrollObrigatorio: saved[val]?.scrollObrigatorio ?? false,
        tempoLeitura: saved[val]?.tempoLeitura ?? 0,
      }))
    }
    return buildDeptRows(savedTempo, data.scrollObrigatorioGlobal ?? false)
  })

  const effectiveTempo = tempoEnabled ? tempoValue : 0

  const hasCustomizations = deptRows.some(
    (r) => r.scrollObrigatorio !== scrollObrigatorio || r.tempoLeitura !== effectiveTempo
  )

  /* ── Sincronizar mudança global com tabela ── */
  const applyGlobalChange = useCallback((newTempo: number, newScroll: boolean, field: 'tempo' | 'scroll') => {
    if (personalizarPorDept && hasCustomizations) {
      Modal.confirm({
        title: 'Aplicar aos departamentos?',
        content: `Você alterou "${field === 'tempo' ? 'Tempo de leitura' : 'Scroll obrigatório'}". Deseja sobrescrever as configurações individuais?`,
        okText: 'Sim, sobrescrever',
        cancelText: 'Manter individuais',
        okButtonProps: { style: { background: colorTokens.primary, borderColor: colorTokens.primary } },
        onOk: () => setDeptRows(buildDeptRows(newTempo, newScroll)),
      })
    } else if (personalizarPorDept) {
      setDeptRows(buildDeptRows(newTempo, newScroll))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalizarPorDept, hasCustomizations, selectedDepts, scrollObrigatorio, effectiveTempo])

  function handleScrollChange(checked: boolean) {
    setScrollObrigatorio(checked)
    applyGlobalChange(effectiveTempo, checked, 'scroll')
  }

  function handleTempoEnabledChange(checked: boolean) {
    setTempoEnabled(checked)
    const newTempo = checked ? tempoValue : 0
    applyGlobalChange(newTempo, scrollObrigatorio, 'tempo')
  }

  function handleTempoValueChange(val: number) {
    setTempoValue(val)
    if (tempoEnabled) applyGlobalChange(val, scrollObrigatorio, 'tempo')
  }

  function togglePersonalizar(checked: boolean) {
    setPersonalizarPorDept(checked)
    if (checked) {
      setDeptRows(buildDeptRows(effectiveTempo, scrollObrigatorio))
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    }
  }

  function updateDeptRow(key: string, field: 'scrollObrigatorio' | 'tempoLeitura', value: boolean | number) {
    setDeptRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r))
  }

  /* ── Ação em massa ── */
  function handleAplicarPadrao() {
    const tempoLabel = TEMPO_OPTIONS.find((o) => o.value === effectiveTempo)?.label ?? 'Sem trava'
    Modal.confirm({
      title: 'Aplicar padrão a todos?',
      content: (
        <div style={{ fontFamily: FONT }}>
          <p style={{ marginBottom: 8 }}>Todos os departamentos receberão:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>Tempo de leitura: <strong>{tempoLabel}</strong></li>
            <li>Scroll obrigatório: <strong>{scrollObrigatorio ? 'Sim' : 'Não'}</strong></li>
          </ul>
          <p style={{ marginTop: 8, marginBottom: 0, color: colorTokens.textSecondary, fontSize: 12 }}>
            As personalizações individuais serão sobrescritas.
          </p>
        </div>
      ),
      okText: 'Aplicar a todos',
      cancelText: 'Cancelar',
      okButtonProps: { style: { background: colorTokens.primary, borderColor: colorTokens.primary } },
      onOk: () => setDeptRows(buildDeptRows(effectiveTempo, scrollObrigatorio)),
    })
  }

  /* ── Colunas da tabela ── */
  const columns: ColumnsType<DeptRow> = [
    {
      title: <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>Departamento</Text>,
      dataIndex: 'nome',
      key: 'nome',
      render: (nome: string) => <Text style={{ fontSize: 13, fontFamily: FONT }}>{nome}</Text>,
    },
    {
      title: (
        <Space size={4}>
          <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>Tempo de leitura</Text>
          <Tooltip title="Tempo mínimo antes de habilitar o aceite para este departamento.">
            <InfoCircleOutlined style={{ color: '#BFBFBF', fontSize: 12 }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'tempoLeitura',
      key: 'tempoLeitura',
      width: 196,
      render: (val: number, row: DeptRow) => (
        <Select
          value={val}
          onChange={(v) => updateDeptRow(row.key, 'tempoLeitura', v)}
          options={TEMPO_OPTIONS}
          style={{ width: 150, fontFamily: FONT }}
          size="small"
        />
      ),
    },
    {
      title: (
        <Space size={4}>
          <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>Scroll obrigatório</Text>
          <Tooltip title="Obriga o colaborador a rolar o documento até o final antes de aceitar.">
            <InfoCircleOutlined style={{ color: '#BFBFBF', fontSize: 12 }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'scrollObrigatorio',
      key: 'scrollObrigatorio',
      width: 160,
      align: 'right' as const,
      render: (val: boolean, row: DeptRow) => (
        <Switch
          checked={val}
          onChange={(v) => updateDeptRow(row.key, 'scrollObrigatorio', v)}
          size="small"
          style={{ background: val ? colorTokens.primary : undefined }}
        />
      ),
    },
  ]

  /* ── Avançar ── */
  function handleNext() {
    const deptConfig = Object.fromEntries(
      deptRows.map((r) => [r.key, { scrollObrigatorio: r.scrollObrigatorio, tempoLeitura: r.tempoLeitura }])
    )
    const renovacaoAceiteVal  = exigeAceite && renovacaoAtiva ? renovacao : 'sem_recorrencia'
    const renovacaoMesesVal   = renovacaoAceiteVal === 'personalizado' ? renovacaoMeses : 0

    dispatch({
      type: 'SET_STEP',
      config: {
        exigeAceite,
        renovacaoAtiva:              exigeAceite ? renovacaoAtiva : false,
        renovacaoAceite:             renovacaoAceiteVal,
        renovacaoMesesPersonalizado: renovacaoMesesVal,
        tempoLeituraGlobal:          exigeAceite ? effectiveTempo : 0,
        scrollObrigatorioGlobal:     exigeAceite ? scrollObrigatorio : false,
        personalizarPorDept:         exigeAceite ? personalizarPorDept : false,
        deptConfig:                  exigeAceite ? deptConfig : {},
        canalEmail,
        canalWhatsapp,
      },
    })
    navigate('/documentos/criar/revisao')
  }

  /* ─── JSX ─────────────────────────────────────────────────────── */
  return (
    <StepPageLayout
      currentStep={2}
      onHeaderBack={() => navigate('/documentos')}
      onBack={() => navigate('/documentos/criar/destinatarios')}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(2); navigate('/documentos', { state: { draftSaved: true } }) }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '100%' }}>

        {/* ── Cabeçalho do card ── */}
        <Text strong style={{ display: 'block', fontSize: 15, color: colorTokens.textPrimary, fontFamily: FONT, marginBottom: 2 }}>
          Regras e envio
        </Text>
        <Text style={{ display: 'block', fontSize: 13, color: colorTokens.textSecondary, fontFamily: FONT, marginBottom: 28 }}>
          Configure as regras de aceite e os mecanismos de garantia de leitura.
        </Text>

        {/* ══ 1. ACEITE ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel
            label="Exigir aceite formal do colaborador?"
            tooltip="Quando ativado, os destinatários precisarão confirmar a leitura do documento."
          />
          <div style={{ marginTop: 8 }}>
            <Radio.Group
              value={exigeAceite ? 'sim' : 'nao'}
              onChange={(e) => {
                const val = e.target.value === 'sim'
                setExigeAceite(val)
                if (!val) setRenovacaoAtiva(false)
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="sim">Sim</Radio.Button>
              <Radio.Button value="nao">Não</Radio.Button>
            </Radio.Group>
          </div>
          {!exigeAceite && (
            <Text style={{
              display: 'block', fontSize: 12, color: colorTokens.textSecondary,
              fontFamily: FONT, marginTop: 8,
            }}>
              Este documento ficará disponível apenas para consulta, sem gerar pendência de assinatura.
            </Text>
          )}
        </div>

        {/* ══ CANAIS DE NOTIFICAÇÃO ══════════════════════════════════ */}
        <SectionDivider
          title="Canais de notificação"
          subtitle="Defina como os destinatários serão avisados sobre este documento."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <Checkbox
            checked={canalEmail}
            disabled
            style={{ fontFamily: FONT, alignItems: 'flex-start' }}
          >
            <div>
              <Space size={4}>
                <MailOutlined style={{ color: colorTokens.primary }} />
                <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 500, color: colorTokens.textPrimary }}>
                  E-mail
                </Text>
              </Space>
              <Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
                Canal oficial de notificação e registro de evidências. Sempre habilitado.
              </Text>
            </div>
          </Checkbox>

          <Checkbox
            checked={canalWhatsapp}
            onChange={(e) => setCanalWhatsapp(e.target.checked)}
            style={{ fontFamily: FONT, alignItems: 'flex-start' }}
          >
            <div>
              <Space size={4}>
                <WhatsAppOutlined style={{ color: '#25D366' }} />
                <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 500, color: colorTokens.textPrimary }}>
                  WhatsApp
                </Text>
                <Tooltip
                  title="Funcionalidade simulada — em produção dependerá do telefone cadastrado do colaborador."
                  overlayStyle={{ maxWidth: 280 }}
                >
                  <InfoCircleOutlined style={{ color: '#BFBFBF', fontSize: 13, cursor: 'pointer' }} />
                </Tooltip>
              </Space>
              <Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
                Envia um lembrete complementar via WhatsApp.
              </Text>
            </div>
          </Checkbox>
        </div>

        {/* ══ 2. FREQUÊNCIA DE RENOVAÇÃO — só exibe quando aceite = Sim ══ */}
        {exigeAceite && (
          <div style={{ marginBottom: 24 }}>
            <Checkbox
              checked={renovacaoAtiva}
              onChange={(e) => setRenovacaoAtiva(e.target.checked)}
              style={{ fontFamily: FONT, alignItems: 'flex-start' }}
            >
              <div>
                <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 500, color: colorTokens.textPrimary, display: 'block' }}>
                  Frequência de Renovação
                </Text>
                <Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
                  O colaborador precisará reaceitar este documento após o período definido.
                </Text>
              </div>
            </Checkbox>

            {renovacaoAtiva && (
              <div style={{ marginTop: 12, marginLeft: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Select
                  value={renovacao}
                  onChange={setRenovacao}
                  options={RENOVACAO_OPTIONS}
                  style={{ width: 200, fontFamily: FONT }}
                  placeholder="Selecione o período"
                />
                {renovacao === 'personalizado' && (
                  <>
                    <InputNumber
                      min={1}
                      max={120}
                      value={renovacaoMeses}
                      onChange={(v) => setRenovacaoMeses(v ?? 6)}
                      style={{ width: 90, fontFamily: FONT }}
                      placeholder="Nº"
                    />
                    <Text style={{ fontSize: 13, fontFamily: FONT, color: colorTokens.textSecondary }}>
                      meses
                    </Text>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ 3. MECANISMOS DE GARANTIA ════════════════════════════════ */}
        {exigeAceite && (
          <>
            <SectionDivider
              title="Mecanismos de garantia de leitura"
              subtitle="Configurações que asseguram que o colaborador leu o documento antes de aceitar."
            />

            {isByDept && selectedDepts.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 14,
              }}>
                <Space size={8}>
                  <Switch
                    checked={personalizarPorDept}
                    onChange={togglePersonalizar}
                    size="small"
                    style={{ background: personalizarPorDept ? colorTokens.primary : undefined }}
                  />
                  <Text style={{ fontSize: 13, fontFamily: FONT, color: colorTokens.textPrimary }}>
                    Personalizar por departamento
                  </Text>
                </Space>

                {personalizarPorDept && (
                  <Tooltip title="Sobrescreve configurações individuais com os valores globais">
                    <Button
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAplicarPadrao}
                      style={{
                        fontSize: 12, fontFamily: FONT,
                        color: colorTokens.primary, borderColor: colorTokens.primary,
                        background: '#EEF2FF', borderRadius: 6,
                      }}
                    >
                      Aplicar padrão a todos
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}

            {!personalizarPorDept && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ReadingGuardCard
                  title="Tempo de leitura"
                  description="O aceite só será possível após atingimento do tempo mínimo de leitura"
                  active={tempoEnabled}
                  right={
                    <>
                      <Select
                        value={tempoEnabled ? tempoValue : 0}
                        onChange={handleTempoValueChange}
                        options={TEMPO_OPTIONS}
                        disabled={!tempoEnabled}
                        style={{ width: 130, fontFamily: FONT }}
                        size="small"
                      />
                      <Switch
                        checked={tempoEnabled}
                        onChange={handleTempoEnabledChange}
                        size="small"
                        style={{ background: tempoEnabled ? colorTokens.primary : undefined }}
                      />
                    </>
                  }
                />
                <ReadingGuardCard
                  title={scrollObrigatorio ? 'Scroll obrigatório até o fim (ativado)' : 'Scroll obrigatório até o fim'}
                  description="O botão de aceite só será habilitado após rolagem de todo o documento"
                  active={scrollObrigatorio}
                  right={
                    <Switch
                      checked={scrollObrigatorio}
                      onChange={handleScrollChange}
                      size="small"
                      style={{ background: scrollObrigatorio ? colorTokens.primary : undefined }}
                    />
                  }
                />
              </div>
            )}

            {isByDept && selectedDepts.length > 0 && personalizarPorDept && (
              <div ref={tableRef} style={{ marginTop: 4 }}>
                <Table<DeptRow>
                  dataSource={deptRows}
                  columns={columns}
                  rowKey="key"
                  size="middle"
                  bordered={false}
                  sticky
                  scroll={{ y: 240 }}
                  pagination={{
                    pageSize: 5,
                    size: 'small',
                    showSizeChanger: false,
                    showTotal: (total) => (
                      <Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary }}>
                        {total} departamento{total !== 1 ? 's' : ''}
                      </Text>
                    ),
                  }}
                  style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}
                  summary={() => (
                    <Table.Summary fixed="bottom">
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <Text style={{ fontSize: 11, color: colorTokens.textSecondary, fontFamily: FONT }}>
                            * Inicializados com os valores globais. Personalizações mantidas mesmo ao desligar o switch.
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>
            )}
          </>
        )}

      </div>

      <CancelModal
        open={showCancel}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
        onCancel={() => setShowCancel(false)}
      />
    </StepPageLayout>
  )
}
