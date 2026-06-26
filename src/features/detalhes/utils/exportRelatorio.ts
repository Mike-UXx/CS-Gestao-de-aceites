/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/exportRelatorio.ts
   Geração real de relatórios de auditoria (zero dependências):
   - CSV (abre no Excel pt-BR, UTF-8 BOM, separador ';')
   - PDF (janela de impressão estilizada → "Salvar como PDF" no navegador)
───────────────────────────────────────────────────────────── */
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { STATUS_LABEL } from '@/features/listagem/types/documento'
import type { Documento } from '@/features/listagem/types/documento'
import { buildSignatarios } from './signatarios'

/* ── Helpers de rótulo ──────────────────────────────────────── */
const TIPO_LABEL: Record<Documento['tipo'], string> = {
  adesao: 'Documento com aceite (Adesão)',
  ciencia: 'Documento informativo (Ciência)',
}

function areaLabel(value: string): string {
  return GESTOES_RESPONSAVEIS.find((g) => g.value === value)?.label ?? value
}

function classifLabels(values: string[]): string {
  return values
    .map((v) => CLASSIFICATIONS.find((c) => c.value === v)?.label ?? v)
    .join(', ')
}

function adesaoPct(doc: Documento): number {
  return doc.totalDestinatarios > 0
    ? Math.round((doc.totalAceites / doc.totalDestinatarios) * 100)
    : 0
}

/** Pares (rótulo, valor) dos metadados do documento — usado por CSV e PDF. */
function metadados(doc: Documento): [string, string][] {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
  return [
    ['Título', doc.titulo],
    ['ID do documento', doc.id],
    ['Status', STATUS_LABEL[doc.status]],
    ['Tipo', TIPO_LABEL[doc.tipo]],
    ['Área responsável', areaLabel(doc.gestaoResponsavel)],
    ['Classificações', classifLabels(doc.classificacoes)],
    ['Início da vigência', fmt(doc.dataLancamento)],
    ['Fim da vigência', fmt(doc.dataExpiracao)],
    ['Hash SHA-256', doc.fileHash ?? '—'],
    ['Arquivo', doc.fileName ?? '—'],
    ['Total de destinatários', String(doc.totalDestinatarios)],
    ['Total de aceites', String(doc.totalAceites)],
    ['Adesão', `${adesaoPct(doc)}%`],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ]
}

/* ── Download genérico ──────────────────────────────────────── */
function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── CSV ────────────────────────────────────────────────────── */
const SEP = ';'

/** Escapa um campo CSV (aspas, separador, quebras de linha). */
function csvCell(value: string): string {
  const needsQuote = /["\n\r;]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(SEP)
}

export function exportarRelatorioCSV(doc: Documento): void {
  const signatarios = buildSignatarios(doc)
  const lines: string[] = []

  lines.push(csvRow(['Relatório de auditoria']))
  lines.push('')
  for (const [label, valor] of metadados(doc)) {
    lines.push(csvRow([label, valor]))
  }
  lines.push('')
  lines.push(csvRow(['Nome', 'Situação', 'Data e hora do aceite', 'IP de origem', 'Geolocalização (lat, long)', 'Hash do aceite']))
  for (const s of signatarios) {
    lines.push(csvRow([
      s.nome,
      s.situacao,
      s.dataHoraAceite ?? '—',
      s.ip ?? '—',
      s.geolocalizacao ?? '—',
      s.hashAceite ?? '—',
    ]))
  }

  // BOM (﻿) garante acentuação correta no Excel pt-BR.
  const content = '﻿' + lines.join('\r\n')
  downloadBlob(content, `relatorio-auditoria-${doc.id}.csv`, 'text/csv;charset=utf-8')
}

/* ── PDF (via impressão do navegador) ───────────────────────── */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Abre uma janela de impressão estilizada. O usuário escolhe "Salvar como PDF".
 * @returns false se o popup foi bloqueado pelo navegador.
 */
export function exportarRelatorioPDF(doc: Documento): boolean {
  const signatarios = buildSignatarios(doc)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false

  const logoUrl = `${window.location.origin}/logo-contato-seguro.svg`
  const dataGeracao = new Date().toLocaleString('pt-BR')
  const dataCurta = new Date().toLocaleDateString('pt-BR')

  const metaRows = metadados(doc)
    .map(([label, valor]) =>
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`)
    .join('')

  const sigRows = signatarios
    .map((s) => {
      const concluido = s.situacao === 'Concluído'
      const cor = concluido ? '#389e0d' : '#D46B08'
      const bg = concluido ? '#F6FFED' : '#FFF7E6'
      return `<tr>
        <td class="nome">${escapeHtml(s.nome)}</td>
        <td><span class="badge" style="color:${cor};border-color:${cor};background:${bg}">${escapeHtml(s.situacao)}</span></td>
        <td>${escapeHtml(s.dataHoraAceite ?? '—')}</td>
        <td>${escapeHtml(s.ip ?? '—')}</td>
        <td>${escapeHtml(s.geolocalizacao ?? '—')}</td>
        <td class="hash">${escapeHtml(s.hashAceite ?? '—')}</td>
      </tr>`
    })
    .join('')

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de aceites — ${escapeHtml(doc.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  :root { --brand: #263072; }
  @page { size: A4; margin: 2.4cm 1.2cm 1.6cm; }
  body { font-family: 'Montserrat', -apple-system, 'Segoe UI', sans-serif; color: #1F2430; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Cabeçalho e rodapé repetidos em todas as páginas */
  .run-header { position: fixed; top: -1.8cm; left: 0; right: 0; height: 1.3cm;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 2px solid var(--brand); padding-bottom: 6px; }
  .run-header img { height: 22px; }
  .run-header .rh-title { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--brand); text-transform: uppercase; }
  .run-header .rh-date { font-size: 10px; color: #6B7280; }
  .run-footer { position: fixed; bottom: -1.1cm; left: 0; right: 0;
    font-size: 8.5px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; }

  /* Capa */
  .cover { height: 23cm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; }
  .cover img { height: 56px; margin-bottom: 40px; }
  .cover .kicker { font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--brand); text-transform: uppercase; margin-bottom: 14px; }
  .cover .title { font-size: 30px; font-weight: 800; color: #1F2430; max-width: 80%; line-height: 1.25; margin: 0 0 18px; }
  .cover .meta { font-size: 12px; color: #6B7280; }
  .cover .rule { width: 64px; height: 4px; background: var(--brand); border-radius: 2px; margin: 22px 0; }

  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--brand); margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .meta th { text-align: left; width: 38%; color: #6B7280; font-weight: 600; padding: 7px 10px; vertical-align: top; }
  .meta td { padding: 7px 10px; word-break: break-all; font-weight: 500; }
  .meta tr { border-bottom: 1px solid #F0F0F0; }

  .sig { table-layout: fixed; }
  .sig thead { display: table-header-group; } /* repete o cabeçalho em cada página */
  .sig th { text-align: left; background: var(--brand); color: #fff; font-weight: 600; font-size: 10px; padding: 8px; }
  .sig td { padding: 7px 8px; border-bottom: 1px solid #F0F0F0; font-size: 10px; vertical-align: top; }
  .sig tr { page-break-inside: avoid; }
  .sig .nome { font-weight: 600; }
  .sig .hash { font-family: 'Courier New', monospace; font-size: 8px; color: #6B7280; word-break: break-all; }
  .sig col.c-nome { width: 16%; } .sig col.c-sit { width: 11%; } .sig col.c-data { width: 15%; }
  .sig col.c-ip { width: 14%; } .sig col.c-geo { width: 16%; } .sig col.c-hash { width: 28%; }
  .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 8px; border-radius: 10px; border: 1px solid; }
</style>
</head>
<body>
  <header class="run-header">
    <img src="${logoUrl}" alt="Contato Seguro" />
    <span class="rh-title">Relatório de aceites</span>
    <span class="rh-date">${escapeHtml(dataCurta)}</span>
  </header>
  <footer class="run-footer">
    Documento gerado pela Plataforma de Gestão de Documentos e Aceites — Contato Seguro
  </footer>

  <!-- Capa -->
  <section class="cover">
    <img src="${logoUrl}" alt="Contato Seguro" />
    <div class="kicker">Relatório de aceites</div>
    <h1 class="title">${escapeHtml(doc.titulo)}</h1>
    <div class="rule"></div>
    <div class="meta">Gerado em ${escapeHtml(dataGeracao)}</div>
  </section>

  <!-- Dados do documento -->
  <h2>Dados do documento</h2>
  <table class="meta"><tbody>${metaRows}</tbody></table>

  <!-- Signatários -->
  <h2>Signatários (${signatarios.length})</h2>
  <table class="sig">
    <colgroup>
      <col class="c-nome" /><col class="c-sit" /><col class="c-data" />
      <col class="c-ip" /><col class="c-geo" /><col class="c-hash" />
    </colgroup>
    <thead><tr>
      <th>Nome</th><th>Situação</th><th>Data e hora do aceite</th>
      <th>IP de origem</th><th>Geolocalização</th><th>Hash do aceite</th>
    </tr></thead>
    <tbody>${sigRows}</tbody>
  </table>
</body>
</html>`)
  win.document.close()
  win.focus()
  // Imprime uma única vez, assim que o conteúdo estiver pronto.
  let printed = false
  const doPrint = () => { if (printed) return; printed = true; try { win.print() } catch { /* noop */ } }
  win.onload = doPrint
  // Fallback caso onload não dispare (conteúdo já escrito de forma síncrona).
  setTimeout(doPrint, 400)
  return true
}
