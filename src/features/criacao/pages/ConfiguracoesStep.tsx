import { useState, useCallback, useRef } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  Typography, Switch, Table, Space,
  Tooltip, Modal, message, Divider, DatePicker,
  ConfigProvider, Form, Select, Row, Col,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ptBR from 'antd/locale/pt_BR'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { RadioCard } from '@/features/criacao/components/RadioCard'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import { DEPARTAMENTOS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

const { Text } = Typography
const { RangePicker } = DatePicker
const FONT = "'Montserrat', sans-serif"

/* ─── Opções de tempo de leitura (em segundos) ───────────────── */
const TEMPO_OPTIONS = [
  { value: 0,   label: 'Sem trava'   },
  { value: 60,  label: '1 minuto'    },
  { value: 120, label: '2 minutos'   },
  { value: 180, label: '3 minutos'   },
  { value: 300, label: '5 minutos'   },
  { value: 600, label: '10 minutos'  },
]

const VALIDADE_OPTIONS = [
  { value: 'sem_validade', label: 'Sem validade' },
  { value: '3_meses',      label: '3 meses'      },
  { value: '6_meses',      label: '6 meses'      },
  { value: '12_meses',     label: '12 meses'     },
  { value: '24_meses',     label: '24 meses'     },
]

/* ─── Tipo da linha da tabela ────────────────────────────────── */
interface DeptRow {
  key: string
  nome: string
  scrollObrigatorio: boolean
  tempoLeitura: number   // valor em segundos (0 = sem trava)
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
  title, description, active, disabled, right,
}: {
  title: string
  description: string
  active: boolean
  disabled?: boolean
  right: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '16px 20px',
      borderRadius: 8,
      border: `1px solid ${active ? colorTokens.primary : '#D9D9D9'}`,
      background: active ? '#EEF2FF' : '#FFFFFF',
      transition: 'all 0.25s ease',
      opacity: disabled ? 0.45 : 1,
      pointerEvents: disabled ? 'none' : undefined,
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
export function ConfiguracoesStep() {
  const navigate    = useNavigate()
  const tableRef    = useRef<HTMLDivElement>(null)
  const { data, dispatch, saveDraft } = useDocumentForm()

  const [showCancel, setShowCancel] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  /* ── Tipo de documento ── */
  const [tipoDoc, setTipoDoc] = useState<'adesao' | 'ciencia'>(data.tipoDocumento ?? 'adesao')

  /* ── Vigência — RangePicker (só Adesão) ── */
  const [vigRange, setVigRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])

  /* ── Data de lançamento — comum ── */
  const [dataLancamento, setDataLancamento] = useState<Dayjs | null>(
    data.dataLancamento ? dayjs(data.dataLancamento) : null
  )

  /* ── Validade do aceite (só Adesão) ── */
  const [validadeAceite, setValidadeAceite] = useState<string>(data.validadeAceite ?? 'sem_validade')

  /* ── Tempo de leitura ──
     tempoEnabled = switch liga/desliga a trava
     tempoValue   = valor em segundos quando a trava está ligada  */
  const savedTempo = data.tempoLeituraGlobal ?? 0
  const [tempoEnabled, setTempoEnabled] = useState(savedTempo > 0)
  const [tempoValue,   setTempoValue]   = useState(savedTempo > 0 ? savedTempo : 120)

  /* ── Scroll obrigatório ── */
  const [scrollObrigatorio, setScrollObrigatorio] = useState<boolean>(data.scrollObrigatorioGlobal ?? true)

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
        scrollObrigatorio: saved[val]?.scrollObrigatorio ?? true,
        tempoLeitura: saved[val]?.tempoLeitura ?? 0,
      }))
    }
    return buildDeptRows(savedTempo, data.scrollObrigatorioGlobal ?? true)
  })

  const effectiveTempo = tempoEnabled ? tempoValue : 0

  const hasCustomizations = deptRows.some(
    (r) => r.scrollObrigatorio !== scrollObrigatorio || r.tempoLeitura !== effectiveTempo
  )

  /* ── "Pulo do Gato" ── */
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
      // scroll suave até a tabela
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  function updateDeptRow(key: string, field: 'scrollObrigatorio' | 'tempoLeitura', value: boolean | number) {
    setDeptRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r))
  }

  /* ── Trocar tipo de documento ── */
  function handleTipoDocChange(tipo: 'adesao' | 'ciencia') {
    setTipoDoc(tipo)
    if (tipo === 'ciencia') {
      setVigRange([null, null])
      setValidadeAceite('sem_validade')
    }
  }

  /* ── Colunas da tabela ── */
  const columns: ColumnsType<DeptRow> = [
    {
      title: (
        <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
          Personalizar por departamento
        </Text>
      ),
      dataIndex: 'nome',
      key: 'nome',
      render: (nome: string) => (
        <Text style={{ fontSize: 13, fontFamily: FONT }}>{nome}</Text>
      ),
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
      width: 200,
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

  /* ── Validação e avanço ── */
  function handleNext() {
    setSubmitted(true)
    if (!dataLancamento) { message.error('Informe a data de lançamento.'); return }
    if (tipoDoc === 'adesao' && (!vigRange[0] || !vigRange[1])) {
      message.error('Informe o período de vigência do aceite.'); return
    }
    const deptConfig = Object.fromEntries(
      deptRows.map((r) => [r.key, { scrollObrigatorio: r.scrollObrigatorio, tempoLeitura: r.tempoLeitura }])
    )
    dispatch({
      type: 'SET_STEP3',
      config: {
        tipoDocumento:           tipoDoc,
        vigenciaInicio:          vigRange[0]?.toISOString()    ?? '',
        vigenciaFim:             vigRange[1]?.toISOString()    ?? '',
        dataLancamento:          dataLancamento?.toISOString() ?? '',
        validadeAceite,
        prazoAceite:             0,
        tempoLeituraGlobal:      effectiveTempo,
        scrollObrigatorioGlobal: scrollObrigatorio,
        personalizarPorDept,
        deptConfig,
      },
    })
    navigate('/documentos/criar/revisao')
  }

  /* ─── JSX ─────────────────────────────────────────────────────── */
  return (
    <StepPageLayout
      currentStep={2}
      onHeaderBack={() => setShowCancel(true)}
      onBack={() => navigate('/documentos/criar/destinatarios')}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(); message.success('Rascunho salvo!') }}
    >
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '100%' }}>

        {/* ══ 1. TIPO DE DOCUMENTO ════════════════════════════════ */}
        <Text strong style={{ display: 'block', fontSize: 14, color: colorTokens.textPrimary, fontFamily: FONT, marginBottom: 4 }}>
          Configuração do documento
        </Text>
        <Text style={{ display: 'block', fontSize: 13, color: colorTokens.textSecondary, fontFamily: FONT, marginBottom: 16 }}>
          Tipo de documento, vigência e mecanismos de garantia de leitura
        </Text>

        <div role="radiogroup" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <RadioCard
            value="adesao"
            title="Documentos com versão"
            description="Documentos com prazo de vigência e controle de versões."
            selected={tipoDoc === 'adesao'}
            onClick={() => handleTipoDocChange('adesao')}
            style={{ flex: '1 1 260px' }}
          />
          <RadioCard
            value="ciencia"
            title="Documentos sem versão"
            description="Documentos de envio único e sem controle de versões futuras."
            selected={tipoDoc === 'ciencia'}
            onClick={() => handleTipoDocChange('ciencia')}
            style={{ flex: '1 1 260px' }}
          />
        </div>

        {/* ══ 2A. ADESÃO — Vigência + Lançamento + Validade ═══════ */}
        {tipoDoc === 'adesao' && (
          <>
            <SectionDivider title="Vigência, lançamento e prazo de aceite" />
            <ConfigProvider locale={ptBR}>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    style={{ margin: 0 }}
                    validateStatus={submitted && (!vigRange[0] || !vigRange[1]) ? 'error' : ''}
                    help={submitted && (!vigRange[0] || !vigRange[1]) ? 'Campo obrigatório.' : undefined}
                  >
                    <FieldLabel label="Vigência do aceite" required
                      tooltip="Período em que este documento estará ativo e exigindo aceite dos colaboradores."
                    />
                    <RangePicker
                      style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                      format="DD/MM/YYYY"
                      placeholder={['Data inicial', 'Data final']}
                      value={vigRange}
                      onChange={(dates) => setVigRange(dates ? [dates[0], dates[1]] : [null, null])}
                      disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                      separator="→"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    style={{ margin: 0 }}
                    validateStatus={submitted && !dataLancamento ? 'error' : ''}
                    help={submitted && !dataLancamento ? 'Campo obrigatório.' : undefined}
                  >
                    <FieldLabel label="Data de lançamento" required
                      tooltip="Define o dia exato em que o documento será disparado e ficará disponível para aceite dos destinatários."
                    />
                    <DatePicker
                      style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                      format="DD/MM/YYYY"
                      placeholder="Selecione"
                      value={dataLancamento}
                      onChange={(d) => setDataLancamento(d)}
                      disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item style={{ margin: 0 }}>
                    <FieldLabel label="Validade do aceite (Reciclagem)"
                      tooltip="Define de quanto em quanto tempo o colaborador precisará reaceitar este documento."
                    />
                    <Select
                      style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                      value={validadeAceite}
                      onChange={setValidadeAceite}
                      options={VALIDADE_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </ConfigProvider>
          </>
        )}

        {/* ══ 2B. CIÊNCIA — Apenas data de lançamento ════════════ */}
        {tipoDoc === 'ciencia' && (
          <>
            <SectionDivider title="Data de lançamento" />
            <ConfigProvider locale={ptBR}>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    style={{ margin: 0 }}
                    validateStatus={submitted && !dataLancamento ? 'error' : ''}
                    help={submitted && !dataLancamento ? 'Campo obrigatório.' : undefined}
                  >
                    <FieldLabel label="Data de lançamento" required
                      tooltip="Define o dia exato em que o documento será disparado e ficará disponível para aceite dos destinatários."
                    />
                    <DatePicker
                      style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                      format="DD/MM/YYYY"
                      placeholder="Selecione"
                      value={dataLancamento}
                      onChange={(d) => setDataLancamento(d)}
                      disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </ConfigProvider>
          </>
        )}

        {/* ══ 3. MECANISMO DE GARANTIA DE LEITURA ════════════════ */}
        <>
          <Divider style={{ margin: '0 0 20px' }} />

          {/* Header da seção com switch "Personalizar" no topo direito */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <Text strong style={{ display: 'block', fontSize: 14, color: colorTokens.textPrimary, fontFamily: FONT, marginBottom: 4 }}>
                Mecanismo de garantia de leitura
              </Text>
              <Text style={{ display: 'block', fontSize: 13, color: colorTokens.textSecondary, fontFamily: FONT }}>
                Configurações que asseguram que o colaborador leu o documento antes de aceitar.
              </Text>
            </div>

            {/* Switch "Personalizar por departamento" — só aparece se modo = departamento */}
            {isByDept && selectedDepts.length > 0 && (
              <Space size={8} align="center" style={{ flexShrink: 0, marginLeft: 24 }}>
                <Switch
                  checked={personalizarPorDept}
                  onChange={togglePersonalizar}
                  size="small"
                  style={{ background: personalizarPorDept ? colorTokens.primary : undefined }}
                />
                <Text style={{ fontSize: 13, fontFamily: FONT, color: colorTokens.textPrimary, whiteSpace: 'nowrap' }}>
                  Personalizar por departamento
                </Text>
              </Space>
            )}
          </div>

          {/* Cards de configuração global */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 0 }}>

            {/* Card 1 — Tempo de leitura */}
            <ReadingGuardCard
              title="Tempo de leitura"
              description="Tempo mínimo de leitura antes de habilitar o aceite"
              active={tempoEnabled}
              disabled={personalizarPorDept}
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

            {/* Card 2 — Scroll obrigatório */}
            <ReadingGuardCard
              title={scrollObrigatorio ? 'Scroll obrigatório até o fim (ativado)' : 'Scroll obrigatório até o fim'}
              description="Botão de aceite só habilita após rolar todo o documento"
              active={scrollObrigatorio}
              disabled={personalizarPorDept}
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

          {/* Tabela por departamento */}
          {isByDept && selectedDepts.length > 0 && personalizarPorDept && (
            <div ref={tableRef} style={{ marginTop: 20 }}>
              <Table<DeptRow>
                dataSource={deptRows}
                columns={columns}
                pagination={false}
                size="middle"
                bordered={false}
                style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}
                rowKey="key"
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text style={{ fontSize: 11, color: colorTokens.textSecondary, fontFamily: FONT }}>
                        * Inicializados com os valores globais. Personalizações mantidas mesmo ao desligar o switch.
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
          )}
        </>

      </div>

      <CancelModal
        open={showCancel}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
        onCancel={() => setShowCancel(false)}
      />
    </StepPageLayout>
  )
}
