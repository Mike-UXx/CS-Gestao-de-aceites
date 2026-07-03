/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/relatorioAceites.ts
   Modelo do Relatório de aceites considerando recorrência e versões.
   - Situação atual relativa à versão vigente + ciclo de recorrência:
     'Aceito' (vigente) · 'Renovação pendente' (aceitou, mas venceu) · 'Pendente'
   - Histórico de aceites por versão (anexo de evidência).
   Dados simulados de forma determinística (protótipo, sem backend).
───────────────────────────────────────────────────────────── */
import type { Documento } from '@/features/listagem/types/documento'
import { buildSignatarios } from './signatarios'

export type SituacaoAceite = 'Aceito' | 'Renovação pendente' | 'Pendente'

export interface SignatarioRelatorio {
  nome: string
  departamento?: string
  situacao: SituacaoAceite
  /**
   * Evidências do aceite. Em 'Aceito' é o aceite vigente; em 'Renovação
   * pendente' é o último aceite (já vencido); em 'Pendente' é null.
   */
  dataHoraAceite: string | null
  ip: string | null
  geolocalizacao: string | null
}

export interface RelatorioAceites {
  /** Versão vigente do documento (null quando não versionado) */
  versaoVigente: string | null
  recorrenciaLabel: string
  temRecorrencia: boolean
  signatarios: SignatarioRelatorio[]
  resumo: { aceitos: number; renovacaoPendente: number; pendentes: number; total: number }
}

const RECORRENCIA_LABEL: Record<string, string> = {
  sem_validade: 'Sem recorrência',
  '3_meses': 'A cada 3 meses',
  '6_meses': 'A cada 6 meses',
  '12_meses': 'A cada 12 meses',
  '24_meses': 'A cada 24 meses',
}

export function buildRelatorioAceites(doc: Documento): RelatorioAceites {
  const base = buildSignatarios(doc)
  const temRecorrencia = !!doc.recorrenciaAceite && doc.recorrenciaAceite !== 'sem_validade'

  let idxConcluido = 0
  const signatarios: SignatarioRelatorio[] = base.map((s) => {
    if (s.situacao === 'Pendente') {
      return { nome: s.nome, departamento: s.departamento, situacao: 'Pendente', dataHoraAceite: null, ip: null, geolocalizacao: null }
    }
    const i = idxConcluido++
    // Com recorrência, ~1 em cada 4 concluídos teve o aceite vencido → renovação pendente.
    // A evidência (data/IP/geo do aceite que venceu) é preservada; o badge sinaliza a validade.
    const situacao: SituacaoAceite = temRecorrencia && i % 4 === 0 ? 'Renovação pendente' : 'Aceito'
    return { nome: s.nome, departamento: s.departamento, situacao, dataHoraAceite: s.dataHoraAceite, ip: s.ip, geolocalizacao: s.geolocalizacao }
  })

  const resumo = {
    aceitos: signatarios.filter((s) => s.situacao === 'Aceito').length,
    renovacaoPendente: signatarios.filter((s) => s.situacao === 'Renovação pendente').length,
    pendentes: signatarios.filter((s) => s.situacao === 'Pendente').length,
    total: signatarios.length,
  }

  const versionado = doc.tipo === 'adesao'

  return {
    versaoVigente: versionado ? 'v3' : null,
    recorrenciaLabel: RECORRENCIA_LABEL[doc.recorrenciaAceite ?? 'sem_validade'] ?? 'Sem recorrência',
    temRecorrencia,
    signatarios,
    resumo,
  }
}
