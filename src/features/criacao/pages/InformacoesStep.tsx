import { useState, useRef } from 'react'
import {
  Form, Input, Select, Button, Typography,
  Tooltip, Spin, Space, message, Row, Col,
} from 'antd'
import {
  InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled,
  InboxOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import { computeSha256, validatePdfFile } from '@/features/criacao/utils/fileHash'
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS, EXISTING_DOCUMENT_NAMES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

const { Text } = Typography
const { TextArea } = Input

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
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { data, dispatch, saveDraft } = useDocumentForm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(
    data.file ? 'success' : 'idle'
  )
  const [fileError, setFileError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [hasFormError, setHasFormError] = useState(false)

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
    try {
      await form.validateFields()
      if (uploadStatus !== 'success') {
        setFileError('Campo de seleção obrigatória'); setHasFormError(true); return
      }
      setHasFormError(false)
      navigate('/documentos/criar/destinatarios')
    } catch {
      if (uploadStatus !== 'success') setFileError('Campo de seleção obrigatória')
      setHasFormError(true)
    }
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
      onHeaderBack={() => setShowCancel(true)}
      onBack={() => setShowCancel(true)}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(); message.success('Rascunho salvo!') }}
      hasFormError={hasFormError}
      backLabel="Cancelar"
    >
      {/* ── Content card ─────────────────────────────────────── */}
      <div style={{ overflowY: 'auto' }}>
        {/* Cartão branco do formulário — full width */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          border: `1px solid ${colorTokens.border}`,
          padding: '28px 32px 32px',
          width: '100%',
        }}
          className="form-card">
          {/* Card title */}
          <Text strong style={{ fontSize: 15, color: colorTokens.textPrimary, display: 'block', marginBottom: 2 }}>
            Informações do documento
          </Text>
          <Text style={{ fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 28 }}>
            Configure nome, arquivo e classificação do documento.
          </Text>

          <Row>
          <Col span={24}>

          {/* ── Upload ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 6 }}>
              <FieldLabel
                label="Arquivo do documento"
                required
                tooltip="Selecione o arquivo que será enviado para os colaboradores. Caso tenha utilizado um de nossos modelos (Word), realize as edições com os dados da sua empresa offline e faça o upload da versão final convertida em PDF aqui"
              />
            </div>

            <div
              onClick={() => uploadStatus !== 'loading' && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); if (uploadStatus !== 'loading') setUploadStatus('dragging') }}
              onDragLeave={() => { if (uploadStatus === 'dragging') setUploadStatus('idle') }}
              style={{
                border: `1.5px dashed ${zoneBorder}`,
                borderRadius: 8,
                background: zoneBg,
                padding: '32px 24px',
                textAlign: 'center',
                cursor: uploadStatus === 'loading' ? 'wait' : 'pointer',
                transition: 'border-color .2s, background .2s',
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
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    type="text"
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
              <Text style={{ fontSize: 12, color: colorTokens.error, display: 'block', marginTop: 4 }}>
                {fileError}
              </Text>
            )}
          </div>

          {/* ── Form ── */}
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              nome: data.fileName || undefined,
              descricao: data.description || undefined,
              classificacao: data.classificacao || undefined,
              gestaoResponsavel: data.gestaoResponsavel || undefined,
            }}
            requiredMark={false}
            style={{ gap: 0 }}
          >
            {/* Nome */}
            <Form.Item
              name="nome"
              label={<FieldLabel label="Nome do documento" required />}
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
                placeholder="Ex: Código de conduta"
                size="middle"
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'fileName', value: e.target.value })}
              />
            </Form.Item>

            {/* Descrição */}
            <Form.Item
              name="descricao"
              label={<Text style={{ fontSize: 13, color: colorTokens.textPrimary, fontWeight: 500 }}>Descrição</Text>}
              style={{ marginBottom: 20 }}
            >
              <TextArea
                placeholder="Descreva o objetivo e conteúdo"
                rows={3}
                maxLength={100}
                showCount={{ formatter: ({ count, maxLength }) => `${count} / ${maxLength}` }}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })}
                style={{ resize: 'none' }}
              />
            </Form.Item>

            {/* Classificação */}
            <Form.Item
              name="classificacao"
              label={
                <FieldLabel
                  label="Classificação"
                  required
                  tooltip="Categorize o documento (ex: Política, Cartilha) para facilitar a organização do repositório e a geração de indicadores automáticos em seus relatórios de auditoria"
                />
              }
              rules={[{ required: true, message: 'Campo de seleção obrigatória' }]}
              style={{ marginBottom: 20 }}
            >
              <Select
                placeholder="Selecione"
                options={CLASSIFICATIONS}
                onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'classificacao', value: v })}
              />
            </Form.Item>

            {/* Gestão responsável */}
            <Form.Item
              name="gestaoResponsavel"
              label={
                <FieldLabel
                  label="Gestão responsável"
                  required
                  tooltip="Defina o grupo (empresa) ou setor encarregado pela conformidade deste documento. Isso determina quem terá permissão para gerenciar e visualizar os logs de aceite"
                />
              }
              rules={[{ required: true, message: 'Campo de seleção obrigatória' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Selecione"
                options={GESTOES_RESPONSAVEIS}
                onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'gestaoResponsavel', value: v })}
              />
            </Form.Item>
          </Form>

          </Col>
          </Row>
        </div>

      </div>

      <CancelModal
        open={showCancel}
        onCancel={() => setShowCancel(false)}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
      />
    </StepPageLayout>
  )
}
