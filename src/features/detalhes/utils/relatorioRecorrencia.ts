/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/relatorioRecorrencia.ts
   Modelo de CICLOS para documentos com recorrência de aceite.
   - Deriva as janelas de vigência (ciclos) a partir de dataLancamento +
     período de recorrência, relativo a "agora".
   - Calcula o status de cada signatário em cada ciclo:
     'aceito' · 'falta' (ciclo fechado sem aceite) · 'pendente' (ciclo vigente)
     · 'na' (não era destinatário naquele ciclo — ex.: admissão posterior).
   Dados simulados de forma determinística (protótipo, sem backend).
───────────────────────────────────────────────────────────── */
import dayjs from 'dayjs'
import { COLABORADORES } from '@/data/mockClassifications'
import type { Documento } from '@/features/listagem/types/documento'

export type StatusCiclo = 'aceito' | 'falta' | 'pendente' | 'na'

const PERIODO_MESES: Record<string, number> = { '3_meses': 3, '6_meses': 6, '12_meses': 12, '24_meses': 24 }

export const RECORRENCIA_LABEL: Record<string, string> = {
  sem_validade: 'Sem recorrência',
  '3_meses': 'A cada 3 meses',
  '6_meses': 'A cada 6 meses',
  '12_meses': 'A cada 12 meses',
  '24_meses': 'A cada 24 meses',
}

const SETORES = ['RH', 'Jurídico', 'TI', 'Compliance', 'Financeiro', 'Comercial', 'Produto']

/** Coordenadas-base (capitais BR) para simular a geolocalização do aceite. */
const COORDS: [number, number][] = [
  [-23.5505, -46.6333], [-22.9068, -43.1729], [-19.9167, -43.9345], [-30.0346, -51.2177],
  [-25.4284, -49.2733], [-8.0476, -34.8770], [-12.9777, -38.5016], [-15.7939, -47.8828],
]
const fakeIp = (n: number) => `189.${((n * 13) % 200) + 20}.${(n * 7) % 256}.${((n * 29) % 253) + 1}`
const fakeGeo = (n: number) => {
  const [lat, lng] = COORDS[n % COORDS.length]
  return `${(lat + (((n * 17) % 100) - 50) / 10000).toFixed(6)}, ${(lng + (((n * 23) % 100) - 50) / 10000).toFixed(6)}`
}

export interface EvidenciaAceite {
  dataHora: string // "DD/MM/AAAA HH:mm"
  ip: string
  geo: string
  versao: string
}

export interface CicloResumo {
  numero: number
  periodo: string // "DD/MM/AAAA – DD/MM/AAAA"
  versao: string
  vigente: boolean
  destinatarios: number
  aceitos: number
  faltas: number
  pendentes: number
  adesaoPct: number
}

export interface SignatarioRec {
  nome: string
  setor: string
  situacao: StatusCiclo // status no ciclo vigente
  historico: StatusCiclo[] // index 0 = 1º ciclo … index n-1 = ciclo vigente
  aceitos: number
  aplicaveis: number
  reincidente: boolean
  qtdFaltas: number
  faltasCiclos: number[]
  /** Evidência do aceite mais recente (pode ser de um ciclo anterior); null se nunca aceitou. */
  ultimoAceite: EvidenciaAceite | null
}

export interface RelatorioRecorrencia {
  temDados: boolean
  recorrenciaLabel: string
  cicloVigente: number
  totalCiclos: number
  vigenciaCicloAtual: string
  proximaRenovacao: string
  adesaoVigente: number
  ciclos: CicloResumo[]
  signatarios: SignatarioRec[]
  reincidentes: SignatarioRec[]
}

/** Versão do documento vigente em cada ciclo (bump a cada ~3 ciclos). */
function versaoDoCiclo(k: number): string {
  return 'v' + (1 + Math.floor((k - 1) / 3))
}

export function buildRelatorioRecorrencia(doc: Documento): RelatorioRecorrencia {
  const periodo = PERIODO_MESES[doc.recorrenciaAceite ?? ''] ?? 0
  const start = doc.dataLancamento ? dayjs(doc.dataLancamento) : null
  const label = RECORRENCIA_LABEL[doc.recorrenciaAceite ?? 'sem_validade'] ?? 'Sem recorrência'

  const vazio: RelatorioRecorrencia = {
    temDados: false, recorrenciaLabel: label, cicloVigente: 0, totalCiclos: 0,
    vigenciaCicloAtual: '—', proximaRenovacao: '—', adesaoVigente: 0,
    ciclos: [], signatarios: [], reincidentes: [],
  }
  if (!periodo || !start) return vazio

  const now = dayjs()
  // Ciclo vigente = última janela iniciada até agora (cap de segurança em 60).
  let vigente = 1
  while (vigente < 60 && start.add(vigente * periodo, 'month').isBefore(now)) vigente++
  if (start.isAfter(now)) return vazio // documento ainda não lançado

  const fmt = (d: dayjs.Dayjs) => d.format('DD/MM/YYYY')

  const N = Math.min(doc.totalDestinatarios, COLABORADORES.length)
  // Ciclo em que cada pessoa passou a ser destinatária (alguns entram depois).
  const admissaoDe = (i: number) =>
    i % 6 === 5 ? Math.min(3, vigente) : i % 6 === 4 ? Math.min(2, vigente) : 1
  // Status determinístico por (pessoa, ciclo).
  const statusDe = (i: number, k: number, adm: number): StatusCiclo => {
    if (k < adm) return 'na'
    if (k === vigente) return i % 5 === 2 ? 'pendente' : 'aceito'
    if (i % 9 === 0 && k % 2 === 0) return 'falta' // reincidente: falta em ciclos pares
    if (i % 13 === 0 && k === adm + 1) return 'falta' // falta pontual
    return 'aceito'
  }

  const signatarios: SignatarioRec[] = []
  for (let i = 0; i < N; i++) {
    const adm = admissaoDe(i)
    const historico: StatusCiclo[] = []
    let aceitos = 0
    let aplicaveis = 0
    let qtdFaltas = 0
    const faltasCiclos: number[] = []
    let ultimoAceite: EvidenciaAceite | null = null
    for (let k = 1; k <= vigente; k++) {
      const s = statusDe(i, k, adm)
      historico.push(s)
      if (s !== 'na') aplicaveis++
      if (s === 'aceito') {
        aceitos++
        const inicioK = start.add((k - 1) * periodo, 'month')
        const dataAceite = inicioK.add((i % 20) + 3, 'day').hour(8 + (i % 9)).minute((i * 7) % 60)
        const seed = i * 3 + k
        ultimoAceite = {
          dataHora: dataAceite.format('DD/MM/YYYY HH:mm'),
          ip: fakeIp(seed), geo: fakeGeo(seed), versao: versaoDoCiclo(k),
        }
      }
      if (s === 'falta') { qtdFaltas++; faltasCiclos.push(k) }
    }
    signatarios.push({
      nome: COLABORADORES[i].label,
      setor: SETORES[i % SETORES.length],
      situacao: historico[vigente - 1],
      historico, aceitos, aplicaveis,
      reincidente: qtdFaltas >= 2, qtdFaltas, faltasCiclos, ultimoAceite,
    })
  }

  const ciclos: CicloResumo[] = []
  for (let k = 1; k <= vigente; k++) {
    const inicioK = start.add((k - 1) * periodo, 'month')
    const fimK = start.add(k * periodo, 'month').subtract(1, 'day')
    let dest = 0, ac = 0, fa = 0, pe = 0
    for (const s of signatarios) {
      const st = s.historico[k - 1]
      if (st === 'na') continue
      dest++
      if (st === 'aceito') ac++
      else if (st === 'falta') fa++
      else if (st === 'pendente') pe++
    }
    ciclos.push({
      numero: k, periodo: `${fmt(inicioK)} – ${fmt(fimK)}`, versao: versaoDoCiclo(k),
      vigente: k === vigente, destinatarios: dest, aceitos: ac, faltas: fa, pendentes: pe,
      adesaoPct: dest ? Math.round((ac / dest) * 100) : 0,
    })
  }

  const cicloAtual = ciclos[vigente - 1]
  return {
    temDados: true,
    recorrenciaLabel: label,
    cicloVigente: vigente,
    totalCiclos: vigente,
    vigenciaCicloAtual: cicloAtual?.periodo ?? '—',
    proximaRenovacao: fmt(start.add(vigente * periodo, 'month')),
    adesaoVigente: cicloAtual?.adesaoPct ?? 0,
    ciclos,
    signatarios,
    reincidentes: signatarios.filter((s) => s.reincidente),
  }
}
