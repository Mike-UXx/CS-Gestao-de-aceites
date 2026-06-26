/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/relatorioAceites.ts
   Modelo do Relatório de aceites considerando recorrência e versões.
   - Situação atual relativa à versão vigente + ciclo de recorrência:
     'Aceito' (vigente) · 'Renovação pendente' (aceitou, mas venceu) · 'Pendente'
   - Histórico de aceites por versão (anexo de evidência).
   Dados simulados de forma determinística (protótipo, sem backend).
───────────────────────────────────────────────────────────── */
import dayjs from 'dayjs'
import type { Documento } from '@/features/listagem/types/documento'
import { buildSignatarios } from './signatarios'

export type SituacaoAceite = 'Aceito' | 'Renovação pendente' | 'Pendente'

export interface SignatarioRelatorio {
  nome: string
  departamento?: string
  situacao: SituacaoAceite
  /** Evidências do aceite vigente (apenas 'Aceito') */
  dataHoraAceite: string | null
  ip: string | null
  geolocalizacao: string | null
  /** Último aceite válido antes de vencer (apenas 'Renovação pendente') */
  ultimoAceite: string | null
}

export interface VersaoAceites {
  versao: string
  dataPublicacao: string
  aceites: { nome: string; dataHoraAceite: string }[]
}

export interface RelatorioAceites {
  /** Versão vigente do documento (null quando não versionado) */
  versaoVigente: string | null
  recorrenciaLabel: string
  temRecorrencia: boolean
  signatarios: SignatarioRelatorio[]
  resumo: { aceitos: number; renovacaoPendente: number; pendentes: number; total: number }
  /** Histórico de aceites por versão (vazio quando não versionado) */
  historicoVersoes: VersaoAceites[]
}

const RECORRENCIA_LABEL: Record<string, string> = {
  sem_validade: 'Sem recorrência',
  '3_meses': 'A cada 3 meses',
  '6_meses': 'A cada 6 meses',
  '12_meses': 'A cada 12 meses',
  '24_meses': 'A cada 24 meses',
}

function buildHistorico(doc: Documento, concluidosNomes: string[]): VersaoAceites[] {
  if (concluidosNomes.length === 0) return []
  const criado = dayjs(doc.criadoEm)
  const fazer = (versao: string, offsetDias: number, fracao: number): VersaoAceites => {
    const base = criado.add(offsetDias, 'day')
    const n = Math.max(1, Math.round(concluidosNomes.length * fracao))
    return {
      versao,
      dataPublicacao: base.format('DD/MM/YYYY'),
      aceites: concluidosNomes.slice(0, n).map((nome, i) => ({
        nome,
        dataHoraAceite: base.add(i + 2, 'day').hour(9 + (i % 8)).minute((i * 11) % 60).format('DD/MM/YYYY HH:mm'),
      })),
    }
  }
  // v1 e v2 são as versões anteriores; a v3 (vigente) está na tabela principal.
  return [fazer('v1', 0, 0.45), fazer('v2', 180, 0.75)]
}

export function buildRelatorioAceites(doc: Documento): RelatorioAceites {
  const base = buildSignatarios(doc)
  const temRecorrencia = !!doc.recorrenciaAceite && doc.recorrenciaAceite !== 'sem_validade'

  let idxConcluido = 0
  const signatarios: SignatarioRelatorio[] = base.map((s) => {
    if (s.situacao === 'Pendente') {
      return { nome: s.nome, departamento: s.departamento, situacao: 'Pendente', dataHoraAceite: null, ip: null, geolocalizacao: null, ultimoAceite: null }
    }
    const i = idxConcluido++
    // Com recorrência, ~1 em cada 4 concluídos teve o aceite vencido → renovação pendente.
    if (temRecorrencia && i % 4 === 0) {
      return { nome: s.nome, departamento: s.departamento, situacao: 'Renovação pendente', dataHoraAceite: null, ip: null, geolocalizacao: null, ultimoAceite: s.dataHoraAceite }
    }
    return { nome: s.nome, departamento: s.departamento, situacao: 'Aceito', dataHoraAceite: s.dataHoraAceite, ip: s.ip, geolocalizacao: s.geolocalizacao, ultimoAceite: null }
  })

  const resumo = {
    aceitos: signatarios.filter((s) => s.situacao === 'Aceito').length,
    renovacaoPendente: signatarios.filter((s) => s.situacao === 'Renovação pendente').length,
    pendentes: signatarios.filter((s) => s.situacao === 'Pendente').length,
    total: signatarios.length,
  }

  const versionado = doc.tipo === 'adesao'
  const concluidosNomes = base.filter((s) => s.situacao === 'Concluído').map((s) => s.nome)

  return {
    versaoVigente: versionado ? 'v3' : null,
    recorrenciaLabel: RECORRENCIA_LABEL[doc.recorrenciaAceite ?? 'sem_validade'] ?? 'Sem recorrência',
    temRecorrencia,
    signatarios,
    resumo,
    historicoVersoes: versionado ? buildHistorico(doc, concluidosNomes) : [],
  }
}
