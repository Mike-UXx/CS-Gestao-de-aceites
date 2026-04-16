/* ─────────────────────────────────────────────────────────────
   src/features/edicao/pages/EditarAtivoPage.tsx
   Edição de documento Ativo — página única, sem Steps
───────────────────────────────────────────────────────────── */
import { useState, useMemo } from 'react'
import {
  Input, Select, Button, Typography, Space, Tag,
  Divider, Checkbox, Form, Tooltip, message, Alert, Row, Col,
} from 'antd'
import {
  ArrowLeftOutlined, SaveOutlined, SearchOutlined,
  DownOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_DOCUMENTOS } from '@/data/mockDocumentos'
import { CLASSIFICATIONS, DEPARTAMENTOS, COLABORADORES, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

const { Title, Text } = Typography

const FONT = "'Montserrat', sans-serif"

const CLASSIF_OPTS = CLASSIFICATIONS.map((c) => ({ label: c.label, value: c.value }))
const GESTAO_MAP   = Object.fromEntries(GESTOES_RESPONSAVEIS.map((g) => [g.value, g.label]))

const TEMPO_OPTIONS = [
  { value: 0,   label: 'Sem trava'   },
  { value: 60,  label: '1 minuto'    },
  { value: 120, label: '2 minutos'   },
  { value: 180, label: '3 minutos'   },
  { value: 300, label: '5 minutos'   },
  { value: 600, label: '10 minutos'  },
]

/* ─── Label auxiliar ─────────────────────────────────────── */
function FieldLabel({
  label, required, tooltip,
}: { label: string; required?: boolean; tooltip?: string }) {
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

/* ─── Divisor de seção ─────────────────────────────────── */
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
export function EditarAtivoPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const doc      = MOCK_DOCUMENTOS.find((d) => d.id === id)

  /* ── Campos editáveis — estado local pré-preenchido ── */
  const [titulo,          setTitulo]          = useState(doc?.titulo ?? '')
  const [classificacoes,  setClassificacoes]  = useState<string[]>(doc?.classificacoes ?? [])
  const [tempoLeitura,    setTempoLeitura]    = useState<number>(0)

  /* ── Destinatários ── */
  const [modalidade,      setModalidade]      = useState<'departamento' | 'pessoa'>(
    doc?.modalidadeEnvio === 'pessoa' ? 'pessoa' : 'departamento'
  )
  const [selectedDepts,   setSelectedDepts]   = useState<string[]>([])
  const [selectedCols,    setSelectedCols]    = useState<string[]>([])
  const [colSearch,       setColSearch]       = useState('')
  const [submitted,       setSubmitted]       = useState(false)

  /* ── Busca filtrada de colaboradores ── */
  const filteredCols = useMemo(() => {
    if (!colSearch.trim()) return COLABORADORES
    const q = colSearch.trim().toLowerCase()
    return COLABORADORES.filter((c) =>
      c.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
        q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      )
    )
  }, [colSearch])

  const totalCols          = COLABORADORES.length
  const filteredTotal      = filteredCols.length
  const filteredSelected   = selectedCols.filter((v) => filteredCols.some((c) => c.value === v))
  const allFilteredSel     = filteredTotal > 0 && filteredSelected.length === filteredTotal
  const someFilteredSel    = filteredSelected.length > 0 && !allFilteredSel

  const totalDepts         = DEPARTAMENTOS.length
  const allDeptsSelected   = selectedDepts.length === totalDepts
  const someDeptsSelected  = selectedDepts.length > 0 && !allDeptsSelected

  function toggleSelectAllCols() {
    const filteredVals = filteredCols.map((c) => c.value)
    if (allFilteredSel) {
      setSelectedCols((prev) => prev.filter((v) => !filteredVals.includes(v)))
    } else {
      setSelectedCols((prev) => Array.from(new Set([...prev, ...filteredVals])))
    }
  }

  function toggleSelectAllDepts() {
    setSelectedDepts(allDeptsSelected ? [] : DEPARTAMENTOS.map((d) => d.value))
  }

  /* ── Validação e salvar ── */
  function handleSave() {
    setSubmitted(true)
    if (!titulo.trim()) return
    // mock save — em produção chamaria a API
    message.success({
      content: (
        <span style={{ fontFamily: FONT }}>
          Documento atualizado com sucesso.{' '}
          <strong>As alterações já estão valendo para os destinatários.</strong>
        </span>
      ),
      duration: 5,
    })
    setTimeout(() => navigate(`/documentos/${id}`), 300)
  }

  /* ── Documento não encontrado ── */
  if (!doc) {
    return (
      <div style={{ padding: 32 }}>
        <Alert
          type="error"
          message="Documento não encontrado"
          description="O documento solicitado não existe ou foi removido."
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/documentos')}>
              Voltar à listagem
            </Button>
          }
        />
      </div>
    )
  }

  const currentSelection = modalidade === 'departamento' ? selectedDepts : selectedCols
  const destinEmpty      = submitted && currentSelection.length === 0

  /* ─── JSX ─────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── ← Voltar ── */}
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/documentos/${id}`)}
        style={{
          fontFamily: FONT, fontWeight: 600, fontSize: 13,
          color: colorTokens.primary, padding: 0, marginBottom: 20,
        }}
      >
        Voltar ao documento
      </Button>

      {/* ── Main Card ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        padding: 32,
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <Title level={4} style={{
            margin: 0, fontFamily: FONT, color: colorTokens.textPrimary,
            fontWeight: 700, fontSize: 18,
          }}>
            Editar Documento Ativo
          </Title>
          <Text style={{
            display: 'block', marginTop: 6, fontSize: 13,
            color: colorTokens.textSecondary, fontFamily: FONT,
          }}>
            Apenas informações administrativas e de público podem ser alteradas em documentos já publicados.
          </Text>
        </div>

        {/* ── Banner informativo de compliance ── */}
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 28, fontFamily: FONT, borderRadius: 8, fontSize: 13 }}
          message={
            <span style={{ fontWeight: 600, fontFamily: FONT }}>Edição de documento ativo</span>
          }
          description={
            <span style={{ fontFamily: FONT, fontSize: 13 }}>
              O <strong>arquivo PDF</strong>, a <strong>vigência</strong> e as <strong>configurações de aceite</strong> não podem
              ser alterados em documentos já publicados — essas mudanças exigem a criação de um novo documento.
            </span>
          }
        />

        {/* ══ SEÇÃO 1 — Informações administrativas ══ */}
        <SectionHeader
          title="Informações administrativas"
          subtitle="Campos administrativos editáveis do documento"
        />

        <Row gutter={[24, 20]} style={{ marginBottom: 28 }}>

          {/* Título */}
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
                placeholder="Ex.: Código de Conduta e Ética Empresarial"
                maxLength={120}
                showCount
                style={{ fontFamily: FONT, fontSize: 13 }}
                status={submitted && !titulo.trim() ? 'error' : undefined}
              />
            </Form.Item>
          </Col>

          {/* Classificações */}
          <Col xs={24} sm={14}>
            <FieldLabel
              label="Classificações"
              tooltip="Categorias temáticas que facilitam a busca e filtragem do documento."
            />
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Selecione as classificações"
              value={classificacoes}
              onChange={setClassificacoes}
              options={CLASSIF_OPTS}
              maxTagCount="responsive"
              maxTagPlaceholder={(omitted) => (
                <Tag style={{
                  background: colorTokens.primary, color: '#fff',
                  borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12,
                }}>
                  +{omitted.length}
                </Tag>
              )}
            />
          </Col>

          {/* Tempo mínimo de leitura */}
          <Col xs={24} sm={10}>
            <FieldLabel
              label="Tempo mínimo de leitura"
              tooltip="O aceite só será liberado após o colaborador aguardar este tempo mínimo."
            />
            <Select
              style={{ width: '100%' }}
              value={tempoLeitura}
              onChange={setTempoLeitura}
              options={TEMPO_OPTIONS}
            />
          </Col>

        </Row>

        <Divider style={{ margin: '0 0 28px' }} />

        {/* ══ SEÇÃO 2 — Destinatários ══ */}
        <SectionHeader
          title="Destinatários"
          subtitle="Adicione novos destinatários ao documento. Os existentes serão mantidos."
        />

        {/* Seletor de modalidade */}
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
                <Text strong style={{
                  display: 'block', fontSize: 13, fontFamily: FONT,
                  color: active ? colorTokens.primary : colorTokens.textPrimary,
                }}>
                  {mode === 'departamento' ? 'Por departamentos' : 'Destinatários específicos'}
                </Text>
                <Text style={{
                  fontSize: 12, fontFamily: FONT,
                  color: active ? colorTokens.primary : colorTokens.textSecondary,
                }}>
                  {mode === 'departamento'
                    ? 'Selecione um ou mais departamentos'
                    : 'Busque e selecione por nome'}
                </Text>
              </button>
            )
          })}
        </div>

        {/* Seletor condicional */}
        <Form.Item
          style={{ marginBottom: 0 }}
          validateStatus={destinEmpty ? 'error' : ''}
          help={destinEmpty ? 'Campo de seleção obrigatória.' : undefined}
        >
          {modalidade === 'departamento' ? (

            /* ── DEPARTAMENTOS ── */
            <>
              <FieldLabel label="Departamentos" tooltip="Todos os colaboradores dos departamentos receberão o documento." />
              <Select
                mode="multiple"
                showSearch
                style={{ width: '100%' }}
                placeholder="Selecione os departamentos"
                value={selectedDepts}
                onChange={setSelectedDepts}
                options={DEPARTAMENTOS}
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                maxTagCount="responsive"
                maxTagPlaceholder={(omitted) => (
                  <Tag style={{
                    background: colorTokens.primary, color: '#fff',
                    borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12,
                  }}>
                    +{omitted.length}
                  </Tag>
                )}
                listHeight={260}
                dropdownRender={(menu) => (
                  <>
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={toggleSelectAllDepts}
                      style={{
                        padding: '8px 12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none',
                      }}
                    >
                      <Checkbox checked={allDeptsSelected} indeterminate={someDeptsSelected} />
                      <Text style={{ fontSize: 13, color: colorTokens.textPrimary }}>
                        Selecionar todos —{' '}
                        <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
                          {totalDepts} departamentos
                        </Text>
                      </Text>
                    </div>
                    <Divider style={{ margin: 0 }} />
                    {menu}
                  </>
                )}
                status={destinEmpty ? 'error' : undefined}
              />
            </>

          ) : (

            /* ── COLABORADORES ── */
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
                  <Tag style={{
                    background: colorTokens.primary, color: '#fff',
                    borderColor: colorTokens.primary, borderRadius: 4, fontSize: 12,
                  }}>
                    +{omitted.length}
                  </Tag>
                )}
                listHeight={220}
                virtual
                suffixIcon={
                  <Space size={6} style={{ pointerEvents: 'none' }}>
                    <Text style={{ fontSize: 12, color: '#8C8C8C', fontFamily: FONT }}>
                      {selectedCols.length}&nbsp;/&nbsp;{totalCols}
                    </Text>
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
                      style={{
                        padding: '8px 12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none',
                      }}
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
                        <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
                          Nenhum colaborador encontrado
                        </Text>
                      </div>
                    ) : menu}
                  </>
                )}
                onDropdownVisibleChange={(open) => { if (!open) setColSearch('') }}
                status={destinEmpty ? 'error' : undefined}
              />
            </>

          )}
        </Form.Item>

        {/* ══ RODAPÉ DE AÇÕES ══ */}
        <Divider style={{ margin: '32px 0 24px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Contexto do documento (leitura) */}
          <div>
            <Text style={{ fontSize: 12, color: colorTokens.textSecondary, fontFamily: FONT }}>
              Responsável:{' '}
              <strong style={{ color: colorTokens.textPrimary }}>
                {GESTAO_MAP[doc.gestaoResponsavel] ?? doc.gestaoResponsavel}
              </strong>
            </Text>
          </div>

          {/* Botões */}
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
              style={{
                fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 38,
                background: colorTokens.primary, borderColor: colorTokens.primary,
              }}
            >
              Salvar alterações
            </Button>
          </Space>
        </div>

      </div>
    </div>
  )
}
