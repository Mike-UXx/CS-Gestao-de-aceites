import { useState, useMemo } from 'react'
import {
  Form, Typography, Select, Input,
  Space, Checkbox, Divider, Tag, Tooltip,
} from 'antd'
import { InfoCircleOutlined, SearchOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { RadioCard } from '@/features/criacao/components/RadioCard'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import { DEPARTAMENTOS, COLABORADORES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography

/* ─── Label com asterisco e tooltip ──────────────────────────── */
function FieldLabel({
  label, required, tooltip,
}: { label: string; required?: boolean; tooltip?: string }) {
  return (
    <Space size={4} align="center">
      <Text style={{ fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500 }}>
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

/* ─── Componente principal ────────────────────────────────────── */
export function DestinatariosStep() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { data, dispatch, saveDraft } = useDocumentForm()

  const [showCancel, setShowCancel] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  /* modalidade local sincronizada com context */
  const [modalidade, setModalidade] = useState<'departamento' | 'colaborador'>(
    data.modalidadeEnvio ?? 'departamento'
  )

  /* ── seleções locais ── */
  const [selectedDepts, setSelectedDepts] = useState<string[]>(data.departamentos ?? [])
  const [selectedCols, setSelectedCols]   = useState<string[]>(data.colaboradores ?? [])

  /* ── busca interna no dropdown de colaboradores ── */
  const [colSearch, setColSearch] = useState('')

  /* lista filtrada — memoizada para performance */
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
  /* "selecionar todos" opera sobre os itens FILTRADOS */
  const filteredSelected = selectedCols.filter((v) => filteredCols.some((c) => c.value === v))
  const allFilteredSel   = filteredTotal > 0 && filteredSelected.length === filteredTotal
  const someFilteredSel  = filteredSelected.length > 0 && !allFilteredSel

  function toggleSelectAllCols() {
    if (allFilteredSel) {
      /* desmarca apenas os filtrados */
      const filteredVals = filteredCols.map((c) => c.value)
      const next = selectedCols.filter((v) => !filteredVals.includes(v))
      setSelectedCols(next)
      dispatch({ type: 'SET_MULTI', field: 'colaboradores', value: next })
    } else {
      /* marca todos os filtrados (mantém os já selecionados fora do filtro) */
      const filteredVals = filteredCols.map((c) => c.value)
      const next = Array.from(new Set([...selectedCols, ...filteredVals]))
      setSelectedCols(next)
      dispatch({ type: 'SET_MULTI', field: 'colaboradores', value: next })
    }
  }

  /* ── "Selecionar todos" para departamentos ── */
  const totalDepts      = DEPARTAMENTOS.length
  const allDeptsSelected  = selectedDepts.length === totalDepts
  const someDeptsSelected = selectedDepts.length > 0 && !allDeptsSelected

  function toggleSelectAllDepts() {
    const next = allDeptsSelected ? [] : DEPARTAMENTOS.map((d) => d.value)
    setSelectedDepts(next)
    dispatch({ type: 'SET_MULTI', field: 'departamentos', value: next })
  }

  /* ── validação de campo obrigatório ── */
  const currentSelection = modalidade === 'departamento' ? selectedDepts : selectedCols
  const selectionEmpty = submitted && currentSelection.length === 0

  /* ── avançar ── */
  function handleNext() {
    setSubmitted(true)
    if (currentSelection.length === 0) return
    dispatch({ type: 'SET_FIELD', field: 'modalidadeEnvio', value: modalidade })
    navigate('/documentos/criar/configuracoes')
  }

  /* ── dropdown "Select all" genérico ── */
  function renderDropdownWithSelectAll(
    menu: React.ReactElement,
    total: number,
    allSelected: boolean,
    someSelected: boolean,
    onToggle: () => void,
    label: string,
  ) {
    return (
      <>
        <div
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            userSelect: 'none',
          }}
        >
          <Checkbox checked={allSelected} indeterminate={someSelected} />
          <Text style={{ fontSize: 13, color: colorTokens.textPrimary }}>
            Selecionar todos —{' '}
            <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
              {total} {label}
            </Text>
          </Text>
        </div>
        <Divider style={{ margin: 0 }} />
        {menu}
      </>
    )
  }

  return (
    <StepPageLayout
      currentStep={1}
      onHeaderBack={() => setShowCancel(true)}
      onBack={() => navigate('/documentos/criar/informacoes')}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(1); navigate('/documentos/listagem', { state: { draftSaved: true } }) }}
    >
      {/* ── Card branco de conteúdo ───────────────────────────── */}
      <div
        style={{
          background: '#fff', borderRadius: 8,
          padding: 24, width: '100%',
        }}
      >
          {/* Cabeçalho do card */}
          <Text strong style={{ fontSize: 15, color: colorTokens.textPrimary, display: 'block', marginBottom: 2 }}>
            Público-alvo
          </Text>
          <Text style={{ fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 28 }}>
            Defina quem receberá o documento para assinatura.
          </Text>

          <Form form={form} layout="vertical">

            {/* ── Modalidade — Radio Cards ── */}
            <div
              role="radiogroup"
              aria-label="Modalidade de envio"
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}
            >
              <RadioCard
                value="departamento"
                title="Por departamentos"
                description="Selecione um ou mais departamentos específicos"
                selected={modalidade === 'departamento'}
                onClick={() => {
                  setModalidade('departamento')
                  dispatch({ type: 'SET_FIELD', field: 'modalidadeEnvio', value: 'departamento' })
                  setSubmitted(false)
                }}
              />
              <RadioCard
                value="colaborador"
                title="Pessoas específicas"
                description="Busque e selecione pessoas específicas pelo nome"
                selected={modalidade === 'colaborador'}
                onClick={() => {
                  setModalidade('colaborador')
                  dispatch({ type: 'SET_FIELD', field: 'modalidadeEnvio', value: 'colaborador' })
                  setSubmitted(false)
                }}
              />
            </div>

            {/* ── Seletor condicional ── */}
            {modalidade === 'departamento' ? (

              /* ── DEPARTAMENTOS ── */
              <Form.Item
                style={{ marginBottom: 0 }}
                validateStatus={selectionEmpty ? 'error' : ''}
                help={selectionEmpty ? 'Campo de seleção obrigatória.' : undefined}
              >
                <FieldLabel
                  label="Departamentos *"
                  required={false}
                  tooltip="Todos os colaboradores dos departamentos selecionados receberão o documento."
                />
                <Select
                  mode="multiple"
                  showSearch
                  style={{ width: '100%', marginTop: 6 }}
                  placeholder="Selecione"
                  value={selectedDepts}
                  onChange={(vals: string[]) => {
                    setSelectedDepts(vals)
                    dispatch({ type: 'SET_MULTI', field: 'departamentos', value: vals })
                  }}
                  options={DEPARTAMENTOS}
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  maxTagCount="responsive"
                  maxTagPlaceholder={(omitted) => (
                    <Tag color={colorTokens.primary} style={{ color: '#fff', borderRadius: 4 }}>
                      +{omitted.length}
                    </Tag>
                  )}
                  listHeight={260}
                  dropdownRender={(menu) =>
                    renderDropdownWithSelectAll(
                      menu, totalDepts, allDeptsSelected, someDeptsSelected,
                      toggleSelectAllDepts, 'departamentos',
                    )
                  }
                  status={selectionEmpty ? 'error' : undefined}
                  size="middle"
                />
              </Form.Item>

            ) : (

              /* ── COLABORADORES ── */
              <Form.Item
                style={{ marginBottom: 0 }}
                validateStatus={selectionEmpty ? 'error' : ''}
                help={selectionEmpty ? 'Campo de seleção obrigatória.' : undefined}
              >
                <FieldLabel
                  label="Pessoas *"
                  required={false}
                  tooltip="Selecione as pessoas que receberão o documento individualmente."
                />

                {/* Wrapper relativo para sobrepor o contador */}
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <Select
                    mode="multiple"
                    showSearch={false}       /* busca é interna ao dropdown */
                    filterOption={false}     /* filtragem manual via filteredCols */
                    style={{ width: '100%' }}
                    placeholder="Selecione"
                    value={selectedCols}
                    onChange={(vals: string[]) => {
                      setSelectedCols(vals)
                      dispatch({ type: 'SET_MULTI', field: 'colaboradores', value: vals })
                    }}
                    options={filteredCols}
                    maxTagCount="responsive"
                    maxTagPlaceholder={(omitted) => (
                      <Tag
                        style={{
                          background: colorTokens.primary, color: '#fff',
                          borderColor: colorTokens.primary, borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        +{omitted.length}
                      </Tag>
                    )}
                    listHeight={220}
                    virtual
                    suffixIcon={
                      /* Contador X / Total + seta */
                      <Space size={6} style={{ pointerEvents: 'none' }}>
                        <Text style={{ fontSize: 12, color: '#8C8C8C', fontFamily: "'Montserrat', sans-serif" }}>
                          {selectedCols.length}&nbsp;/&nbsp;{totalCols}
                        </Text>
                        <DownOutlined style={{ fontSize: 10, color: '#8C8C8C' }} />
                      </Space>
                    }
                    dropdownRender={(menu) => (
                      <>
                        {/* ── Busca interna ── */}
                        <div
                          onMouseDown={(e) => e.preventDefault()}
                          style={{ padding: '8px 12px' }}
                        >
                          <Input
                            autoFocus
                            prefix={<SearchOutlined style={{ color: '#BFBFBF' }} />}
                            placeholder="Pesquisar colaborador..."
                            value={colSearch}
                            onChange={(e) => setColSearch(e.target.value)}
                            style={{
                              borderRadius: 6,
                              fontFamily: "'Montserrat', sans-serif",
                              fontSize: 13,
                            }}
                            allowClear
                          />
                        </div>

                        <Divider style={{ margin: 0 }} />

                        {/* ── Selecionar todos (filtrados) ── */}
                        <div
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={toggleSelectAllCols}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            userSelect: 'none',
                          }}
                        >
                          <Checkbox
                            checked={allFilteredSel}
                            indeterminate={someFilteredSel}
                          />
                          <Text style={{ fontSize: 13, fontFamily: "'Montserrat', sans-serif", color: colorTokens.textPrimary }}>
                            Selecionar todos{' '}
                            <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
                              — {filteredTotal} colaborador{filteredTotal !== 1 ? 'es' : ''}
                              {colSearch.trim() ? ' encontrados' : ''}
                            </Text>
                          </Text>
                        </div>

                        <Divider style={{ margin: 0 }} />

                        {/* ── Lista filtrada ── */}
                        {filteredTotal === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center' }}>
                            <Text style={{ fontSize: 13, color: colorTokens.textSecondary }}>
                              Nenhum colaborador encontrado
                            </Text>
                          </div>
                        ) : menu}
                      </>
                    )}
                    onDropdownVisibleChange={(open) => {
                      /* limpa busca ao fechar */
                      if (!open) setColSearch('')
                    }}
                    status={selectionEmpty ? 'error' : undefined}
                    size="middle"
                  />
                </div>
              </Form.Item>

            )}
          </Form>
        </div>

      {/* ── Modal cancelar ───────────────────────────────────── */}
      <CancelModal
        open={showCancel}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
        onCancel={() => setShowCancel(false)}
      />
    </StepPageLayout>
  )
}
