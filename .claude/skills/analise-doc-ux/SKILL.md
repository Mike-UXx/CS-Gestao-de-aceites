---
name: analise-doc-ux
description: >-
  Analisa um documento de requisitos/especificação (de preferência no Google Drive) e o
  traduz para a linguagem de UX/Designer Sênior ANTES do desenvolvimento. Use SEMPRE que
  o usuário indicar um link do Drive/Google Docs (ou colar uma spec) e pedir para
  analisar/estudar a documentação, trazer sugestões de fluxo/usabilidade ou "analisar o
  EP0X" — mesmo sem dizer "UX". Lê o documento inteiro (com comentários), resume em
  linguagem de produto/UX e conduz um funil INTERATIVO: UMA decisão de fluxo por vez,
  com até 3 opções (recomendada marcada) + "Outros", adaptando as próximas decisões às
  escolhas. Depois AUDITA o fluxo escolhido (caminhos não previstos, erros evitáveis,
  riscos de usabilidade) e cada achado relevante vira nova rodada de decisão. Só então
  entrega o placar e o backlog pronto para o protótipo. É a etapa de DISCOVERY: NÃO
  desenha UI — quem implementa é a skill "tela-ds-cs", após as escolhas do usuário.
---

# Analisar documento → análise de UX (discovery antes do protótipo)

Esta skill é a ponte entre **uma spec escrita** e **a construção da tela**. Ela pega um
documento (requisitos, épico, PRD, ata) e devolve o que um Designer Sênior entregaria em
uma sessão de discovery: entendimento do problema, opções de fluxo com recomendação,
lacunas que a doc não previu, e um backlog de ideias. O objetivo é **decidir o melhor
fluxo e usabilidade antes de gastar esforço desenhando** — porque mudar um fluxo num
documento custa uma frase; mudar depois de pronto custa retrabalho.

**Regra de ouro:** esta skill **para** na entrega da análise. Ela **não** cria UI. A
construção do protótipo é feita pela skill **`tela-ds-cs`**, e **somente depois** que o
usuário escolher os fluxos. Pular direto para código é o erro nº 1 a evitar aqui.

## Passo 1 — Descobrir e ler o documento

O usuário aciona a skill informando **o link do Drive/Docs** e **qual página/seção/aba**
analisar (ex.: "Página: EP06: Notificações"). Um mesmo doc costuma ter várias abas/seções
— escope a análise ao trecho pedido, mas leia o entorno para não perder contexto.

1. **Extraia o `fileId`** da URL. Em `https://docs.google.com/document/d/<fileId>/edit?...`,
   o `fileId` é o trecho entre `/d/` e `/edit`. Guarde também `tab=` e `heading=` se
   existirem — ajudam a localizar a seção certa.
2. **Leia o conteúdo** com o conector do Google Drive:
   `read_file_content(fileId, includeComments=true)`. **Sempre inclua os comentários** —
   é onde ficam decisões, objeções, dúvidas e "TODOs" do time, que são ouro para a análise.
3. **Localize a seção** pedida (pelo título/heading) dentro do texto retornado e concentre
   a análise nela; use o resto do doc como contexto.
4. **Se o acesso falhar** (erro de permissão do conector, doc privado, 401): não invente
   conteúdo. Avise que o **conector do Google Drive precisa ser reconectado** com acesso de
   leitura (nas configurações de conectores do claude.ai) **ou** peça para o usuário colar
   o texto da seção. Só siga com o texto em mãos.

Se o documento não estiver no Drive (colado no chat, PDF, .docx), trate o texto do mesmo
jeito — o Drive é o caminho preferido, não o único.

## Passo 2 — Traduzir para linguagem de produto/UX

Antes de propor fluxos, mostre que entendeu o problema. Extraia do documento:

- **Objetivo** da funcionalidade (o "porquê", em uma frase).
- **Quem usa** (perfis/persona) e o **job-to-be-done** de cada um ("quando ___, eu quero
  ___, para ___").
- **Dados** exibidos/manipulados e **ações** principais.
- **Gatilhos/eventos** (o que dispara o fluxo) e **regras de negócio** relevantes.
- **Decisões e dúvidas já registradas** (especialmente as dos comentários do doc).

Escreva isso de forma enxuta — é o alicerce, não o produto final. Se algo na doc estiver
ambíguo, sinalize aqui (vira pergunta no Passo 5).

## Passo 3 — Decisões de fluxo guiadas (uma por vez, interativo)

**Não despeje todas as decisões de uma vez** — uma parede de opções sobrecarrega e
dificulta escolher. Conduza o usuário por um **funil de decisões**:

1. **Ordene as decisões** da mais estrutural (a que muda todas as outras — ex.: qual
   versão da spec vale, qual o escopo) para a mais pontual (ex.: onde fica um botão).
2. **Apresente UMA decisão por vez**, com **até 3 opções reais** + recomendação:
   - **No Claude Code:** use a ferramenta `AskUserQuestion`. Coloque a recomendada como
     **primeira opção** com "(Recomendada)" no rótulo; descreva prós/contras na descrição
     de cada opção. A 4ª opção "Outros" (texto livre) é adicionada **automaticamente**
     pela ferramenta — não crie uma opção "Outros" manual.
   - **Sem a ferramenta (claude.ai):** liste "Opção 1 / 2 / 3 (⭐ recomendada)" +
     "4. Outra — descreva com suas palavras" e **PARE**. Aguarde a resposta antes de
     qualquer análise adicional.
3. **Leia a escolha e adapte:** a próxima decisão deve refletir as anteriores (ex.: se o
   usuário escolheu "drawer" em vez de "página", as perguntas seguintes falam do drawer).
   Decisões genuinamente independentes entre si podem ser agrupadas numa mesma rodada
   (máx. 4 perguntas), mas na dúvida, pergunte separado.
4. Mantenha um **placar das decisões** (decisão → escolha) para usar nos passos seguintes.

Critérios para recomendar: menos passos até o objetivo, consistência com telas/produtos
existentes, clareza de hierarquia, esforço de implementação, aderência ao Design System.
A recomendação é opinião de sênior — assuma posição e explique o porquê em 1–2 frases.
Cada opção: descrição curta + prós/contras em uma linha.

## Passo 4 — Auditoria do fluxo escolhido (verificação interativa)

**Roda somente depois que todas as decisões do Passo 3 estiverem fechadas** — o objeto da
auditoria é o fluxo que o usuário escolheu, não hipóteses descartadas.

Specs quase sempre descrevem o "caminho feliz", e as escolhas de fluxo podem introduzir
novos pontos cegos. Vista o chapéu de auditor e tente **quebrar o fluxo escolhido**:
percorra-o como usuário real (primeiro acesso, uso diário, erro no meio do caminho,
abandono) e procure:

- **Caminhos não previstos:** entradas alternativas, voltar no meio do fluxo, deep link
  direto, refresh no meio de uma ação, abandono e retomada.
- **Erros de fluxo evitáveis:** becos sem saída, estados inalcançáveis, ações
  irreversíveis sem confirmação, dados perdidos ao navegar, loops.
- **Usabilidade e experiência:** fricção desnecessária, falta de feedback, inconsistência
  com o resto do produto, sobrecarga cognitiva, expectativa quebrada.

Frentes de varredura (use as que fizerem sentido):

- **Estados da tela:** vazio, carregando, erro, sucesso, parcial.
- **Perfis e permissões:** quem pode ver/fazer o quê; o que acontece sem permissão.
- **Escala/volume:** muitos itens, paginação, busca, performance percebida.
- **Concorrência e tempo real:** dois usuários agindo juntos, atualização/《stale》, duplicidade.
- **Falhas e recuperação:** offline, timeout, desfazer (undo), reenvio, idempotência.
- **Acessibilidade e responsivo:** teclado, leitor de tela, contraste, mobile.
- **Ciclo de vida do dado:** o que expira, arquiva, notifica de novo, ou fica órfão.

**Cada achado relevante vira uma rodada de decisão no MESMO formato do Passo 3:**
apresente o problema (o que é + por que vai surgir) e 2–3 soluções com a recomendada
marcada — incluindo "Não tratar agora" como opção quando fizer sentido — e **aguarde a
escolha** antes de seguir. Agrupe achados independentes na mesma rodada (máx. 4);
adapte os achados seguintes às escolhas já feitas.

**Filtro de relevância:** nem todo achado merece uma pergunta. Se a solução é prática
consolidada sem trade-off real (ex.: toast de erro quando o salvamento falha), registre
direto no backlog como nota — o usuário decide fluxo, não obviedades. Escale para rodada
de decisão apenas o que tem alternativas genuínas com prós/contras. Priorize os achados
com maior chance de virar bug ou fricção; não precisa esgotar tudo.

Some os tratamentos escolhidos ao placar de decisões.

## Passo 5 — Backlog de ideias para o protótipo (entrada da `tela-ds-cs`)

Traduza a análise em uma lista **priorizada e acionável** de telas/componentes a construir,
**refletindo as escolhas do Passo 3 e os tratamentos escolhidos na auditoria do Passo 4**
(o backlog descreve o que foi decidido, não as alternativas descartadas).
Cada item já aponta os componentes prováveis do Design System, para o handoff à `tela-ds-cs`
ser direto — **sem** especificar pixels/tokens aqui (isso é trabalho da `tela-ds-cs`).

```
- [ ] [Tela/componente] — objetivo · componentes DS prováveis · prioridade (Alta/Média/Baixa)
```

## Passo 6 — Handoff

Com o placar de decisões fechado, sobram poucas (ou nenhuma) perguntas em aberto — liste
as que restarem (ex.: valores "A DEFINIR" na spec que não bloqueiam o fluxo). Deixe
explícito o próximo passo:

> Escolha os fluxos acima. Assim que você decidir, implemento no protótipo com a skill
> **`tela-ds-cs`** (que garante uso só de componentes/tokens do DS). Não vou desenhar
> nada antes dessa escolha.

## Estrutura da entrega (em três fases)

**Fase 1 — imediata após a leitura:**
```
# Análise UX — [Documento] · [Página/Seção]
## 1. O que o documento pede (em linguagem de produto/UX)
→ e em seguida a PRIMEIRA decisão de fluxo (Passo 3), uma por vez.
```

**Fase 2 — após todas as decisões de fluxo:** auditoria do fluxo escolhido (Passo 4).
Anuncie a transição ("decisões fechadas — agora vou auditar o fluxo escolhido") e conduza
os achados relevantes como novas rodadas de decisão, no mesmo formato interativo.

**Fase 3 — só depois das decisões E da auditoria fechadas:**
```
## 2. Resumo das decisões (placar: fluxos escolhidos + tratamentos da auditoria)
## 3. Notas registradas (boas práticas aplicadas direto, sem decisão)
## 4. Backlog de ideias para o protótipo (pronto para tela-ds-cs)
## Próximo passo
```

## Erros a evitar

- **Começar a desenhar/codar UI.** Esta skill entrega análise e para. UI = `tela-ds-cs`,
  depois da escolha do usuário.
- **Inventar conteúdo** quando o doc não abriu. Sem acesso, peça reconexão do Drive ou o
  texto colado.
- **Listar opções sem recomendar.** Sempre aponte a preferida e explique o porquê.
- **Despejar todas as decisões de uma vez.** O formato é interativo: uma decisão por vez,
  aguardando a escolha do usuário antes de seguir — a parede de opções única foi
  exatamente o formato rejeitado pelo time.
- **Pular a auditoria pós-decisões ou entregá-la como lista passiva.** Depois das
  escolhas, o fluxo escolhido é auditado e os achados com trade-off real viram rodadas
  de decisão — não um relatório para o usuário ler sozinho.
- **Transformar obviedade em pergunta.** Boas práticas sem alternativa genuína entram
  direto no backlog como nota; perguntar demais gera fadiga de decisão.
- **Só repetir a doc.** O valor está em traduzir para UX, recomendar fluxo e antecipar o
  que a doc não previu.
- **Descer a pixel/token.** Medidas e componentes exatos são responsabilidade da
  `tela-ds-cs`; aqui o nível é fluxo, usabilidade e ideias.
