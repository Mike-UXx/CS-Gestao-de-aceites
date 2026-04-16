/* ─────────────────────────────────────────────────────────────
   src/features/edicao/pages/EditarAgendadoPage.tsx
   Edição completa de documento Agendado — página única
───────────────────────────────────────────────────────────── */
import { useState, useMemo } from 'react'
import {
  Input, Select, Button, Typography, Space, Tag,
  Divider, Checkbox, Form, Tooltip, message, Row, Col,
  DatePicker, Switch, ConfigProvider, Radio,
} from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import ptBR from 'antd/locale/pt_BR'
import {
  ArrowLeftOutlined, SaveOutlined,
  SearchOutlined, DownOutlined, InfoCircleOutlined,
  CalendarOutlined, FieldTimeOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import {
  CLASSIFICATIONS, DEPARTAMENTOS, COLABORADORES, GESTOES_RESPONSAVEIS,
} from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

const { Title, Text } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const FONT = "'Montserrat', sans-serif"

const CLASSIF_OPTS = CLASSIFICATIONS.map((c) => ({ label: c.label, value: c.value }))
const GESTAO_OPTS  = GESTOES_RESPONSAVEIS.map((g) => ({ label: g.label, value: g.value }))

const TEMPO_OPTIONS = [
  { value: 0,   label: 'Sem trava'   },
  { value: 60,  label: '1 minuto'    },
  { value: 120, label: '2 minutos'   },
  { value: 180, label: '3 minutos'   },
  { value: 300, label: '5 minutos'   },
  { value: 600, label: '10 minutos'  },
]

const VALIDADE_OPTIONS = [
  { value: 'sem_validade', label: 'Sem recorrência'  },
  { value: '3_meses',      label: 'A cada 3 meses'   },
  { value: '6_meses',      label: 'A cada 6 meses'   },
  { value: '12_meses',     label: 'Anual'            },
  { value: '24_meses',     label: 'A cada 2 anos'    },
]

/* ─── Componentes auxiliares ─────────────────────────────── */
function FieldLabel({ label, required, tooltip }: { label: string; required?: boolean; tooltip?: string }) {
  return (
    <Space size={4} align="center" style={{ marginBottom: 6, display: 'flex' }}>
      <Text style={{ fontSize: 13, color: colorTokens.textPrimary, fontWeight: 600, fontFamily: FONT }}>
        {label}
        {required && <span style={{ color: colorTokens.error, marginLeft: 2 }}>*</span>}
      </Text>
      {tooltip && (
        <Tooltip title={tooltip} overlayStyle={{ maxWidth: 260 }}>
          <InfoCircleOutlined style={{ color: '#BFBFBF', fontSize: 13, cursor: 'pointer' }} />
        </Tooltip>
      )}
    </Space>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Text strong style={{ display: 'block', fontSize: 14, color: colorTokens.textPrimary, fontFamily: FONT, marginBottom: subtitle ? 2 : 0 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ display: 'block', fontSize: 13, color: colorTokens.textSecondary, fontFamily: FONT }}>
          {subtitle}
        </Text>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
export function EditarAgendadoPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const doc      = MOCK_DOCUMENTOS.find((d) => d.id === id)

  /* ── Estado dos campos — pré-preenchidos com dados do doc ── */
  const [titulo,         setTitulo]         = useState(doc?.titulo ?? '')
  const [descricao,      setDescricao]      = useState(doc?.descricao ?? '')
  const [classificacoes, setClassificacoes] = useState<string[]>(doc?.classificacoes ?? [])
  const [gestao,         setGestao]         = useState(doc?.gestaoResponsavel ?? '')
  const [tipoDoc,        setTipoDoc]        = useState<'adesao' | 'ciencia'>(doc?.tipo ?? 'adesao')
  const [exigeAceite,    setExigeAceite]    = useState(true)
  const [validadeAceite, setValidadeAceite] = useState(doc?.recorrenciaAceite ?? 'sem_validade')
  const [tempoLeitura,   setTempoLeitura]   = useState<number>(0)
  const [scrollObrig,    setScrollObrig]    = useState(true)

  /* Vigência */
  const [vigRange, setVigRange] = useState<[Dayjs | null, Dayjs | null]>([
    doc?.dataLancamento ? dayjs(doc.dataLancamento) : null,
    doc?.dataExpiracao  ? dayjs(doc.dataExpiracao)  : null,
  ])

  /* Data de envio */
  const [dataEnvio, setDataEnvio] = useState<Dayjs | null>(
    doc?.dataLancamento ? dayjs(doc.dataLancamento) : null
  )

  /* ── Destinatários ── */
  const [modalidade,    setModalidade]    = useState<'departamento' | 'pessoa'>(
    doc?.modalidadeEnvio === 'pessoa' ? 'pessoa' : 'departamento'
  )
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [selectedCols,  setSelectedCols]  = useState<string[]>([])
  const [colSearch,     setColSearch]     = useState('')
  const [submitted,     setSubmitted]     = useState(false)

  /* Busca filtrada */
  const filteredCols = useMemo(() => {
    if (!colSearch.trim()) return COLABORADORES
    const q = colSearch.trim().toLowerCase()
    return COLABORADORES.filter((c) =>
      c.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
        q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      )
    )
  }, [colSearch])

  const totalCols        = COLABORADORES.length
  const filteredTotal    = filteredCols.length
  const filteredSelected = selectedCols.filter((v) => filteredCols.some((c) => c.value === v))
  const allFilteredSel   = filteredTotal > 0 && filteredSelected.length === filteredTotal
  const someFilteredSel  = filteredSelected.length > 0 && !allFilteredSel
  const totalDepts       = DEPARTAMENTOS.length
  const allDeptsSelected = selectedDepts.length === totalDepts
  const someDeptsSelected= selectedDepts.length > 0 && !allDeptsSelected

  function toggleSelectAllCols() {
    const vals = filteredCols.map((c) => c.value)
    if (allFilteredSel) setSelectedCols((prev) => prev.filter((v) => !vals.includes(v)))
    else setSelectedCols((prev) => Array.from(new Set([...prev, ...vals])))
  }
  function toggleSelectAllDepts() {
    setSelectedDepts(allDeptsSelected ? [] : DEPARTAMENTOS.map((d) => d.value))
  }

  /* ── Salvar ── */
  function handleSave() {
    setSubmitted(true)
    if (!titulo.trim()) return
    if (tipoDoc === 'adesao' && exigeAceite && (!vigRange[0] || !vigRange[1])) {
      message.error('Informe o período de vigência do documento.')
      return
    }
    message.success({
      content: (
        <span style={{ fontFamily: FONT }}>
          Documento agendado atualizado com sucesso.{' '}
          <strong>As configurações serão aplicadas no momento do envio.</strong>
        </span>
      ),
      duration: 5,
    })
    setTimeout(() => navigate(`/documentos/${id}`), 300)
  }

  if (!doc) {
    return (
      <div style={{ padding: 32, fontFamily: FONT }}>
        <Text type="danger">Documento não encontrado.</Text>
        <Button type="link" onClick={() => navigate('/documentos')}>Voltar</Button>
      </div>
    )
  }

  /* ─── JSX ─────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

      {/* ← Voltar */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/documentos/${id}`)}
        style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: colorTokens.primary, padding: 0, marginBottom: 20 }}
      >
        Voltar ao documento
      </Button>

      {/* Main Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 32 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <CalendarOutlined style={{ color: '#D46B08', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0, fontFamily: FONT, color: colorTokens.textPrimary, fontWeight: 700, fontSize: 18 }}>
              Editar Documento Agendado
            </Title>
          </div>
          <Text style={{ display: 'block', marginTop: 4, fontSize: 13, color: colorTokens.textSecondary, fontFamily: FONT }}>
            Como o documento ainda não foi enviado, todos os campos estão disponíveis para edição.
          </Text>
        </div>

        {/* ══ 1. INFORMAÇÕES ══════════════════════════════════ */}
        <SectionHeader title="Informações do documento" subtitle="Dados descritivos e administrativos" />

        <Row gutter={[24, 20]} style={{ marginBottom: 28 }}>
          <Col xs={24}>
            <Form.Item
              style={{ margin: 0 }}
              validateStatus={submitted && !titulo.trim() ? 'error' : ''}
              help={submitted && !titulo.trim() ? 'O título é obrigatório.' : undefined}
            >
              <FieldLabel label="Título do documento" required />
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
                showCount
                style={{ fontFamily: FONT, fontSize: 13 }}
                status={submitted && !titulo.trim() ? 'error' : undefined}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <FieldLabel label="Descrição" tooltip="Objetivo e conteúdo do documento." />
            <TextArea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
              style={{ fontFamily: FONT, fontSize: 13, resize: 'none' }}
              placeholder="Descreva o objetivo e conteúdo deste documento"
            />
          </Col>

          <Col xs={24} sm={14}>
            <FieldLabel label="Classificações" tooltip="Categorias temáticas que facilitam busca e filtragem." />
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Selecione as classificações"
              value={classificacoes}
              onChange={setClassificacoes}
              options={CLASSIF_OPTS}
              maxTagCount="responsive"
              maxTagPlaceholder={(omitted) => (
                <Tag style={{ background: colorTokens.primary, color: '#fff', borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12 }}>
                  +{omitted.length}
                </Tag>
              )}
            />
          </Col>

          <Col xs={24} sm={10}>
            <FieldLabel label="Gestão responsável" required tooltip="Área responsável pela publicação." />
            <Select
              style={{ width: '100%' }}
              placeholder="Selecione"
              value={gestao || undefined}
              onChange={setGestao}
              options={GESTAO_OPTS}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '0 0 28px' }} />

        {/* ══ 2. CONFIGURAÇÕES ════════════════════════════════ */}
        <SectionHeader title="Tipo e configurações" subtitle="Tipo do documento, vigência e aceite" />

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {([
            { value: 'adesao',  title: 'Documentos com versão',   desc: 'Com prazo de vigência e controle de versões.' },
            { value: 'ciencia', title: 'Documentos sem versão',    desc: 'Envio único, sem controle de versões.' },
          ] as const).map((opt) => {
            const active = tipoDoc === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTipoDoc(opt.value)}
                style={{
                  flex: '1 1 240px', padding: '14px 18px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${active ? colorTokens.primary : '#D9D9D9'}`,
                  background: active ? '#EEF2FF' : '#FAFAFA',
                  textAlign: 'left', fontFamily: FONT, transition: 'all 0.2s',
                }}
              >
                <Text strong style={{ display: 'block', fontSize: 13, fontFamily: FONT, color: active ? colorTokens.primary : colorTokens.textPrimary }}>
                  {opt.title}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: FONT, color: active ? colorTokens.primary : colorTokens.textSecondary }}>
                  {opt.desc}
                </Text>
              </button>
            )
          })}
        </div>

        {/* Exige aceite */}
        <div style={{ marginBottom: 24 }}>
          <FieldLabel label="Exigir aceite formal dos destinatários?" tooltip="Quando ativado, os destinatários precisarão confirmar a leitura." />
          <div style={{ marginTop: 8 }}>
            <Radio.Group
              value={exigeAceite ? 'sim' : 'nao'}
              onChange={(e) => setExigeAceite(e.target.value === 'sim')}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="sim">Sim</Radio.Button>
              <Radio.Button value="nao">Não</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {/* Datas */}
        <ConfigProvider locale={ptBR}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {tipoDoc === 'adesao' && (
              <Col xs={24} sm={10}>
                <Form.Item
                  style={{ margin: 0 }}
                  validateStatus={submitted && exigeAceite && (!vigRange[0] || !vigRange[1]) ? 'error' : ''}
                  help={submitted && exigeAceite && (!vigRange[0] || !vigRange[1]) ? 'Campo obrigatório.' : undefined}
                >
                  <FieldLabel label="Vigência do documento" required={exigeAceite} tooltip="Período em que o documento estará ativo." />
                  <RangePicker
                    style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                    format="DD/MM/YYYY"
                    placeholder={['Data inicial', 'Data final']}
                    value={vigRange}
                    onChange={(dates) => setVigRange(dates ? [dates[0], dates[1]] : [null, null])}
                    separator="→"
                  />
                </Form.Item>
              </Col>
            )}
            {tipoDoc === 'adesao' && exigeAceite && (
              <Col xs={24} sm={7}>
                <FieldLabel label="Recorrência do aceite" tooltip="Frequência com que o colaborador precisará reasinar." />
                <Select
                  style={{ width: '100%', marginTop: 6 }}
                  value={validadeAceite}
                  onChange={setValidadeAceite}
                  options={VALIDADE_OPTIONS}
                />
              </Col>
            )}
            <Col xs={24} sm={7}>
              <FieldLabel label="Data de envio" tooltip="Deixe em branco para envio imediato ao publicar." />
              <DatePicker
                style={{ width: '100%', marginTop: 6, fontFamily: FONT }}
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: 'HH:mm' }}
                allowClear
                placeholder="🕒  Imediato (ao publicar)"
                value={dataEnvio}
                onChange={(d) => setDataEnvio(d ?? null)}
                disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
              />
            </Col>
          </Row>
        </ConfigProvider>

        {/* Garantia de leitura */}
        {exigeAceite && (
          <Row gutter={[16, 16]} style={{ marginBottom: 0 }}>
            <Col xs={24} sm={12}>
              <FieldLabel label="Tempo mínimo de leitura" tooltip="O aceite só será liberado após este tempo mínimo." />
              <Select
                style={{ width: '100%' }}
                value={tempoLeitura}
                onChange={setTempoLeitura}
                options={TEMPO_OPTIONS}
              />
            </Col>
            <Col xs={24} sm={12}>
              <FieldLabel label="Scroll obrigatório" tooltip="O colaborador precisa rolar o documento até o final antes de aceitar." />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                border: `1.5px solid ${scrollObrig ? colorTokens.primary : '#D9D9D9'}`,
                background: scrollObrig ? '#EEF2FF' : '#FAFAFA',
              }}>
                <Switch
                  checked={scrollObrig}
                  onChange={setScrollObrig}
                  size="small"
                  style={{ background: scrollObrig ? colorTokens.primary : undefined }}
                />
                <Text style={{ fontFamily: FONT, fontSize: 13, color: scrollObrig ? colorTokens.primary : colorTokens.textSecondary }}>
                  {scrollObrig ? 'Ativado' : 'Desativado'}
                </Text>
              </div>
            </Col>
          </Row>
        )}

        <Divider style={{ margin: '28px 0' }} />

        {/* ══ 3. DESTINATÁRIOS ════════════════════════════════ */}
        <SectionHeader title="Destinatários" subtitle="Defina quem deve receber este documento" />

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {(['departamento', 'pessoa'] as const).map((mode) => {
            const active = modalidade === mode
            return (
              <button
                key={mode}
                onClick={() => { setModalidade(mode); setSubmitted(false) }}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${active ? colorTokens.primary : '#D9D9D9'}`,
                  background: active ? '#EEF2FF' : '#FAFAFA',
                  textAlign: 'left', fontFamily: FONT, transition: 'all 0.2s',
                }}
              >
                <Text strong style={{ display: 'block', fontSize: 13, fontFamily: FONT, color: active ? colorTokens.primary : colorTokens.textPrimary }}>
                  {mode === 'departamento' ? 'Por departamentos' : 'Destinatários específicos'}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: FONT, color: active ? colorTokens.primary : colorTokens.textSecondary }}>
                  {mode === 'departamento' ? 'Selecione um ou mais departamentos' : 'Busque e selecione por nome'}
                </Text>
              </button>
            )
          })}
        </div>

        {modalidade === 'departamento' ? (
          <>
            <FieldLabel label="Departamentos" tooltip="Todos os colaboradores dos departamentos selecionados receberão o documento." />
            <Select
              mode="multiple"
              showSearch
              style={{ width: '100%' }}
              placeholder="Selecione os departamentos"
              value={selectedDepts}
              onChange={setSelectedDepts}
              options={DEPARTAMENTOS}
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              maxTagCount="responsive"
              maxTagPlaceholder={(omitted) => (
                <Tag style={{ background: colorTokens.primary, color: '#fff', borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12 }}>
                  +{omitted.length}
                </Tag>
              )}
              listHeight={260}
              dropdownRender={(menu) => (
                <>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleSelectAllDepts}
                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
                  >
                    <Checkbox checked={allDeptsSelected} indeterminate={someDeptsSelected} />
                    <Text style={{ fontSize: 13, color: colorTokens.textPrimary }}>
                      Selecionar todos — <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>{totalDepts} departamentos</Text>
                    </Text>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  {menu}
                </>
              )}
            />
          </>
        ) : (
          <>
            <FieldLabel label="Destinatários" tooltip="Selecione os destinatários individualmente." />
            <Select
              mode="multiple"
              showSearch={false}
              filterOption={false}
              style={{ width: '100%' }}
              placeholder="Selecione os destinatários"
              value={selectedCols}
              onChange={setSelectedCols}
              options={filteredCols}
              maxTagCount="responsive"
              maxTagPlaceholder={(omitted) => (
                <Tag style={{ background: colorTokens.primary, color: '#fff', borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12 }}>
                  +{omitted.length}
                </Tag>
              )}
              listHeight={220}
              virtual
              suffixIcon={
                <Space size={6} style={{ pointerEvents: 'none' }}>
                  <Text style={{ fontSize: 12, color: '#8C8C8C', fontFamily: FONT }}>{selectedCols.length}&nbsp;/&nbsp;{totalCols}</Text>
                  <DownOutlined style={{ fontSize: 10, color: '#8C8C8C' }} />
                </Space>
              }
              dropdownRender={(menu) => (
                <>
                  <div onMouseDown={(e) => e.preventDefault()} style={{ padding: '8px 12px' }}>
                    <Input
                      autoFocus
                      prefix={<SearchOutlined style={{ color: '#BFBFBF' }} />}
                      placeholder="Pesquisar colaborador..."
                      value={colSearch}
                      onChange={(e) => setColSearch(e.target.value)}
                      style={{ borderRadius: 6, fontFamily: FONT, fontSize: 13 }}
                      allowClear
                    />
                  </div>
                  <Divider style={{ margin: 0 }} />
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleSelectAllCols}
                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
                  >
                    <Checkbox checked={allFilteredSel} indeterminate={someFilteredSel} />
                    <Text style={{ fontSize: 13, fontFamily: FONT, color: colorTokens.textPrimary }}>
                      Selecionar todos{' '}
                      <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
                        — {filteredTotal} colaborador{filteredTotal !== 1 ? 'es' : ''}
                        {colSearch.trim() ? ' encontrados' : ''}
                      </Text>
                    </Text>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  {filteredTotal === 0 ? (
                    <div style={{ padding: 12, textAlign: 'center' }}>
                      <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>Nenhum colaborador encontrado</Text>
                    </div>
                  ) : menu}
                </>
              )}
              onDropdownVisibleChange={(open) => { if (!open) setColSearch('') }}
            />
          </>
        )}

        {/* ══ RODAPÉ ══════════════════════════════════════════ */}
        <Divider style={{ margin: '32px 0 24px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <FieldTimeOutlined style={{ color: colorTokens.textSecondary, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>
              Agendado para{' '}
              <strong style={{ color: colorTokens.textPrimary }}>
                {dataEnvio ? dataEnvio.format('DD/MM/YYYY [às] HH:mm') : 'envio imediato'}
              </strong>
            </Text>
          </div>
          <Space size={12}>
            <Button
              onClick={() => navigate(`/documentos/${id}`)}
              style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38 }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38, background: colorTokens.primary }}
            >
              Salvar alterações
            </Button>
          </Space>
        </div>

      </div>
    </div>
  )
}
