import { useState, useRef } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  Form, Input, Select, Button, Typography,
  Tooltip, Spin, Space, Row, Col, Alert,
  Checkbox, Divider, DatePicker, ConfigProvider,
} from 'antd'
import {
  InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled,
  InboxOutlined, DeleteOutlined,
} from '@ant-design/icons'
import ptBR from 'antd/locale/pt_BR'
import { useNavigate, useLocation } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import { computeSha256, validatePdfFile } from '@/features/criacao/utils/fileHash'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS, EXISTING_DOCUMENT_NAMES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

const { Text } = Typography
const { TextArea } = Input
const FONT = "'Montserrat', sans-serif"

type UploadStatus = 'idle' | 'dragging' | 'loading' | 'success' | 'error'

/* ─── Label com asterisco e tooltip opcionais ─────────────────── */
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
export function InformacoesStep() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const fromTemplate = (location.state as { fromTemplate?: boolean } | null)?.fromTemplate ?? false
  const editMode     = (location.state as { editMode?: boolean } | null)?.editMode ?? false
  const [form] = Form.useForm()
  const { data, dispatch, saveDraft } = useDocumentForm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    data.file ? 'success' : 'idle'
  )
  const [fileError,     setFileError]     = useState('')
  const [showCancel,    setShowCancel]    = useState(false)
  const [hasFormError,  setHasFormError]  = useState(false)

  /* ── Validade ── */
  const [possuiValidade, setPossuiValidade] = useState<boolean>(data.possuiValidade ?? false)
  const [validadeInicio, setValidadeInicio] = useState<Dayjs | null>(
    data.validadeInicio ? dayjs(data.validadeInicio) : null
  )
  const [validadeFim, setValidadeFim] = useState<Dayjs | null>(
    data.validadeFim ? dayjs(data.validadeFim) : null
  )
  const [validadeError, setValidadeError] = useState('')

  /* ── File ── */
  async function processFile(file: File) {
    const err = validatePdfFile(file)
    if (err) { setFileError(err); setUploadStatus('error'); return }
    setFileError(''); setUploadStatus('loading')
    try {
      const hash = await computeSha256(file)
      dispatch({ type: 'SET_FILE', file, hash })
      const autoName = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
      if (!form.getFieldValue('nome')) {
        form.setFieldValue('nome', autoName)
        dispatch({ type: 'SET_FIELD', field: 'fileName', value: autoName })
      }
      setUploadStatus('success')
    } catch {
      setFileError('Erro ao processar o arquivo. Tente novamente.')
      setUploadStatus('error')
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setUploadStatus('idle')
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function removeFile() {
    dispatch({ type: 'SET_FILE', file: null as unknown as File, hash: '' })
    setUploadStatus('idle'); setFileError('')
  }

  /* ── Submit ── */
  async function handleNext() {
    let hasError = false
    try {
      await form.validateFields()
    } catch {
      hasError = true
    }

    if (!editMode && uploadStatus !== 'success') {
      setFileError('Campo de seleção obrigatória'); hasError = true
    }

    if (possuiValidade && (!validadeInicio || !validadeFim)) {
      setValidadeError('Informe a data de início e fim de validade.')
      hasError = true
    } else {
      setValidadeError('')
    }

    if (hasError) { setHasFormError(true); return }

    setHasFormError(false)
    dispatch({
      type: 'SET_STEP',
      config: {
        possuiValidade,
        validadeInicio: possuiValidade && validadeInicio ? validadeInicio.toISOString() : '',
        validadeFim:    possuiValidade && validadeFim    ? validadeFim.toISOString()    : '',
      },
    })
    navigate('/documentos/criar/destinatarios', editMode ? { state: { editMode: true } } : undefined)
  }

  /* ── Upload zone tokens ── */
  const zoneBorder =
    uploadStatus === 'error'    ? colorTokens.error
    : uploadStatus === 'dragging' ? colorTokens.primary
    : uploadStatus === 'success'  ? colorTokens.success
    : '#D9D9D9'

  const zoneBg =
    uploadStatus === 'error'   ? '#FFF2F0'
    : uploadStatus === 'dragging' ? '#EEF2FF'
    : '#FAFAFA'

  return (
    <StepPageLayout
      currentStep={0}
      onHeaderBack={() => navigate('/documentos')}
      onBack={() => setShowCancel(true)}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(0); navigate('/documentos', { state: { draftSaved: true } }) }}
      hasFormError={hasFormError}
      backLabel="Cancelar"
    >
      {/* ── Alert: modo de edição ────────────────────────────── */}
      {editMode && (
        <Alert
          type="warning" showIcon
          style={{ marginBottom: 16, fontFamily: FONT, borderRadius: 8, fontSize: 13 }}
          message={
            <span style={{ fontWeight: 600, fontFamily: FONT }}>Modo de Edição</span>
          }
          description={
            <span style={{ fontFamily: FONT, fontSize: 13 }}>
              Somente <strong>Título</strong> e <strong>Classificações</strong> podem ser alterados em documentos ativos.
              Os demais campos estão bloqueados.
            </span>
          }
        />
      )}

      {/* ── Alert: modelo baixado ────────────────────────────── */}
      {fromTemplate && (
        <Alert
          type="info" showIcon
          style={{ marginBottom: 16, fontFamily: FONT, borderRadius: 8, fontSize: 13 }}
          message={
            <span style={{ fontWeight: 600, fontFamily: FONT }}>Modelo baixado com sucesso! 📄</span>
          }
          description={
            <span style={{ fontFamily: FONT, fontSize: 13 }}>
              Edite o modelo offline e faça o upload da versão final em PDF no campo{' '}
              <strong>"Arquivo do documento"</strong>.
            </span>
          }
        />
      )}

      {/* ── Card branco ──────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12,
        border: `1px solid ${colorTokens.border}`,
        padding: '28px 32px 32px', width: '100%',
      }}>
        <Text strong style={{ fontSize: 15, color: colorTokens.textPrimary, display: 'block', marginBottom: 2, fontFamily: FONT }}>
          Informações do documento
        </Text>
        <Text style={{ fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 28, fontFamily: FONT }}>
          Configure as principais informações do documento a ser enviado.
        </Text>

        <Row>
        <Col span={24}>

        {/* ── Upload ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6 }}>
            <FieldLabel
              label="Arquivo do documento"
              required
              tooltip="Selecione o arquivo em PDF. Caso tenha usado um modelo, edite offline e faça o upload da versão final convertida."
            />
          </div>

          <div
            onClick={() => !editMode && uploadStatus !== 'loading' && fileInputRef.current?.click()}
            onDrop={editMode ? undefined : handleDrop}
            onDragOver={(e) => { e.preventDefault(); if (!editMode && uploadStatus !== 'loading') setUploadStatus('dragging') }}
            onDragLeave={() => { if (uploadStatus === 'dragging') setUploadStatus('idle') }}
            style={{
              border: `1.5px dashed ${zoneBorder}`,
              borderRadius: 8, background: zoneBg,
              padding: '32px 24px', textAlign: 'center',
              cursor: editMode ? 'not-allowed' : uploadStatus === 'loading' ? 'wait' : 'pointer',
              transition: 'border-color .2s, background .2s',
              opacity: editMode ? 0.5 : 1,
              pointerEvents: editMode ? 'none' : undefined,
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handleFileInput} />

            {uploadStatus === 'loading' && (
              <Space direction="vertical" size={10}>
                <Spin size="large" />
                <Text style={{ fontSize: 12, color: colorTokens.textSecondary }}>
                  Verificando arquivo e gerando hash SHA-256…
                </Text>
              </Space>
            )}

            {uploadStatus === 'success' && data.file && (
              <Space direction="vertical" size={6}>
                <CheckCircleFilled style={{ fontSize: 36, color: colorTokens.success }} />
                <Text strong style={{ fontSize: 13, color: colorTokens.textPrimary }}>{data.file.name}</Text>
                <Text style={{ fontSize: 11, color: colorTokens.textSecondary, fontFamily: 'monospace' }}>
                  SHA-256: {data.fileHash.slice(0, 20)}…
                </Text>
                <Button
                  icon={<DeleteOutlined />} size="small" danger type="text"
                  onClick={(e) => { e.stopPropagation(); removeFile() }}
                  style={{ fontSize: 12 }}
                >
                  Remover
                </Button>
              </Space>
            )}

            {(uploadStatus === 'idle' || uploadStatus === 'dragging') && (
              <Space direction="vertical" size={6}>
                <InboxOutlined style={{
                  fontSize: 36,
                  color: uploadStatus === 'dragging' ? colorTokens.primary : '#BFBFBF',
                  transition: 'color .2s',
                }} />
                <div>
                  <Text strong style={{ fontSize: 13, color: colorTokens.textSecondary, display: 'block' }}>
                    Faça upload do arquivo em PDF
                  </Text>
                  <Text style={{ fontSize: 12, color: '#BFBFBF' }}>
                    Arraste o arquivo aqui ou clique para selecionar
                  </Text>
                </div>
              </Space>
            )}

            {uploadStatus === 'error' && (
              <Space direction="vertical" size={6}>
                <CloseCircleFilled style={{ fontSize: 36, color: colorTokens.error }} />
                <div>
                  <Text strong style={{ fontSize: 13, color: colorTokens.textSecondary, display: 'block' }}>
                    Faça upload do arquivo em PDF
                  </Text>
                  <Text style={{ fontSize: 12, color: '#BFBFBF' }}>
                    Arraste o arquivo aqui ou clique para selecionar
                  </Text>
                </div>
              </Space>
            )}
          </div>

          {fileError && (
            <Text style={{ fontSize: 12, color: colorTokens.error, display: 'block', marginTop: 4, fontFamily: FONT }}>
              {fileError}
            </Text>
          )}
        </div>

        {/* ── Formulário ── */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            nome:             data.fileName       || undefined,
            descricao:        data.description    || undefined,
            classificacoes:   data.classificacoes?.length ? data.classificacoes : undefined,
            gestaoResponsavel: data.gestaoResponsavel || undefined,
          }}
          requiredMark={false}
        >
          {/* Nome */}
          <Form.Item
            name="nome"
            label={<FieldLabel label="Título do documento" required />}
            rules={[
              { required: true, message: 'Campo de preenchimento obrigatória' },
              {
                validator: async (_, value: string) => {
                  if (!value?.trim()) return
                  const dup = EXISTING_DOCUMENT_NAMES.some(
                    (n) => n.toLowerCase() === value.trim().toLowerCase()
                  )
                  if (dup) throw new Error('Já existe um documento cadastrado com o nome informado')
                },
              },
            ]}
            style={{ marginBottom: 20 }}
          >
            <Input
              placeholder="Ex: Código de Conduta 2026"
              size="middle"
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'fileName', value: e.target.value })}
            />
          </Form.Item>

          {/* Descrição */}
          <Form.Item
            name="descricao"
            label={<Text style={{ fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500, fontFamily: FONT }}>Descrição</Text>}
            style={{ marginBottom: 20 }}
          >
            <TextArea
              placeholder="Descreva o objetivo e conteúdo"
              rows={3}
              maxLength={100}
              showCount={{ formatter: ({ count, maxLength }) => `${count} / ${maxLength}` }}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
              style={{ resize: 'none' }}
              disabled={editMode}
            />
          </Form.Item>

          {/* Classificação */}
          <Form.Item
            name="classificacoes"
            label={
              <FieldLabel
                label="Classificações"
                required
                tooltip="Categorize o documento (ex: Política, Cartilha). Selecione quantas categorias forem necessárias."
              />
            }
            rules={[{ required: true, message: 'Campo de seleção obrigatória' }]}
            style={{ marginBottom: 20 }}
          >
            <Select
              mode="multiple"
              placeholder="Selecione"
              options={CLASSIFICATIONS}
              maxTagCount="responsive"
              maxTagPlaceholder={(omitted) => (
                <span style={{ color: colorTokens.primary }}>+{omitted.length}</span>
              )}
              onChange={(vals: string[]) =>
                dispatch({ type: 'SET_MULTI', field: 'classificacoes', value: vals })
              }
            />
          </Form.Item>

          {/* Gestão responsável */}
          <Form.Item
            name="gestaoResponsavel"
            label={
              <FieldLabel
                label="Gestão responsável"
                required
                tooltip="Defina o grupo ou setor encarregado pela conformidade deste documento."
              />
            }
            rules={[{ required: true, message: 'Campo de seleção obrigatória' }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="Selecione"
              options={GESTOES_RESPONSAVEIS}
              onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'gestaoResponsavel', value: v })}
              disabled={editMode}
            />
          </Form.Item>
        </Form>

        {/* ══ VIGÊNCIA ══════════════════════════════════════════════ */}
        <Divider style={{ margin: '24px 0 20px' }} />

        {/* Checkbox com help text aninhado */}
        <Checkbox
          checked={possuiValidade}
          onChange={(e) => {
            setPossuiValidade(e.target.checked)
            if (!e.target.checked) {
              setValidadeInicio(null)
              setValidadeFim(null)
              setValidadeError('')
            }
          }}
          style={{ fontFamily: FONT, alignItems: 'flex-start' }}
          disabled={editMode}
        >
          <div>
            <Text style={{ fontSize: 13, fontFamily: FONT, fontWeight: 500, color: colorTokens.textPrimary, display: 'block' }}>
              Este documento possui prazo de vigência?
            </Text>
            <Text style={{ fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary, display: 'block', marginTop: 2 }}>
              Determine o período em que este documento será considerado válido no sistema antes de expirar.
            </Text>
          </div>
        </Checkbox>

        {/* RangePicker — aparece apenas se checkbox marcado */}
        {possuiValidade && (
          <ConfigProvider locale={ptBR}>
            <div style={{ marginTop: 14, marginLeft: 24 }}>
              <Text style={{ display: 'block', fontSize: 13, fontFamily: FONT, fontWeight: 500, marginBottom: 6, color: colorTokens.textPrimary }}>
                Período de vigência <span style={{ color: colorTokens.error }}>*</span>
              </Text>
              <DatePicker.RangePicker
                style={{ fontFamily: FONT }}
                format="DD/MM/YYYY"
                placeholder={['Data de início', 'Data de término']}
                value={[validadeInicio, validadeFim]}
                onChange={(dates) => {
                  setValidadeInicio(dates?.[0] ?? null)
                  setValidadeFim(dates?.[1] ?? null)
                  setValidadeError('')
                }}
                disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                separator="→"
                disabled={editMode}
              />
            </div>
          </ConfigProvider>
        )}

        {validadeError && (
          <Text style={{ fontSize: 12, color: colorTokens.error, display: 'block', marginTop: 8, fontFamily: FONT }}>
            {validadeError}
          </Text>
        )}

        </Col>
        </Row>
      </div>

      <CancelModal
        open={showCancel}
        onCancel={() => setShowCancel(false)}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
      />
    </StepPageLayout>
  )
}
