import { useState } from 'react'
import { Typography, Tag, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { NewDocumentCard } from '@/components/documents/NewDocumentCard'
import { TemplateCard } from '@/components/documents/TemplateCard'
import { colorTokens, spacing } from '@/theme/tokens'

const { Title, Text } = Typography

const FILTER_TAGS = ['Todos', 'Política', 'Termos de conduta', 'Segurança da informação']

const TEMPLATES = [
  {
    id: 'codigo-conduta',
    title: 'Código de conduta',
    description:
      'Estabelece princípios éticos e regras de comportamento dentro da empresa. Utilizado para formalizar o compromisso dos colaboradores com os valores e normas organizacionais.',
    headerColor: '#C96878',
    tags: ['Política', 'Termos de conduta'],
  },
  {
    id: 'seguranca-informacao',
    title: 'Segurança da informação',
    description:
      'Define regras para proteção de dados, acesso a sistemas e uso seguro das informações. Ajuda a prevenir vazamento de dados e reforçar boas práticas de segurança digital.',
    headerColor: '#2E4DA0',
    tags: ['Segurança da informação'],
  },
  {
    id: 'termo-confidencialidade',
    title: 'Termo de confidencialidade',
    description:
      'Formaliza o compromisso do colaborador em manter informações da empresa em sigilo. Indicado para proteger dados estratégicos, processos internos e informações sensíveis.',
    headerColor: '#1B2B6E',
    tags: ['Termos de conduta'],
  },
  {
    id: 'entrega-equipamentos',
    title: 'Entrega de equipamentos',
    description:
      'Registra a entrega de equipamentos da empresa ao colaborador. Utilizado para formalizar responsabilidade sobre uso e conservação dos dispositivos.',
    headerColor: '#D97320',
    tags: ['Termos de conduta'],
  },
  {
    id: 'politica-privacidade',
    title: 'Política de privacidade (LGPD)',
    description:
      'Apresenta diretrizes sobre coleta, uso e proteção de dados pessoais na empresa. Garante que colaboradores estejam cientes das práticas relacionadas à LGPD.',
    headerColor: '#0D9488',
    tags: ['Política'],
  },
]

export function SelectTemplate() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('Todos')

  const filtered =
    activeFilter === 'Todos'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.tags.includes(activeFilter))

  return (
    <div
      style={{
        padding: `${spacing.pagePadding}px`,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: colorTokens.textSecondary,
          fontSize: 13,
          padding: 0,
          marginBottom: 12,
        }}
      >
        <ArrowLeftOutlined style={{ fontSize: 12 }} />
        Voltar
      </button>

      {/* Page title */}
      <Title level={3} style={{ margin: '0 0 4px', color: colorTokens.textPrimary, fontWeight: 700 }}>
        Criar documento
      </Title>
      <Text style={{ fontSize: 14, color: colorTokens.textSecondary, marginBottom: 24, display: 'block' }}>
        Comece com um novo documento ou use um de nossos modelos para agilizar o processo
      </Text>

      {/* Filter tags */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTER_TAGS.map((tag) => (
          <Tag
            key={tag}
            onClick={() => setActiveFilter(tag)}
            style={{
              cursor: 'pointer',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: activeFilter === tag ? 600 : 400,
              background: activeFilter === tag ? colorTokens.primary : 'transparent',
              color: activeFilter === tag ? '#fff' : colorTokens.textSecondary,
              borderColor: activeFilter === tag ? colorTokens.primary : colorTokens.border,
              userSelect: 'none',
              margin: 0,
            }}
          >
            {tag}
          </Tag>
        ))}
      </div>

      {/* Cards grid */}
      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        {/* New document card always first */}
        <Col xs={24} sm={12} lg={8}>
          <NewDocumentCard onCreate={() => navigate('/documentos/criar/informacoes')} />
        </Col>

        {filtered.map((template) => (
          <Col key={template.id} xs={24} sm={12} lg={8}>
            <TemplateCard
              title={template.title}
              description={template.description}
              headerColor={template.headerColor}
              onDownload={() => {
                /* TODO: download handler */
              }}
            />
          </Col>
        ))}
      </Row>
    </div>
  )
}
