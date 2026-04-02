import { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { Typography, Button, Space, Modal, Tag, Divider, Tooltip, message } from 'antd'
import {
  FilePdfOutlined, EditOutlined,
  CalendarOutlined, CheckCircleFilled,
  ClockCircleOutlined, VerticalAlignBottomOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import {
  CLASSIFICATIONS, GESTOES_RESPONSAVEIS,
  DEPARTAMENTOS, COLABORADORES,
} from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

const { Text } = Typography
const FONT   = "'Montserrat', sans-serif"
const LABEL_W = 180   // largura fixa da coluna de label (px)

/* ─── Lookups ────────────────────────────────────────────────── */
const TEMPO_LABELS: Record<number, string> = {
  0: 'Sem trava', 60: '1 minuto', 120: '2 minutos',
  180: '3 minutos', 300: '5 minutos', 600: '10 minutos',
}
const VALIDADE_LABELS: Record<string, string> = {
  sem_validade: 'Sem validade', '3_meses': '3 meses',
  '6_meses': '6 meses', '12_meses': '12 meses', '24_meses': '24 meses',
}
function labelOf(list: { value: string; label: string }[], val: string) {
  return list.find((i) => i.value === val)?.label ?? val
}

/* ─── Linha de revisão ───────────────────────────────────────── */
function ReviewRow({
  label, value,
}: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '7px 0' }}>
      {/* label */}
      <Text style={{
        flexShrink: 0,
        width: LABEL_W,
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: 400,
        color: colorTokens.textSecondary,
      }}>
        {label}
      </Text>
      {/* valor */}
      <div style={{ flex: 1, fontSize: 13, fontFamily: FONT, fontWeight: 500, color: colorTokens.textPrimary }}>
        {value}
      </div>
    </div>
  )
}

/* ─── Cabeçalho de bloco ─────────────────────────────────────── */
function BlockHeader({ title, editRoute }: { title: string; editRoute: string }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 4,
    }}>
      <Text strong style={{ fontSize: 14, fontFamily: FONT, color: colorTokens.textPrimary }}>
        {title}
      </Text>
      <Button
        type="link" size="small"
        icon={<EditOutlined style={{ fontSize: 12 }} />}
        onClick={() => navigate(editRoute)}
        style={{ color: colorTokens.primary, fontFamily: FONT, fontSize: 12, padding: 0 }}
      >
        Voltar e editar
      </Button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export function RevisaoStep() {
  const navigate = useNavigate()
  const { data, dispatch, saveDraft } = useDocumentForm()

  const [showCancel,  setShowCancel]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  /* ── Ação: enviar hoje ou agendar ── */
  const hoje       = dayjs().startOf('day')
  const lancamento = data.dataLancamento ? dayjs(data.dataLancamento) : null
  const isToday    = lancamento ? lancamento.startOf('day').isSame(hoje) : false
  const actionLabel = isToday ? 'Enviar documento' : 'Agendar envio'

  /* ── Contagem de destinatários ── */
  const totalDest =
    data.modalidadeEnvio === 'departamento'
      ? data.departamentos.length
      : data.colaboradores.length
  const destLabel =
    data.modalidadeEnvio === 'departamento'
      ? `${totalDest} departamento${totalDest !== 1 ? 's' : ''}`
      : `${totalDest} pessoa${totalDest !== 1 ? 's' : ''}`

  /* ── Labels resolvidos ── */
  const classificacoesLabels = (data.classificacoes ?? []).map((v) => labelOf(CLASSIFICATIONS, v))
  const gestaoLabel        = labelOf(GESTOES_RESPONSAVEIS, data.gestaoResponsavel)
  const tempoLabel         = TEMPO_LABELS[data.tempoLeituraGlobal] ?? `${data.tempoLeituraGlobal}s`
  const validadeLabel      = VALIDADE_LABELS[data.validadeAceite]  ?? data.validadeAceite

  /* ── Tags de destinatários ── */
  const deptTags  = data.departamentos.map((v) => ({ label: labelOf(DEPARTAMENTOS, v), value: v }))
  const colabTags = data.colaboradores.map((v)  => ({ label: labelOf(COLABORADORES, v),  value: v }))

  /* ── Preview PDF ── */
  function handlePreviewPDF() {
    if (!data.file) { message.info('Arquivo não disponível para preview.'); return }
    window.open(URL.createObjectURL(data.file), '_blank', 'noopener,noreferrer')
  }

  /* ── Confirmar envio ── */
  function handleConfirmSend() {
    setShowConfirm(false)
    dispatch({ type: 'RESET' })
    message.success(
      isToday
        ? 'Documento enviado com sucesso!'
        : `Envio agendado para ${lancamento?.format('DD/MM/YYYY')} às 08:00h.`,
      4,
    )
    navigate('/documentos/criar')
  }

  /* ─── JSX ─────────────────────────────────────────────────────── */
  return (
    <StepPageLayout
      currentStep={3}
      onHeaderBack={() => setShowCancel(true)}
      onBack={() => navigate('/documentos/criar/configuracoes')}
      onNext={() => setShowConfirm(true)}
      onSaveDraft={() => { saveDraft(); message.success('Rascunho salvo!') }}
      nextLabel={actionLabel}
    >

      {/* Banner de agendamento */}
      {!isToday && lancamento && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#EEF2FF', border: `1px solid ${colorTokens.primary}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
        }}>
          <CalendarOutlined style={{ color: colorTokens.primary, fontSize: 15 }} />
          <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.primary }}>
            Este documento será disparado automaticamente em{' '}
            <strong>{lancamento.format('DD/MM/YYYY')}</strong> às 08:00h.
          </Text>
        </div>
      )}

      {/* Card principal */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', width: '100%' }}>

        {/* ══ BLOCO 1 — Informações ═════════════════════════════ */}
        <BlockHeader title="Informações" editRoute="/documentos/criar/informacoes" />

        <Divider style={{ margin: '8px 0 4px' }} />

        <ReviewRow
          label="Arquivo"
          value={
            data.file ? (
              <Tooltip title="Clique para visualizar o PDF">
                <button
                  onClick={handlePreviewPDF}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0,
                    color: colorTokens.primary, fontFamily: FONT, fontSize: 13, fontWeight: 500,
                  }}
                >
                  <FilePdfOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
                  <span style={{ textDecoration: 'underline' }}>{data.file.name}</span>
                </button>
              </Tooltip>
            ) : (
              <Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>—</Text>
            )
          }
        />

        <ReviewRow
          label="Título"
          value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{data.fileName || '—'}</Text>}
        />

        <ReviewRow
          label="Classificação"
          value={
            classificacoesLabels.length > 0
              ? (
                <Space size={[4, 4]} wrap>
                  {classificacoesLabels.map((label) => (
                    <Tag key={label} color="blue" style={{ fontFamily: FONT, borderRadius: 4, fontWeight: 500, margin: 0 }}>
                      {label}
                    </Tag>
                  ))}
                </Space>
              )
              : <Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>—</Text>
          }
        />

        {data.description && (
          <ReviewRow
            label="Descrição"
            value={
              <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 400, color: colorTokens.textPrimary, maxWidth: 560, display: 'block' }}>
                {data.description}
              </Text>
            }
          />
        )}

        <ReviewRow
          label="Gestão responsável"
          value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{gestaoLabel || '—'}</Text>}
        />

        <Divider style={{ margin: '16px 0 4px' }} />

        {/* ══ BLOCO 2 — Público-alvo ════════════════════════════ */}
        <BlockHeader title="Público-alvo" editRoute="/documentos/criar/destinatarios" />

        <Divider style={{ margin: '8px 0 4px' }} />

        {data.modalidadeEnvio === 'departamento' ? (
          <ReviewRow
            label="Departamentos"
            value={
              deptTags.length > 0
                ? (
                  <Space size={[4, 4]} wrap>
                    {deptTags.map((d) => (
                      <Tag key={d.value} style={{ fontFamily: FONT, borderRadius: 4, margin: 0 }}>
                        {d.label}
                      </Tag>
                    ))}
                  </Space>
                )
                : <Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>—</Text>
            }
          />
        ) : (
          <ReviewRow
            label="Pessoas"
            value={
              colabTags.length > 0
                ? (
                  <Space size={[4, 4]} wrap>
                    {colabTags.slice(0, 8).map((c) => (
                      <Tag key={c.value} style={{ fontFamily: FONT, borderRadius: 4, margin: 0 }}>
                        {c.label}
                      </Tag>
                    ))}
                    {colabTags.length > 8 && (
                      <Tag style={{
                        fontFamily: FONT, borderRadius: 4, margin: 0,
                        background: colorTokens.primary, color: '#fff', border: 'none',
                      }}>
                        +{colabTags.length - 8} colaboradores
                      </Tag>
                    )}
                  </Space>
                )
                : <Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>—</Text>
            }
          />
        )}

        <Divider style={{ margin: '16px 0 4px' }} />

        {/* ══ BLOCO 3 — Configurações ═══════════════════════════ */}
        <BlockHeader title="Configurações" editRoute="/documentos/criar/configuracoes" />

        <Divider style={{ margin: '8px 0 4px' }} />

        <ReviewRow
          label="Tipo de documento"
          value={
            <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>
              {data.tipoDocumento === 'adesao' ? 'Documentos com versão' : 'Documentos sem versão'}
            </Text>
          }
        />

        <ReviewRow
          label="Aceite formal"
          value={
            data.exigeAceite !== false ? (
              <Space size={6}>
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 13 }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>Sim</Text>
              </Space>
            ) : (
              <Space size={6}>
                <CloseCircleOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textSecondary }}>Não exigido</Text>
              </Space>
            )
          }
        />

        {/* Campos exclusivos de Adesão */}
        {data.tipoDocumento === 'adesao' && data.vigenciaInicio && (
          <ReviewRow
            label="Vigência (início)"
            value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{dayjs(data.vigenciaInicio).format('DD/MM/YYYY')}</Text>}
          />
        )}
        {data.tipoDocumento === 'adesao' && data.vigenciaFim && (
          <ReviewRow
            label="Vigência (fim)"
            value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{dayjs(data.vigenciaFim).format('DD/MM/YYYY')}</Text>}
          />
        )}
        {data.exigeAceite !== false && data.tipoDocumento === 'adesao' && (
          <ReviewRow
            label="Recorrência do aceite"
            value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{validadeLabel}</Text>}
          />
        )}

        {/* Data de envio — sempre presente */}
        {lancamento && (
          <ReviewRow
            label="Data de envio"
            value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{lancamento.format('DD/MM/YYYY')}</Text>}
          />
        )}

        {data.exigeAceite !== false && (
          <ReviewRow
            label="Trava de leitura"
            value={
              <Space size={6}>
                <ClockCircleOutlined style={{ color: data.tempoLeituraGlobal > 0 ? colorTokens.primary : colorTokens.textSecondary }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{tempoLabel}</Text>
              </Space>
            }
          />
        )}

        {data.exigeAceite !== false && (
          <ReviewRow
            label="Scroll obrigatório"
            value={
              data.scrollObrigatorioGlobal ? (
                <Space size={6}>
                  <CheckCircleFilled style={{ color: '#52c41a', fontSize: 13 }} />
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>Sim</Text>
                </Space>
              ) : (
                <Space size={6}>
                  <CloseCircleOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textSecondary }}>Não</Text>
                </Space>
              )
            }
          />
        )}

        {data.personalizarPorDept && (
          <ReviewRow
            label="Personalização"
            value={
              <Space size={6}>
                <VerticalAlignBottomOutlined style={{ color: colorTokens.primary }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.primary }}>
                  Por departamentos ({data.departamentos.length} dept{data.departamentos.length !== 1 ? 's' : ''})
                </Text>
              </Space>
            }
          />
        )}

      </div>{/* /card */}

      {/* Modal de confirmação */}
      <Modal
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onOk={handleConfirmSend}
        width={592}
        centered
        title={
          <Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
            {isToday ? 'Confirmar envio do documento' : 'Confirmar agendamento de envio'}
          </Text>
        }
        okText={actionLabel}
        cancelText="Cancelar"
        okButtonProps={{
          style: {
            background: colorTokens.primary, borderColor: colorTokens.primary,
            fontFamily: FONT, fontWeight: 600, height: 40, borderRadius: 8,
          },
        }}
        cancelButtonProps={{
          style: { fontFamily: FONT, height: 40, borderRadius: 8, borderColor: '#D9D9D9' },
        }}
      >
        <div style={{ fontFamily: FONT }}>
          <p style={{ marginBottom: 8 }}>
            Você está prestes a <strong>{isToday ? 'enviar' : 'agendar'}</strong> este documento
            para <strong>{destLabel}</strong>.
          </p>
          {!isToday && lancamento && (
            <p style={{ marginBottom: 8, color: colorTokens.primary }}>
              <CalendarOutlined style={{ marginRight: 6 }} />
              Disparo automático em <strong>{lancamento.format('DD/MM/YYYY')}</strong> às 08:00h.
            </p>
          )}
          <p style={{ color: colorTokens.textSecondary, fontSize: 12, marginBottom: 0 }}>
            Esta ação não poderá ser desfeita após o disparo. Deseja continuar?
          </p>
        </div>
      </Modal>

      {/* Modal de cancelamento */}
      <CancelModal
        open={showCancel}
        onConfirm={() => { dispatch({ type: 'RESET' }); navigate('/documentos/criar') }}
        onCancel={() => setShowCancel(false)}
      />
    </StepPageLayout>
  )
}
