---
name: analise-doc-ux
description: >-
  Analisa um documento de requisitos/especificação (de preferência no Google Drive)
  e o traduz para a linguagem de UX/Designer Sênior ANTES de qualquer desenvolvimento.
  Use SEMPRE que o usuário indicar um link do Drive/Google Docs (ou colar um texto de
  spec) e pedir para "analisar o documento", "estudar a doc", "ler a documentação",
  "trazer sugestões de fluxo/usabilidade", "quais as ideias antes de desenvolver",
  "analisar o EP0X", ou variações — mesmo que não diga "UX". A skill lê o documento
  inteiro (incluindo comentários), resume em linguagem de produto/UX, entrega OPÇÕES
  de fluxo sempre apontando a mais recomendada, levanta cenários que a documentação
  talvez não previu (com sugestão), e monta um backlog de ideias pronto para o
  protótipo. É a etapa de DISCOVERY que antecede a construção: ela NÃO desenha UI —
  quem implementa é a skill "tela-ds-cs", e só depois que o usuário escolher os fluxos.
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

## Passo 3 — Fluxos: opções com recomendação

Para **cada decisão de fluxo relevante**, apresente 2–3 opções reais com trade-offs e
**sempre aponte a recomendada, com o porquê**. Bons critérios para recomendar: menos
passos até o objetivo, consistência com telas/produtos que já existem, clareza da
hierarquia, esforço de implementação, e aderência ao Design System. A recomendação é uma
opinião de sênior — assuma uma posição, não empurre a decisão de volta sem sugestão.

Formato:
```
### Fluxo: [nome do fluxo/decisão]
- **Opção A** — [descrição curta] · prós: … · contras: …
- **Opção B** — [descrição curta] · prós: … · contras: …
- ⭐ **Recomendado: [A/B]** — [motivo em 1–2 frases]
```

## Passo 4 — Cenários que a documentação talvez não previu

Specs quase sempre descrevem o "caminho feliz". O valor de um sênior é antecipar o resto.
Para cada cenário provável e ausente na doc, diga **o que é**, **por que vai/deve surgir** e
uma **sugestão de tratamento**. Varra pelo menos estas frentes (use as que fizerem sentido):

- **Estados da tela:** vazio, carregando, erro, sucesso, parcial.
- **Perfis e permissões:** quem pode ver/fazer o quê; o que acontece sem permissão.
- **Escala/volume:** muitos itens, paginação, busca, performance percebida.
- **Concorrência e tempo real:** dois usuários agindo juntos, atualização/《stale》, duplicidade.
- **Falhas e recuperação:** offline, timeout, desfazer (undo), reenvio, idempotência.
- **Acessibilidade e responsivo:** teclado, leitor de tela, contraste, mobile.
- **Ciclo de vida do dado:** o que expira, arquiva, notifica de novo, ou fica órfão.

Não precisa esgotar tudo — priorize os cenários com maior chance de virar bug ou fricção.

## Passo 5 — Backlog de ideias para o protótipo (entrada da `tela-ds-cs`)

Traduza a análise em uma lista **priorizada e acionável** de telas/componentes a construir.
Cada item já aponta os componentes prováveis do Design System, para o handoff à `tela-ds-cs`
ser direto — **sem** especificar pixels/tokens aqui (isso é trabalho da `tela-ds-cs`).

```
- [ ] [Tela/componente] — objetivo · componentes DS prováveis · prioridade (Alta/Média/Baixa)
```

## Passo 6 — Perguntas em aberto e handoff

Feche com as **decisões que dependem do usuário** (as escolhas de fluxo do Passo 3 + as
ambiguidades do Passo 2). Deixe explícito o próximo passo:

> Escolha os fluxos acima. Assim que você decidir, implemento no protótipo com a skill
> **`tela-ds-cs`** (que garante uso só de componentes/tokens do DS). Não vou desenhar
> nada antes dessa escolha.

## Estrutura da entrega (use este template)

```
# Análise UX — [Documento] · [Página/Seção]

## 1. O que o documento pede (em linguagem de produto/UX)
## 2. Fluxos — opções e recomendação
## 3. Cenários que a documentação talvez não previu
## 4. Backlog de ideias para o protótipo (pronto para tela-ds-cs)
## 5. Perguntas em aberto (decisões suas)
## Próximo passo
```

## Erros a evitar

- **Começar a desenhar/codar UI.** Esta skill entrega análise e para. UI = `tela-ds-cs`,
  depois da escolha do usuário.
- **Inventar conteúdo** quando o doc não abriu. Sem acesso, peça reconexão do Drive ou o
  texto colado.
- **Listar opções sem recomendar.** Sempre aponte a preferida e explique o porquê.
- **Só repetir a doc.** O valor está em traduzir para UX, recomendar fluxo e antecipar o
  que a doc não previu.
- **Descer a pixel/token.** Medidas e componentes exatos são responsabilidade da
  `tela-ds-cs`; aqui o nível é fluxo, usabilidade e ideias.
