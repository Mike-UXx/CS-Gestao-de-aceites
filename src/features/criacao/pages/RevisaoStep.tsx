import { useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import {
  Typography, Button, Space, Modal, Tag, Divider,
  Tooltip, message, Checkbox, DatePicker, ConfigProvider,
} from 'antd'
import {
  FilePdfOutlined, EditOutlined,
  CalendarOutlined, CheckCircleFilled,
  ClockCircleOutlined, VerticalAlignBottomOutlined,
  CloseCircleOutlined, MailOutlined, WhatsAppOutlined,
} from '@ant-design/icons'
import ptBR from 'antd/locale/pt_BR'
import { useNavigate } from 'react-router-dom'
import { StepPageLayout } from '@/features/criacao/components/StepPageLayout'
import { CancelModal } from '@/features/criacao/components/CancelModal'
import { useDocumentForm } from '@/features/criacao/context/DocumentFormContext'
import {
  GESTOES_RESPONSAVEIS,
  DEPARTAMENTOS, COLABORADORES,
} from '@/data/mockClassifications'
import { classificacaoLabel } from '@/data/mockClassificacoes'
import { colorTokens } from '@/theme/tokens'

dayjs.locale('pt-br')

const { Text } = Typography
const FONT    = "'Montserrat', sans-serif"
const LABEL_W = 180

/* ─── Lookups ────────────────────────────────────────────────── */
const TEMPO_LABELS: Record<number, string> = {
  0: 'Sem trava', 60: '1 minuto', 120: '2 minutos',
  180: '3 minutos', 300: '5 minutos', 600: '10 minutos',
}
const RENOVACAO_LABELS: Record<string, string> = {
  sem_recorrencia: 'Sem recorrência',
  '6_meses':  'A cada 6 meses',
  '12_meses': 'A cada 12 meses',
  '24_meses': 'A cada 24 meses',
  personalizado: 'Personalizado',
}
function labelOf(list: { value: string; label: string }[], val: string) {
  return list.find((i) => i.value === val)?.label ?? val
}

/* ─── Linha de revisão ───────────────────────────────────────── */
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '7px 0' }}>
      <Text style={{
        flexShrink: 0, width: LABEL_W, fontSize: 13,
        fontFamily: FONT, fontWeight: 400, color: colorTokens.textSecondary,
      }}>
        {label}
      </Text>
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
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
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
  const { data, dispatch, saveDraft, clearDraft } = useDocumentForm()

  const [showCancel,  setShowCancel]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  /* ── Agendamento — estado local, validado apenas aqui ── */
  const [agendarEnvio,   setAgendarEnvio]   = useState<boolean>(!(data.envioImediato ?? true))
  const [dataLancamento, setDataLancamento] = useState<Dayjs | null>(
    data.dataLancamento ? dayjs(data.dataLancamento) : null
  )
  const [dataError, setDataError] = useState('')

  /* ── Derivados do agendamento ── */
  const hoje    = dayjs().startOf('day')
  const isToday = dataLancamento ? dataLancamento.startOf('day').isSame(hoje) : false

  /* ── Rótulo do botão principal ── */
  const actionLabel = agendarEnvio ? 'Confirmar agendamento' : 'Publicar agora'

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
  const classificacoesLabels = (data.classificacoes ?? []).map((v) => classificacaoLabel(v))
  const gestaoLabel    = labelOf(GESTOES_RESPONSAVEIS, data.gestaoResponsavel)
  const tempoLabel     = TEMPO_LABELS[data.tempoLeituraGlobal] ?? `${data.tempoLeituraGlobal}s`
  const renovacaoLabel =
    data.renovacaoAceite === 'personalizado'
      ? `A cada ${data.renovacaoMesesPersonalizado} meses`
      : RENOVACAO_LABELS[data.renovacaoAceite] ?? data.renovacaoAceite
  const cobrancaLimiteLabel = data.cobrancaMaxLembretes === 0
    ? 'sem limite'
    : `até ${data.cobrancaMaxLembretes} ${data.cobrancaMaxLembretes === 1 ? 'lembrete' : 'lembretes'}`
  const cobrancaLabel = data.cobrancaAutomatica
    ? `A cada ${data.cobrancaFrequenciaDias} dias · ${cobrancaLimiteLabel}`
    : 'Desativada'

  /* ── Tags de destinatários ── */
  const deptTags  = data.departamentos.map((v) => ({ label: labelOf(DEPARTAMENTOS, v), value: v }))
  const colabTags = data.colaboradores.map((v)  => ({ label: labelOf(COLABORADORES, v),  value: v }))

  /* ── Preview PDF ── */
  function handlePreviewPDF() {
    if (!data.file) { message.info('Arquivo não disponível para preview.'); return }
    window.open(URL.createObjectURL(data.file), '_blank', 'noopener,noreferrer')
  }

  /* ── Avançar: valida, persiste no contexto e abre confirm ── */
  function handleNext() {
    if (agendarEnvio && !dataLancamento) {
      setDataError('Selecione a data e hora do envio para continuar.')
      return
    }
    setDataError('')
    dispatch({
      type: 'SET_STEP',
      config: {
        envioImediato:  !agendarEnvio,
        dataLancamento: agendarEnvio && dataLancamento ? dataLancamento.toISOString() : '',
      },
    })
    setShowConfirm(true)
  }

  /* ── Confirmar envio ── */
  function handleConfirmSend() {
    setShowConfirm(false)
    clearDraft()
    dispatch({ type: 'RESET' })
    message.success(
      !agendarEnvio
        ? 'Documento publicado e enviado com sucesso!'
        : `Envio agendado para ${dataLancamento?.format('DD/MM/YYYY [às] HH:mm[h]')}.`,
      4,
    )
    navigate('/documentos')
  }

  /* ─── JSX ─────────────────────────────────────────────────────── */
  return (
    <StepPageLayout
      currentStep={3}
      onHeaderBack={() => navigate('/documentos')}
      onBack={() => navigate('/documentos/criar/regras')}
      onNext={handleNext}
      onSaveDraft={() => { saveDraft(3); navigate('/documentos', { state: { draftSaved: true } }) }}
      nextLabel={actionLabel}
    >

      {/* Banner de agendamento futuro */}
      {agendarEnvio && dataLancamento && !isToday && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#EEF2FF', border: `1px solid ${colorTokens.primary}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
        }}>
          <CalendarOutlined style={{ color: colorTokens.primary, fontSize: 15 }} />
          <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.primary }}>
            Este documento será disparado automaticamente em{' '}
            <strong>{dataLancamento.format('DD/MM/YYYY [às] HH:mm[h]')}</strong>.
          </Text>
        </div>
      )}

      {/* ─── Card de resumo ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', width: '100%' }}>

        {/* ══ BLOCO 1 — Informações ═════════════════════════════════ */}
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

        {data.description && (
          <ReviewRow
            label="Descrição"
            value={
              <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 400, color: colorTokens.textPrimary, display: 'block', maxWidth: 560 }}>
                {data.description}
              </Text>
            }
          />
        )}

        <ReviewRow
          label="Classificações"
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

        <ReviewRow
          label="Gestão responsável"
          value={<Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{gestaoLabel || '—'}</Text>}
        />

        <ReviewRow
          label="Vigência"
          value={
            data.possuiValidade ? (
              <Space size={6}>
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 13 }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>
                  {data.validadeInicio ? dayjs(data.validadeInicio).format('DD/MM/YYYY') : '—'}
                  {' '}até{' '}
                  {data.validadeFim ? dayjs(data.validadeFim).format('DD/MM/YYYY') : '—'}
                </Text>
              </Space>
            ) : (
              <Space size={6}>
                <CloseCircleOutlined style={{ color: colorTokens.textSecondary, fontSize: 13 }} />
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textSecondary }}>
                  Sem prazo de vigência
                </Text>
              </Space>
            )
          }
        />

        <Divider style={{ margin: '16px 0 4px' }} />

        {/* ══ BLOCO 2 — Destinatários ══════════════════════════════ */}
        <BlockHeader title="Destinatários" editRoute="/documentos/criar/destinatarios" />
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
            label="Destinatário(s)"
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

        {/* ══ BLOCO 3 — Regras e Envio ═════════════════════════════ */}
        <BlockHeader title="Regras e envio" editRoute="/documentos/criar/regras" />
        <Divider style={{ margin: '8px 0 4px' }} />

        <ReviewRow
          label="Aceite formal"
          value={
            data.exigeAceite ? (
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

        <ReviewRow
          label="Canais de notificação"
          value={
            <Space size={[4, 4]} wrap>
              {data.canalEmail && (
                <Tag style={{ fontFamily: FONT, borderRadius: 4, margin: 0 }} icon={<MailOutlined />}>
                  E-mail
                </Tag>
              )}
              {data.canalWhatsapp && (
                <Tag style={{ fontFamily: FONT, borderRadius: 4, margin: 0, color: '#25D366', borderColor: '#25D366' }} icon={<WhatsAppOutlined />}>
                  WhatsApp
                </Tag>
              )}
              {!data.canalEmail && !data.canalWhatsapp && (
                <Text style={{ fontFamily: FONT, color: colorTokens.textSecondary }}>—</Text>
              )}
            </Space>
          }
        />

        {data.exigeAceite && data.renovacaoAtiva && (
          <ReviewRow
            label="Renovação de aceite"
            value={
              <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{renovacaoLabel}</Text>
            }
          />
        )}

        {data.exigeAceite && (
          <>
            <ReviewRow
              label="Cobrança automática"
              value={
                <Space size={6}>
                  <ClockCircleOutlined style={{ color: data.cobrancaAutomatica ? colorTokens.primary : colorTokens.textSecondary }} />
                  <Text style={{
                    fontFamily: FONT, fontSize: 13, fontWeight: 500,
                    color: data.cobrancaAutomatica ? colorTokens.textPrimary : colorTokens.textSecondary,
                  }}>{cobrancaLabel}</Text>
                </Space>
              }
            />
            {data.prazoAssinaturaAtivo && (
              <ReviewRow
                label="Prazo para assinatura"
                value={
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>
                    Até {data.prazoAssinaturaDias} {data.prazoAssinaturaDias === 1 ? 'dia' : 'dias'} após o envio
                  </Text>
                }
              />
            )}
            <ReviewRow
              label="Encerramento"
              value={
                <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>
                  {data.encerramentoAutomatico
                    ? `Automático (100% de aceite${data.prazoAssinaturaAtivo ? ' ou fim do prazo' : ''})`
                    : 'Manual'}
                </Text>
              }
            />
          </>
        )}

        {data.exigeAceite && (
          <>
            <ReviewRow
              label="Trava de leitura"
              value={
                <Space size={6}>
                  <ClockCircleOutlined style={{ color: data.tempoLeituraGlobal > 0 ? colorTokens.primary : colorTokens.textSecondary }} />
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{tempoLabel}</Text>
                </Space>
              }
            />
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
          </>
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

      </div>{/* /card resumo */}

      {/* ══ BLOCO FINAL — Agendamento de envio ═══════════════════════ */}
      <div style={{
        background: '#fff', borderRadius: 8, padding: '24px 28px',
        width: '100%', marginTop: 12,
      }}>
        <Checkbox
          checked={agendarEnvio}
          onChange={(e) => {
            setAgendarEnvio(e.target.checked)
            if (!e.target.checked) setDataLancamento(null)
            setDataError('')
          }}
          style={{ fontFamily: FONT, alignItems: 'flex-start' }}
        >
          <div>
            <Text style={{
              fontSize: 13, fontFamily: FONT, fontWeight: 500,
              color: colorTokens.textPrimary, display: 'block',
            }}>
              Agendar data de envio?
            </Text>
            <Text style={{
              fontSize: 12, fontFamily: FONT, color: colorTokens.textSecondary,
              display: 'block', marginTop: 2,
            }}>
              Por padrão, o documento é enviado imediatamente após a publicação.
            </Text>
          </div>
        </Checkbox>

        {/* Campos de data e hora — exibidos apenas quando checkbox marcado */}
        {agendarEnvio && (
          <ConfigProvider locale={ptBR}>
            <div style={{ marginTop: 14, marginLeft: 24 }}>
              <Text style={{
                display: 'block', fontSize: 13, fontFamily: FONT,
                fontWeight: 500, marginBottom: 6, color: colorTokens.textPrimary,
              }}>
                Data e hora do envio <span style={{ color: colorTokens.error }}>*</span>
              </Text>
              <DatePicker
                style={{ fontFamily: FONT }}
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: 'HH:mm' }}
                placeholder="Selecione data e hora"
                value={dataLancamento}
                onChange={(d) => {
                  setDataLancamento(d ?? null)
                  setDataError('')
                }}
                disabledDate={(c) => c.isBefore(dayjs().startOf('day'))}
                status={dataError ? 'error' : undefined}
              />
              {dataError && (
                <Text style={{
                  display: 'block', fontSize: 12, color: colorTokens.error,
                  marginTop: 6, fontFamily: FONT,
                }}>
                  {dataError}
                </Text>
              )}
            </div>
          </ConfigProvider>
        )}
      </div>

      {/* Modal de confirmação */}
      <Modal
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onOk={handleConfirmSend}
        width={592}
        centered
        title={
          <Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>
            {!agendarEnvio ? 'Confirmar publicação do documento' : 'Confirmar agendamento de envio'}
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
            Você está prestes a{' '}
            <strong>{!agendarEnvio ? 'publicar e enviar' : 'agendar o envio d'}</strong>
            {!agendarEnvio ? ' ' : 'e '}
            este documento para <strong>{destLabel}</strong>.
          </p>
          {!agendarEnvio && (
            <p style={{ marginBottom: 8, color: '#52c41a' }}>
              <CheckCircleFilled style={{ marginRight: 6 }} />
              O documento será disponibilizado imediatamente após a confirmação.
            </p>
          )}
          {agendarEnvio && dataLancamento && (
            <p style={{ marginBottom: 8, color: colorTokens.primary }}>
              <CalendarOutlined style={{ marginRight: 6 }} />
              Disparo automático em <strong>{dataLancamento.format('DD/MM/YYYY [às] HH:mm[h]')}</strong>.
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
