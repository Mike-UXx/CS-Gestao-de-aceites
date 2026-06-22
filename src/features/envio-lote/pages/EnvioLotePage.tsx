/* ─────────────────────────────────────────────────────────────
   src/features/envio-lote/pages/EnvioLotePage.tsx
   Envio em lote (dor #2 / tela B3): seleciona vários documentos de um
   catálogo e envia todos para o MESMO público, com regras compartilhadas.
   Resolve o caso "15 documentos de admissão para um novo colaborador".
───────────────────────────────────────────────────────────── */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Button, Checkbox, Tag, Radio, Select, Space, InputNumber, message,
} from 'antd'
import {
  ArrowLeftOutlined, FileTextOutlined, SendOutlined, CheckOutlined,
} from '@ant-design/icons'
import { DEPARTAMENTOS, COLABORADORES } from '@/data/mockClassifications'
import { colorTokens } from '@/theme/tokens'

const FONT = "'Montserrat', sans-serif"
const { Text } = Typography

interface ModeloLote {
  id: string
  titulo: string
  /** adesao = exige aceite · ciencia = informativo */
  tipo: 'adesao' | 'ciencia'
}

/** Catálogo de modelos prontos (ex.: pacote de admissão). */
const CATALOGO: ModeloLote[] = [
  { id: 'codigo-conduta',        titulo: 'Código de Conduta e Ética',            tipo: 'adesao' },
  { id: 'confidencialidade',     titulo: 'Termo de Confidencialidade',           tipo: 'adesao' },
  { id: 'seguranca-info',        titulo: 'Política de Segurança da Informação',  tipo: 'adesao' },
  { id: 'lgpd',                  titulo: 'Política de Privacidade (LGPD)',       tipo: 'adesao' },
  { id: 'entrega-equipamento',   titulo: 'Termo de Entrega de Equipamentos',     tipo: 'adesao' },
  { id: 'home-office',           titulo: 'Política de Home Office',              tipo: 'ciencia' },
  { id: 'uso-sistemas',          titulo: 'Acordo de Uso de E-mail e Sistemas',   tipo: 'adesao' },
  { id: 'anticorrupcao',         titulo: 'Política Anticorrupção',               tipo: 'adesao' },
  { id: 'beneficios',            titulo: 'Termo de Ciência de Benefícios',       tipo: 'ciencia' },
  { id: 'onboarding',            titulo: 'Manual de Integração — Onboarding',    tipo: 'ciencia' },
]

/** Atalho: pacote de admissão (pré-seleção). */
const PACOTE_ADMISSAO = CATALOGO.map((m) => m.id)

export function EnvioLotePage() {
  const navigate = useNavigate()

  const [selecionados, setSelecionados] = useState<string[]>([])
  const [modalidade,   setModalidade]   = useState<'departamento' | 'pessoa'>('pessoa')
  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [colaboradores, setColaboradores] = useState<string[]>([])
  const [exigeAceite,  setExigeAceite]  = useState(true)
  const [prazoAtivo,   setPrazoAtivo]   = useState(false)
  const [prazoDias,    setPrazoDias]    = useState(15)
  const [enviando,     setEnviando]     = useState(false)

  const totalDocs = selecionados.length
  const destinatariosCount = modalidade === 'pessoa' ? colaboradores.length : departamentos.length
  const podeEnviar = totalDocs > 0 && destinatariosCount > 0

  const resumoPublico = useMemo(() => {
    if (modalidade === 'pessoa') {
      return colaboradores.length
        ? `${colaboradores.length} colaborador(es)`
        : 'nenhum colaborador'
    }
    return departamentos.length
      ? `${departamentos.length} departamento(s)`
      : 'nenhum departamento'
  }, [modalidade, colaboradores, departamentos])

  function toggleDoc(id: string, checked: boolean) {
    setSelecionados((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))
  }

  function handleEnviar() {
    if (!podeEnviar) return
    setEnviando(true)
    setTimeout(() => {
      setEnviando(false)
      message.success(`${totalDocs} documento(s) enviado(s) para ${resumoPublico}.`, 4)
      navigate('/documentos')
    }, 1000)
  }

  return (
    <div style={{ padding: '28px 32px 120px', fontFamily: FONT }}>
      {/* Voltar + cabeçalho */}
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/documentos')}
        style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: colorTokens.primary, padding: 0, marginBottom: 8 }}>
        Voltar
      </Button>
      <Typography.Title level={2} style={{ fontFamily: FONT, color: colorTokens.primary, margin: 0, fontSize: 26, fontWeight: 700, lineHeight: '34px' }}>
        Envio em lote
      </Typography.Title>
      <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
        Selecione vários documentos e envie todos de uma vez para o mesmo público — ideal para admissão de novos colaboradores.
      </Text>

      {/* ── 1. Documentos ── */}
      <Section numero={1} titulo="Documentos do lote" subtitulo="Escolha os modelos que serão enviados.">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Space size={8} wrap>
            <Button size="small" onClick={() => setSelecionados(PACOTE_ADMISSAO)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, borderRadius: 6, borderColor: colorTokens.primary, color: colorTokens.primary }}>
              Selecionar pacote de admissão
            </Button>
            {selecionados.length > 0 && (
              <Button size="small" type="text" onClick={() => setSelecionados([])} style={{ fontFamily: FONT, fontSize: 12, color: colorTokens.textSecondary }}>
                Limpar
              </Button>
            )}
          </Space>
          <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: totalDocs > 0 ? colorTokens.primary : colorTokens.textSecondary }}>
            {totalDocs} selecionado(s)
          </Text>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {CATALOGO.map((m) => {
            const checked = selecionados.includes(m.id)
            return (
              <label key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${checked ? colorTokens.primary : '#EBEBEB'}`,
                background: checked ? '#F7F8FF' : '#fff', transition: 'all .12s',
              }}>
                <Checkbox checked={checked} onChange={(e) => toggleDoc(m.id, e.target.checked)} />
                <FileTextOutlined style={{ color: checked ? colorTokens.primary : '#BFBFBF', fontSize: 16, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: colorTokens.textPrimary, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.titulo}
                  </Text>
                  <Tag style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, borderRadius: 4, margin: 0, marginTop: 2,
                    color: m.tipo === 'adesao' ? colorTokens.primary : '#0E9E97',
                    background: m.tipo === 'adesao' ? '#EEF2FF' : '#E6FFFB',
                    border: `1px solid ${m.tipo === 'adesao' ? '#C3CAF5' : '#87E8DE'}` }}>
                    {m.tipo === 'adesao' ? 'Exige aceite' : 'Apenas leitura'}
                  </Tag>
                </div>
                {checked && <CheckOutlined style={{ color: colorTokens.primary, fontSize: 12 }} />}
              </label>
            )
          })}
        </div>
      </Section>

      {/* ── 2. Destinatários ── */}
      <Section numero={2} titulo="Destinatários" subtitulo="Um único público recebe todos os documentos do lote.">
        <Radio.Group
          value={modalidade}
          onChange={(e) => setModalidade(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          style={{ marginBottom: 16 }}
        >
          <Radio.Button value="pessoa">Por pessoas</Radio.Button>
          <Radio.Button value="departamento">Por departamentos</Radio.Button>
        </Radio.Group>

        {modalidade === 'pessoa' ? (
          <Select
            mode="multiple"
            value={colaboradores}
            onChange={setColaboradores}
            options={COLABORADORES.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="Selecione os colaboradores"
            maxTagCount="responsive"
            style={{ width: '100%', fontFamily: FONT }}
            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        ) : (
          <Select
            mode="multiple"
            value={departamentos}
            onChange={setDepartamentos}
            options={DEPARTAMENTOS.map((d) => ({ value: d.value, label: d.label }))}
            placeholder="Selecione os departamentos"
            maxTagCount="responsive"
            style={{ width: '100%', fontFamily: FONT }}
          />
        )}
      </Section>

      {/* ── 3. Regras compartilhadas ── */}
      <Section numero={3} titulo="Regras de envio" subtitulo="Aplicadas a todos os documentos do lote.">
        <Checkbox checked={exigeAceite} onChange={(e) => setExigeAceite(e.target.checked)} style={{ fontFamily: FONT }}>
          <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>Exigir aceite formal dos destinatários</Text>
        </Checkbox>
        <div style={{ marginTop: 14 }}>
          <Checkbox checked={prazoAtivo} onChange={(e) => setPrazoAtivo(e.target.checked)} style={{ fontFamily: FONT }}>
            <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textPrimary }}>Definir prazo para assinatura</Text>
          </Checkbox>
          {prazoAtivo && (
            <div style={{ marginTop: 10, marginLeft: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>Aceitar em até</Text>
              <InputNumber min={1} max={365} value={prazoDias} onChange={(v) => setPrazoDias(v ?? 15)} style={{ width: 90, fontFamily: FONT }} />
              <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>dias após o envio</Text>
            </div>
          )}
        </div>
      </Section>

      {/* ── Barra de envio (fixa no rodapé) ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 200, right: 0, zIndex: 50,
        background: '#fff', borderTop: '1px solid #E5E7EB', boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary }}>
          <strong style={{ color: colorTokens.textPrimary }}>{totalDocs}</strong> documento(s) para <strong style={{ color: colorTokens.textPrimary }}>{resumoPublico}</strong>
        </Text>
        <Space size={10}>
          <Button onClick={() => navigate('/documentos')} style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40 }}>Cancelar</Button>
          <Button type="primary" icon={<SendOutlined />} loading={enviando} disabled={!podeEnviar} onClick={handleEnviar}
            style={{ fontFamily: FONT, fontWeight: 600, borderRadius: 8, height: 40, background: podeEnviar ? colorTokens.primary : undefined, borderColor: podeEnviar ? colorTokens.primary : undefined }}>
            Enviar {totalDocs > 0 ? `${totalDocs} documento(s)` : 'documentos'}
          </Button>
        </Space>
      </div>
    </div>
  )
}

/* ── Seção numerada ─────────────────────────────────────────── */
function Section({ numero, titulo, subtitulo, children }: { numero: number; titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: colorTokens.primary, color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {numero}
        </span>
        <Text strong style={{ fontFamily: FONT, fontSize: 15, color: colorTokens.textPrimary }}>{titulo}</Text>
      </div>
      <Text style={{ fontFamily: FONT, fontSize: 13, color: colorTokens.textSecondary, display: 'block', marginBottom: 16, marginLeft: 34 }}>{subtitulo}</Text>
      <div style={{ marginLeft: 34 }}>{children}</div>
    </div>
  )
}
