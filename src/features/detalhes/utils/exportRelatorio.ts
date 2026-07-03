/* ─────────────────────────────────────────────────────────────
   src/features/detalhes/utils/exportRelatorio.ts
   Geração real de relatórios de auditoria (zero dependências):
   - CSV (abre no Excel pt-BR, UTF-8 BOM, separador ';')
   - PDF (janela de impressão estilizada → "Salvar como PDF" no navegador)
───────────────────────────────────────────────────────────── */
import { CLASSIFICATIONS, GESTOES_RESPONSAVEIS } from '@/data/mockClassifications'
import { STATUS_LABEL } from '@/features/listagem/types/documento'
import type { Documento } from '@/features/listagem/types/documento'
import { buildRelatorioAceites, type RelatorioAceites } from './relatorioAceites'
import { buildRelatorioRecorrencia, type StatusCiclo } from './relatorioRecorrencia'

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
function metadados(doc: Documento, rel: RelatorioAceites): [string, string][] {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
  return [
    ['Título', doc.titulo],
    ['ID do documento', doc.id],
    ['Status', STATUS_LABEL[doc.status]],
    ['Tipo', TIPO_LABEL[doc.tipo]],
    ['Versão vigente', rel.versaoVigente ?? 'Não versionado'],
    ['Recorrência de aceite', rel.recorrenciaLabel],
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
  const rel = buildRelatorioAceites(doc)
  const lines: string[] = []

  lines.push(csvRow(['Relatório de aceites']))
  lines.push('')
  for (const [label, valor] of metadados(doc, rel)) {
    lines.push(csvRow([label, valor]))
  }

  // Resumo de conformidade
  lines.push('')
  lines.push(csvRow(['Resumo de conformidade']))
  lines.push(csvRow(['Aceitos (vigente)', String(rel.resumo.aceitos)]))
  if (rel.temRecorrencia) lines.push(csvRow(['Renovação pendente', String(rel.resumo.renovacaoPendente)]))
  lines.push(csvRow(['Pendentes', String(rel.resumo.pendentes)]))

  // Situação atual — listas separadas por estado, com colunas próprias
  const aceitos = rel.signatarios.filter((s) => s.situacao === 'Aceito')
  const renovacao = rel.signatarios.filter((s) => s.situacao === 'Renovação pendente')
  const pendentes = rel.signatarios.filter((s) => s.situacao === 'Pendente')

  lines.push('')
  lines.push(csvRow([`Aceitos — vigente${rel.versaoVigente ? ` (${rel.versaoVigente})` : ''} · ${aceitos.length}`]))
  lines.push(csvRow(['Nome', 'Data e hora do aceite', 'IP de origem', 'Geolocalização (lat, long)']))
  for (const s of aceitos) {
    lines.push(csvRow([s.nome, s.dataHoraAceite ?? '—', s.ip ?? '—', s.geolocalizacao ?? '—']))
  }

  if (renovacao.length) {
    lines.push('')
    lines.push(csvRow([`Renovação pendente · ${renovacao.length}`]))
    lines.push(csvRow(['Nome', 'Último aceite (vencido)', 'IP de origem', 'Geolocalização (lat, long)']))
    for (const s of renovacao) {
      lines.push(csvRow([s.nome, s.dataHoraAceite ?? '—', s.ip ?? '—', s.geolocalizacao ?? '—']))
    }
  }

  if (pendentes.length) {
    lines.push('')
    lines.push(csvRow([`Pendentes · ${pendentes.length}`]))
    lines.push(csvRow(['Nome']))
    for (const s of pendentes) lines.push(csvRow([s.nome]))
  }

  // BOM (﻿) garante acentuação correta no Excel pt-BR.
  const content = '﻿' + lines.join('\r\n')
  downloadBlob(content, `relatorio-aceites-${doc.id}.csv`, 'text/csv;charset=utf-8')
}

/* ── PDF (via impressão do navegador) ───────────────────────── */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Linhas (rótulo → valor) de "Dados do documento" no layout do relatório. */
function dadosDocumento(doc: Documento, rel: RelatorioAceites): [string, string][] {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
  const enviadoEm = doc.dataLancamento
    ? (() => {
        const d = new Date(doc.dataLancamento)
        return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR')}`
      })()
    : '—'
  return [
    ['ID do documento', doc.id],
    ['Status', STATUS_LABEL[doc.status]],
    ['Tipo', TIPO_LABEL[doc.tipo]],
    ['Gestão responsável', areaLabel(doc.gestaoResponsavel)],
    ['Classificações', classifLabels(doc.classificacoes)],
    ['Início da vigência', fmt(doc.dataLancamento)],
    ['Fim da vigência', fmt(doc.dataExpiracao)],
    ['Arquivo', doc.fileName ?? '—'],
    ['Total de destinatários', String(doc.totalDestinatarios)],
    ['Total de aceites', String(doc.totalAceites)],
    ['Adesão', `${adesaoPct(doc)}%`],
    ['Enviado em', enviadoEm],
    // Campos de auditoria (não constam do modelo visual, mas dão valor jurídico/GRC)
    ['Versão vigente', rel.versaoVigente ?? 'Não versionado'],
    ['Recorrência de aceite', rel.recorrenciaLabel],
    ['Hash SHA-256', doc.fileHash ?? '—'],
  ]
}

/**
 * Abre uma janela de impressão estilizada. O usuário escolhe "Salvar como PDF".
 * Layout: capa + página de dados + páginas de aceitos/pendentes, todas com o
 * header (logo Contato Seguro + logo do cliente) e a faixa "RELATÓRIO DE ACEITES"
 * com data e paginação embutidas.
 * @returns false se o popup foi bloqueado pelo navegador.
 */
export function exportarRelatorioPDF(doc: Documento): boolean {
  const rel = buildRelatorioAceites(doc)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return false

  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}logo-contato-seguro.svg`
  const dataCurta = new Date().toLocaleDateString('pt-BR')

  /* ── Situação → badge (rótulo + variante de cor) ── */
  const badge = (texto: string, variante: 'ok' | 'pend' | 'falta' | 'na') =>
    `<span class="badge badge-${variante}">${escapeHtml(texto)}</span>`

  /* Geolocalização em duas linhas ("lat," / "long"), como no modelo. */
  const geoHtml = (g: string | null) => {
    if (!g) return '—'
    const p = g.split(', ')
    return p.length === 2 ? `${escapeHtml(p[0])},<br/>${escapeHtml(p[1])}` : escapeHtml(g)
  }
  const cel = (v: string | null) => escapeHtml(v ?? '—')

  /* ── Blocos de conteúdo (após a capa). A paginação é por MEDIÇÃO no cliente
     (script abaixo): cada folha recebe só o que cabe numa página A4. ── */
  interface Bloco { t: 'el' | 'table' | 'break'; html?: string; className?: string; colgroup?: string; thead?: string; rows?: string[] }

  const temRec = !!doc.recorrenciaAceite && doc.recorrenciaAceite !== 'sem_validade'
  const relRec = temRec ? buildRelatorioRecorrencia(doc) : null

  const blocks: Bloco[] = [
    { t: 'el', html: `<h1 class="doc-title">Documento - ${escapeHtml(doc.titulo)}</h1>` },
  ]
  if (doc.descricao) {
    blocks.push({ t: 'el', html: `<h2 class="sec">Descrição</h2>` })
    blocks.push({ t: 'el', html: `<p class="desc">${escapeHtml(doc.descricao)}</p>` })
  }

  if (relRec && relRec.temDados) {
    /* ═══ Documento COM recorrência: resumo por ciclo + reincidência + 1 linha/pessoa ═══ */
    const fmtD = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
    const dadosRec: [string, string][] = [
      ['ID do documento', doc.id],
      ['Status', STATUS_LABEL[doc.status]],
      ['Tipo', TIPO_LABEL[doc.tipo]],
      ['Gestão responsável', areaLabel(doc.gestaoResponsavel)],
      ['Classificações', classifLabels(doc.classificacoes)],
      ['Início da vigência', fmtD(doc.dataLancamento)],
      ['Arquivo', doc.fileName ?? '—'],
      ['Total de destinatários', String(doc.totalDestinatarios)],
      ['Recorrência de aceite', relRec.recorrenciaLabel],
      ['Ciclo vigente', `${relRec.cicloVigente}º (${relRec.vigenciaCicloAtual})`],
      ['Próxima renovação', relRec.proximaRenovacao],
      ['Ciclos acumulados', String(relRec.totalCiclos)],
      ['Adesão do ciclo vigente', `${relRec.adesaoVigente}%`],
      ['Hash SHA-256', doc.fileHash ?? '—'],
    ]
    blocks.push({ t: 'el', html: `<h2 class="sec">Dados do documento</h2>` })
    blocks.push({ t: 'table', className: 'dados', colgroup: '', thead: '', rows: dadosRec.map(([l, v]) => `<tr><th>${escapeHtml(l)}</th><td>${escapeHtml(v)}</td></tr>`) })

    /* Resumo por ciclo (mais recente primeiro) */
    const COL_RES = `<colgroup><col style="width:15%"/><col style="width:26%"/><col style="width:9%"/><col style="width:13%"/><col style="width:12%"/><col style="width:12%"/><col style="width:13%"/></colgroup>`
    const THEAD_RES = `<thead><tr><th>Ciclo</th><th>Vigência</th><th>Versão</th><th class="num">Destinat.</th><th class="num">Aceitos</th><th class="num">Faltas</th><th class="num">Adesão</th></tr></thead>`
    const resRows = [...relRec.ciclos].reverse().map((c) => {
      const faltaCel = c.vigente
        ? `<span class="c-pend">${c.pendentes} pend.</span>`
        : c.faltas > 0 ? `<span class="c-falta">${c.faltas}</span>` : '0'
      const ciclo = c.vigente ? `${c.numero}º · vigente` : `${c.numero}º`
      return `<tr><td class="nome">${escapeHtml(ciclo)}</td><td>${escapeHtml(c.periodo)}</td><td>${escapeHtml(c.versao)}</td><td class="num">${c.destinatarios}</td><td class="num">${c.aceitos}</td><td class="num">${faltaCel}</td><td class="num"><b>${c.adesaoPct}%</b></td></tr>`
    })
    blocks.push({ t: 'break' })
    blocks.push({ t: 'el', html: `<h2 class="sec">Resumo por ciclo</h2>` })
    blocks.push({ t: 'table', className: 'resumo', colgroup: COL_RES, thead: THEAD_RES, rows: resRows })

    /* Pendências reincidentes (faltou em ≥2 ciclos) */
    if (relRec.reincidentes.length) {
      blocks.push({ t: 'el', html: `<div class="reinc-callout"><b>Pendências reincidentes (${relRec.reincidentes.length})</b> — signatários sem aceite em 2 ou mais ciclos.</div>` })
      const COL_REI = `<colgroup><col style="width:34%"/><col style="width:16%"/><col style="width:14%"/><col style="width:36%"/></colgroup>`
      const THEAD_REI = `<thead><tr><th>Nome</th><th>Setor</th><th class="num">Faltas</th><th>Ciclos sem aceite</th></tr></thead>`
      const reiRows = [...relRec.reincidentes]
        .sort((a, b) => b.qtdFaltas - a.qtdFaltas || a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((s) => `<tr><td class="nome">${escapeHtml(s.nome)}</td><td>${escapeHtml(s.setor)}</td><td class="num c-falta">${s.qtdFaltas}</td><td>${s.faltasCiclos.map((k) => k + 'º').join(', ')}</td></tr>`)
      blocks.push({ t: 'table', className: 'resumo', colgroup: COL_REI, thead: THEAD_REI, rows: reiRows })
    }

    /* Situação por signatário — 1 linha/pessoa, colunas fixas com a EVIDÊNCIA
       (data/hora, IP e geo) do aceite mais recente. Começa em página nova. */
    const sitBadge = (s: StatusCiclo) =>
      s === 'aceito' ? badge('Aceito', 'ok') : s === 'pendente' ? badge('Pendente', 'pend') : s === 'falta' ? badge('Não aceito', 'falta') : badge('—', 'na')
    const COL_SIG = `<colgroup><col style="width:21%"/><col style="width:12%"/><col style="width:8%"/><col style="width:20%"/><col style="width:16%"/><col style="width:23%"/></colgroup>`
    const THEAD_SIG = `<thead><tr><th>Nome</th><th>Situação</th><th class="num">Aceites</th><th>Último aceite</th><th>IP de origem</th><th>Geolocalização</th></tr></thead>`
    const sigRows = [...relRec.signatarios]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((s) => {
        const dot = s.reincidente ? `<span class="reinc-dot"></span>` : ''
        const acCls = s.reincidente ? ' c-falta' : ''
        const ev = s.ultimoAceite
        const ultimo = ev ? escapeHtml(`${ev.dataHora} · ${ev.versao}`) : '—'
        return `<tr><td class="nome">${dot}${escapeHtml(s.nome)}</td><td>${sitBadge(s.situacao)}</td><td class="num${acCls}">${s.aceitos}/${s.aplicaveis}</td><td>${ultimo}</td><td>${ev ? escapeHtml(ev.ip) : '—'}</td><td>${ev ? escapeHtml(ev.geo) : '—'}</td></tr>`
      })
    blocks.push({ t: 'break' })
    blocks.push({ t: 'el', html: `<h2 class="sec">Situação por signatário (${relRec.signatarios.length})</h2>` })
    blocks.push({ t: 'el', html: `<p class="hint">Evidência do aceite mais recente de cada signatário. Coluna “Aceites”: ciclos aceitos / ciclos aplicáveis. <span class="reinc-dot"></span> reincidente (sem aceite em 2+ ciclos).</p>` })
    blocks.push({ t: 'table', className: 'sigrec', colgroup: COL_SIG, thead: THEAD_SIG, rows: sigRows })
  } else {
    /* ═══ Documento SEM recorrência: Aceitos + Pendentes (em ordem alfabética) ═══ */
    const ordena = (arr: typeof rel.signatarios) => [...arr].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const aceitos = ordena(rel.signatarios.filter((s) => s.situacao !== 'Pendente'))
    const pendentes = ordena(rel.signatarios.filter((s) => s.situacao === 'Pendente'))

    const COL_ACEITO = `<colgroup><col style="width:22%"/><col style="width:15%"/><col style="width:18%"/><col style="width:20%"/><col style="width:25%"/></colgroup>`
    const THEAD_ACEITO = `<thead><tr><th>Nome</th><th>Situação</th><th>Data do aceite</th><th>IP de origem</th><th>Geolocalização</th></tr></thead>`
    const COL_PEND = `<colgroup><col style="width:22%"/><col style="width:78%"/></colgroup>`
    const THEAD_PEND = `<thead><tr><th>Nome</th><th>Situação</th></tr></thead>`
    const rowAceito = (s: (typeof aceitos)[number]) =>
      `<tr><td class="nome">${cel(s.nome)}</td><td>${badge('Concluído', 'ok')}</td><td>${cel(s.dataHoraAceite)}</td><td>${cel(s.ip)}</td><td class="geo">${geoHtml(s.geolocalizacao)}</td></tr>`
    const rowPend = (s: (typeof pendentes)[number]) =>
      `<tr><td class="nome">${cel(s.nome)}</td><td>${badge('Pendente', 'pend')}</td></tr>`
    const sections = [
      { titulo: 'Aceitos', colgroup: COL_ACEITO, thead: THEAD_ACEITO, rows: aceitos.map(rowAceito) },
      { titulo: 'Pendentes', colgroup: COL_PEND, thead: THEAD_PEND, rows: pendentes.map(rowPend) },
    ].filter((s) => s.rows.length > 0)

    const dadosRows = dadosDocumento(doc, rel).map(
      ([label, valor]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(valor)}</td></tr>`,
    )
    blocks.push({ t: 'el', html: `<h2 class="sec">Dados do documento</h2>` })
    blocks.push({ t: 'table', className: 'dados', colgroup: '', thead: '', rows: dadosRows })
    for (const s of sections) {
      blocks.push({ t: 'el', html: `<h2 class="sec">${escapeHtml(s.titulo)} (${s.rows.length})</h2>` })
      blocks.push({ t: 'table', className: 'sig', colgroup: s.colgroup, thead: s.thead, rows: s.rows })
    }
  }

  const clientData = {
    logoUrl,
    dataCurta,
    coverTitulo: escapeHtml(doc.titulo),
    coverPhotoUrl: `${window.location.origin}${import.meta.env.BASE_URL}capa-relatorio.jpg`,
    footerText: 'Documento gerado pela Plataforma de Gestão de Documentos e Aceites — Contato Seguro',
    blocks,
  }
  // Escapa "<" para não fechar o <script> prematuramente; JSON.parse o restaura.
  const clientJson = JSON.stringify(clientData).replace(/</g, '\\u003c')

  /* Paginador executado dentro da janela de impressão: mede a altura útil de
     cada página e move o bloco/linha para a próxima folha quando não couber. */
  const paginator = `
(function(){
  var D = JSON.parse(document.getElementById('rel-data').textContent);
  var root = document.getElementById('doc');
  function elFrom(html){ var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function rowFrom(html){ var t = document.createElement('table'); t.innerHTML = '<tbody>' + html + '</tbody>'; return t.querySelector('tr'); }
  function makeTable(cls, colgroup, thead){ var d = document.createElement('div'); d.innerHTML = '<table class="' + cls + '">' + colgroup + thead + '<tbody></tbody></table>'; var table = d.firstElementChild; return { table: table, tbody: table.querySelector('tbody') }; }

  // Capa (página 1) — full-bleed, sem faixa/header
  var cover = document.createElement('section');
  cover.className = 'sheet cover-sheet';
  cover.innerHTML = '<div class="cover-bg"></div>' +
    '<div class="cover-content"><div class="cover-kicker">Conta do usuário</div>' +
    '<h1 class="cover-h1">Relatório do documento</h1>' +
    '<div class="cover-pill">' + D.coverTitulo + '</div></div>' +
    '<div class="cover-band"><img class="cs-logo" src="' + D.logoUrl + '" alt="Contato Seguro" />' +
    '<span class="client-logo">LOGO<br/>CLIENTE</span></div>';
  root.appendChild(cover);
  cover.querySelector('.cover-bg').style.setProperty('--cover-photo', "url('" + D.coverPhotoUrl + "')");

  function chromeHtml(){
    return '<div class="page-header"><img class="cs-logo" src="' + D.logoUrl + '" alt="Contato Seguro" />' +
      '<span class="hdiv"></span><span class="client-logo">LOGO<br/>CLIENTE</span></div>' +
      '<div class="banner"><span class="banner-title">RELATÓRIO DE ACEITES</span>' +
      '<div class="banner-meta"><div class="bm-date">' + D.dataCurta + '</div>' +
      '<div class="bm-page"></div></div></div>';
  }
  var page, body;
  function newPage(){ var s = document.createElement('section'); s.className = 'sheet content-sheet'; s.innerHTML = chromeHtml() + '<div class="sheet-body"></div>'; root.appendChild(s); page = s; body = s.querySelector('.sheet-body'); }
  function fits(){ return body.scrollHeight <= body.clientHeight; }

  newPage();
  for (var bi = 0; bi < D.blocks.length; bi++){
    var b = D.blocks[bi];
    if (b.t === 'break'){
      if (body.children.length) newPage();
      continue;
    }
    if (b.t === 'el'){
      var node = elFrom(b.html);
      body.appendChild(node);
      if (!fits() && body.children.length > 1){ body.removeChild(node); newPage(); body.appendChild(node); }
    } else {
      var tbl = makeTable(b.className, b.colgroup, b.thead);
      body.appendChild(tbl.table);
      var tbody = tbl.tbody;
      for (var ri = 0; ri < b.rows.length; ri++){
        var tr = rowFrom(b.rows[ri]);
        tbody.appendChild(tr);
        if (!fits()){
          tbody.removeChild(tr);
          if (ri === 0){
            // 1ª linha não coube: leva título + tabela juntos p/ a próxima folha (sem título órfão)
            var prev = tbl.table.previousElementSibling;
            body.removeChild(tbl.table);
            var heading = (prev && prev.tagName === 'H2') ? prev : null;
            if (heading) body.removeChild(heading);
            newPage();
            if (heading) body.appendChild(heading);
            body.appendChild(tbl.table);
            tbody = tbl.tbody;
            tbody.appendChild(tr);
          } else {
            // continuação: nova folha, tabela sem thead (não repete a coluna)
            newPage();
            var t2 = makeTable(b.className, b.colgroup, '');
            body.appendChild(t2.table);
            tbody = t2.tbody;
            tbody.appendChild(tr);
          }
        }
      }
    }
  }

  // Rodapé na última página (fixado ao rodapé via margin-top:auto)
  var footer = document.createElement('div');
  footer.className = 'page-footer';
  footer.textContent = D.footerText;
  body.appendChild(footer);
  if (!fits()){ body.removeChild(footer); newPage(); body.appendChild(footer); }

  // Numeração (a capa é a página 1)
  var total = root.querySelectorAll('.sheet').length;
  var content = root.querySelectorAll('.content-sheet');
  for (var i = 0; i < content.length; i++){ var bm = content[i].querySelector('.bm-page'); if (bm) bm.textContent = 'Página: ' + (i + 2) + '/' + total; }

  // Imprime uma única vez, após o layout estar pronto
  var printed = false;
  function doPrint(){ if (printed) return; printed = true; try { window.focus(); window.print(); } catch(e){} }
  if (document.readyState === 'complete') setTimeout(doPrint, 200);
  else window.addEventListener('load', function(){ setTimeout(doPrint, 200); });
})();
`

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de aceites — ${escapeHtml(doc.titulo)}</title>
<style>
  * { box-sizing: border-box; }
  :root { --brand: #263072; --heading: #2B3F9E; }
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Montserrat', -apple-system, 'Segoe UI', sans-serif; color: #1F2430; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }

  .sheet { width: 210mm; height: 296mm; padding: 14mm 14mm 12mm; overflow: hidden; page-break-after: always; break-after: page; display: flex; flex-direction: column; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }

  /* Header: logo Contato Seguro + divisor + logo do cliente (placeholder) */
  .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .page-header .cs-logo { height: 34px; }
  .page-header .hdiv { width: 1px; height: 30px; background: #D9D9D9; }
  .page-header .client-logo { font-size: 11px; font-weight: 800; line-height: 1.05; letter-spacing: .06em; color: #2F80ED; }

  /* Faixa "RELATÓRIO DE ACEITES" com data + paginação */
  .banner { position: relative; display: flex; align-items: center; justify-content: center; height: 48px; background: var(--brand); margin-bottom: 20px; flex: none; }
  .banner-title { color: #fff; font-weight: 700; font-size: 13px; letter-spacing: .09em; }
  .banner-meta { position: absolute; right: 6px; top: 6px; bottom: 6px; width: 128px; background: #fff; border: 1px solid #D9DCEB; border-radius: 2px; display: flex; flex-direction: column; }
  .banner-meta > div { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--brand); }
  .banner-meta .bm-date { border-bottom: 1px solid #E4E7F2; }

  .sheet-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }

  /* Rodapé (apenas na última página) — fixado ao rodapé da folha */
  .page-footer { margin-top: auto; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 9px; color: #9CA3AF; }

  /* Capa full-bleed (modelo PDF-1) */
  .cover-sheet { padding: 0; position: relative; overflow: hidden; }
  .cover-bg { position: absolute; inset: 0; background-color: #141F49;
    background-image:
      linear-gradient(118deg, rgba(13,20,52,.95) 0%, rgba(17,27,74,.78) 46%, rgba(34,52,120,.55) 100%),
      radial-gradient(120% 90% at 78% 22%, rgba(88,120,205,.35), rgba(88,120,205,0) 60%),
      repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, rgba(255,255,255,0) 1px 22px),
      var(--cover-photo, none);
    background-size: cover, cover, auto 100%, cover;
    background-position: center, center, center, center;
    background-repeat: no-repeat, no-repeat, repeat-x, no-repeat; }
  .cover-content { position: absolute; left: 0; right: 0; top: 40%; padding: 0 22mm; z-index: 1; }
  .cover-kicker { color: #E7ECFF; font-size: 22px; font-weight: 500; margin-bottom: 8px; }
  .cover-h1 { color: #fff; font-size: 42px; font-weight: 800; line-height: 1.12; margin: 0 0 22px; }
  .cover-pill { display: inline-block; max-width: 92%; background: #1E9BE9; color: #fff; font-size: 15px; font-weight: 600; padding: 10px 22px; border-radius: 22px; }
  .cover-band { position: absolute; left: 0; right: 0; bottom: 0; height: 128px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 22mm; z-index: 1; }
  .cover-band .cs-logo { height: 46px; }
  .cover-band .client-logo { color: var(--brand); font-weight: 800; font-size: 24px; line-height: 1.05; letter-spacing: .04em; text-align: right; }

  /* Títulos de seção (Descrição / Dados do documento / Aceitos / Pendentes) */
  .doc-title { font-size: 18px; font-weight: 800; color: #1F2430; margin: 0 0 18px; }
  h2.sec { font-size: 15px; font-weight: 700; color: var(--heading); margin: 22px 0 10px; }
  .desc { font-size: 12.5px; color: #595959; line-height: 1.5; margin: 0 0 4px; }

  table { width: 100%; border-collapse: collapse; }

  /* Tabela "Dados do documento" (rótulo à esquerda, valor à direita) */
  .dados th { text-align: left; font-weight: 700; color: #262626; font-size: 12.5px; padding: 11px 2px; width: 46%; vertical-align: top; }
  .dados td { text-align: right; color: #595959; font-size: 12.5px; padding: 11px 2px; word-break: break-word; }
  .dados tr { border-bottom: 1px solid #EDEDED; }

  /* Tabelas de assinatura (Aceitos / Pendentes) */
  .sig { table-layout: fixed; }
  .sig thead th { text-align: left; font-weight: 700; color: #262626; font-size: 11px; padding: 8px 6px; border-bottom: 1px solid #D9D9D9; }
  .sig tbody td { text-align: left; color: #595959; font-size: 11px; padding: 16px 6px; border-bottom: 1px solid #EDEDED; vertical-align: middle; }
  .sig td.nome { color: #262626; font-weight: 600; }
  .sig td.geo { line-height: 1.35; }

  /* Badges de situação */
  .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 4px; border: 1px solid; white-space: nowrap; }
  .badge-ok { background: #F6FFED; border-color: #B7EB8F; color: #389E0D; }
  .badge-pend { background: #FFF7E6; border-color: #FFD591; color: #D46B08; }
  .badge-falta { background: #FFF1F0; border-color: #FFA39E; color: #CF1322; }
  .badge-na { background: #FAFAFA; border-color: #E5E7EB; color: #8C8C8C; }

  /* ── Documento com recorrência ── */
  .c-falta { color: #CF1322; font-weight: 600; }
  .c-pend { color: #D46B08; font-weight: 600; }

  /* Resumo por ciclo + reincidentes */
  .resumo { table-layout: fixed; }
  .resumo thead th { text-align: left; font-weight: 700; color: #262626; font-size: 11px; padding: 8px 6px; border-bottom: 1px solid #D9D9D9; }
  .resumo tbody td { text-align: left; color: #595959; font-size: 11px; padding: 10px 6px; border-bottom: 1px solid #EDEDED; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .resumo td.nome { color: #262626; font-weight: 600; }
  .resumo .num, .sigrec .num { text-align: right; }

  .reinc-callout { background: #FFF7E6; border: 1px solid #FFE7BA; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #AD6800; margin: 4px 0 6px; }
  .reinc-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #CF1322; margin-right: 6px; vertical-align: middle; }

  /* Tabela compacta: 1 linha por signatário, colunas fixas (não quebram) */
  .sigrec { table-layout: fixed; }
  .sigrec thead th { text-align: left; font-weight: 700; color: #262626; font-size: 11px; padding: 8px 6px; border-bottom: 1px solid #D9D9D9; }
  .sigrec tbody td { text-align: left; color: #595959; font-size: 11px; padding: 12px 6px; border-bottom: 1px solid #EDEDED; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sigrec td.nome { color: #262626; font-weight: 600; }

  /* Nota explicativa sob o título "Situação por signatário" */
  .hint { font-size: 10.5px; color: #8C8C8C; line-height: 1.5; margin: -2px 0 12px; }
  .hint .reinc-dot { margin: 0 3px 0 4px; }
</style>
</head>
<body>
  <div id="doc"></div>
  <script id="rel-data" type="application/json">${clientJson}</script>
  <script>${paginator}</script>
</body>
</html>`)
  win.document.close()
  win.focus()
  return true
}
