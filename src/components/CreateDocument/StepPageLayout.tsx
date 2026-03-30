/**
 * StepPageLayout — wrapper reutilizável para todos os steps do fluxo.
 * Padroniza: header (Voltar | Título + Salvar rascunho | Stepper) e
 * footer de navegação (Anterior / Próximo) transparentes.
 *
 * Uso:
 *   <StepPageLayout
 *     currentStep={0}
 *     onBack={...}   onNext={...}   onSaveDraft={...}
 *     hasFormError={false}
 *   >
 *     {/* conteúdo do card branco *\/}
 *   </StepPageLayout>
 */

import { ReactNode } from 'react'
import { Button, Typography, Space } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { DocumentStepper } from '@/components/CreateDocument/DocumentStepper'
import { colorTokens } from '@/theme/tokens'

const { Title } = Typography

const FONT = "'Montserrat', sans-serif"

interface StepPageLayoutProps {
  /** Índice 0-based do step ativo no Stepper */
  currentStep: number
  /** Ação do link "← Voltar" no header (se omitido usa onBack) */
  onHeaderBack?: () => void
  /** Ação do botão "Anterior" no footer */
  onBack: () => void
  /** Chamado ao clicar "Próximo →" */
  onNext: () => void
  /** Chamado ao clicar "Salvar rascunho" */
  onSaveDraft: () => void
  /** Propaga estado de erro para o Stepper */
  hasFormError?: boolean
  /** Rótulo do botão de avanço (default: "Próximo") */
  nextLabel?: string
  /** Rótulo do botão de retorno (default: "Anterior") */
  backLabel?: string
  /** Oculta o botão Anterior no footer */
  hideBack?: boolean
  children: ReactNode
}

export function StepPageLayout({
  currentStep,
  onHeaderBack,
  onBack,
  onNext,
  onSaveDraft,
  hasFormError = false,
  nextLabel = 'Próximo',
  backLabel = 'Anterior',
  hideBack = false,
  children,
}: StepPageLayoutProps) {
  const handleHeaderBack = onHeaderBack ?? onBack
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 64px)',   /* desconta o AppHeader */
      }}
    >
      {/* ── HEADER — transparente, 3 níveis ─────────────────── */}
      <div style={{ padding: '16px 32px 0' }}>

        {/* Nível 1 — Voltar */}
        <button
          onClick={handleHeaderBack}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', marginBottom: 8,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: colorTokens.primary, fontSize: 13, fontWeight: 500,
            fontFamily: FONT,
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} />
          Voltar
        </button>

        {/* Nível 2 — Título + Salvar rascunho */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}
        >
          <Title
            level={3}
            style={{
              margin: 0, color: colorTokens.primary,
              fontSize: 24, lineHeight: '32px', fontWeight: 700,
              fontFamily: FONT,
            }}
          >
            Criar documento
          </Title>

          <Button
            onClick={onSaveDraft}
            style={{
              height: 40, fontWeight: 500, fontSize: 13, fontFamily: FONT,
              color: 'rgba(0,0,0,0.88)', background: '#fff',
              borderColor: '#D9D9D9', borderRadius: 8, boxShadow: 'none',
            }}
          >
            Salvar rascunho
          </Button>
        </div>

        {/* Nível 3 — Stepper */}
        <div style={{ paddingBottom: 16 }}>
          <DocumentStepper current={currentStep} hasError={hasFormError} />
        </div>
      </div>

      {/* ── CONTEÚDO — fundo cinza, card branco injetado via children ── */}
      <div
        style={{
          flex: 1,
          background: colorTokens.bgLayout,
          padding: '24px 32px 0',
        }}
      >
        {/* Card branco — responsabilidade do step filho */}
        {children}

        {/* ── FOOTER de navegação — transparente, 32px abaixo do card ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 32,
            paddingBottom: 32,
          }}
        >
          {/* Anterior */}
          {hideBack ? (
            <span />  /* mantém o space-between mesmo quando oculto */
          ) : (
            <Button
              onClick={onBack}
              style={{
                height: 40, minWidth: 120, fontWeight: 500,
                fontSize: 13, fontFamily: FONT,
                color: 'rgba(0,0,0,0.88)', background: '#fff',
                borderColor: '#D9D9D9', borderRadius: 8, boxShadow: 'none',
              }}
            >
              <Space size={6}>
                <ArrowLeftOutlined style={{ fontSize: 12 }} />
                {backLabel}
              </Space>
            </Button>
          )}

          {/* Próximo */}
          <Button
            type="primary"
            onClick={onNext}
            style={{
              height: 40, minWidth: 120, fontWeight: 600,
              fontSize: 13, fontFamily: FONT,
              background: colorTokens.primary,
              borderColor: colorTokens.primary,
              borderRadius: 8,
            }}
          >
            <Space size={6}>
              {nextLabel}
              <ArrowRightOutlined style={{ fontSize: 12 }} />
            </Space>
          </Button>
        </div>
      </div>
    </div>
  )
}
