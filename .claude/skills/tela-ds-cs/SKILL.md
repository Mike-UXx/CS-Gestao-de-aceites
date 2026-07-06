---
name: tela-ds-cs
description: >-
  Fluxo obrigatório para criar, implementar, montar, redesenhar ou ajustar qualquer tela,
  página, modal, drawer, fluxo ou componente de UI de protótipo em React + Ant Design da
  Contato Seguro — vale para o Gestão de Aceites E para qualquer outro projeto/protótipo.
  Use SEMPRE que o usuário pedir para desenvolver, desenhar, implementar, montar ou ajustar
  interface/telas de protótipo — mesmo que não mencione "design system", "Figma",
  "componente", "token" ou o nome do projeto. Garante que só sejam usados componentes e
  tokens do "Ant Design System for Figma 5.24 (CS)", validando regras e formatos de uso na
  "Documentação DS CS - Ant design" antes de aplicar cada componente, priorizando o melhor
  fluxo e usabilidade.
---

# Desenvolver telas de protótipo com o Design System (DS CS)

Vale para **qualquer protótipo/tela em React + Ant Design da Contato Seguro** — o Gestão de
Aceites é só um dos projetos; o mesmo Design System serve os demais. A regra é igual em
todos: não se inventa UI. Toda tela nasce do Design System da Contato Seguro, que é um Ant
Design System. Isso garante consistência entre produtos, valor e velocidade: em vez de
decidir cores/espaçamentos/variantes na hora, você reutiliza o que o time já validou no
Figma. Antes de escrever qualquer JSX, consulte as fontes de verdade abaixo.

## Fontes de verdade (Figma MCP — já autenticado)

Use as ferramentas `mcp__plugin_design_figma__*` **sempre escopadas a estes fileKeys**
(são os mesmos para todos os projetos):

- **Biblioteca de componentes/tokens** — "Ant Design System for Figma 5.24 (CS)"
  `fileKey = 5qpUdqLgRIkJVg0Jv9mmzz` (entrada: página `317:21821`, "Welcome 👋").
  É a **única fonte permitida** de componentes e tokens.
- **Documentação de uso** — "Documentação DS CS - Ant design"
  `fileKey = oxWdrfMAs9XXh4WlWlU5d9` (entrada: `674:1963`).
  Traz regras, formatos, variantes corretas e do/don't de cada componente.

Não use outras bibliotecas do Figma nem UI kits externos.

## A regra de decisão (o coração da skill)

Para **cada** componente que a tela precisa:

1. **Existe na Documentação DS?** → siga o formato de lá: variante, estados, espaçamentos,
   conteúdo, do/don't. A documentação vence sempre, porque codifica a decisão do time.
2. **Não está documentado?** → use o componente **no formato atual da biblioteca Ant DS**
   (`5qpUdqLgRIkJVg0Jv9mmzz`): pegue as variantes/props/medidas reais de lá.
3. **Não existe no DS?** → use o componente do DS **mais próximo** do que você precisa e
   **avise o usuário** da lacuna. Nunca crie um componente fora do padrão do zero.

## Passo a passo

1. **Alinhe intenção e fluxo primeiro.** Antes de componentes, entenda objetivo da tela,
   quem usa, dados exibidos, ações e estados (vazio, carregando, erro, sucesso). Desenhe o
   **menor caminho** até o objetivo. Se o pedido estiver vago, faça 1-2 perguntas ou use a
   skill de brainstorming. Boas práticas de design não são enfeite: hierarquia clara,
   consistência com as telas existentes e menos passos = menos erro do usuário.

2. **Faça o inventário de componentes** da tela (ex.: cabeçalho, tabela, filtros, botões,
   tags de status, modal de confirmação, formulário, estado vazio).

3. **Consulte o Figma por componente**, aplicando a regra de decisão:
   - `get_metadata(fileKey)` sem `nodeId` → lista as páginas; com `nodeId` → aprofunda na
     estrutura para achar o componente.
   - `search_design_system(query, fileKey)` → localiza componentes/variáveis/estilos por
     nome. Use `get_libraries(fileKey)` para pegar a *library key* e escopar a busca com
     `includeLibraryKeys`.
   - `get_design_context(fileKey, nodeId)` → detalhes do componente (variantes, props,
     medidas, anatomia). É a ferramenta preferida para entender um nó.
   - Comece pela **Documentação** (`oxWdrfMAs9XXh4WlWlU5d9`); só caia na **biblioteca**
     (`5qpUdqLgRIkJVg0Jv9mmzz`) quando o componente não estiver documentado.

4. **Tokens, não valores mágicos.** Cores, tipografia, espaçamento, radius e sombras devem
   sair dos tokens do DS (`get_variable_defs`). No código, mapeie para o tema do projeto
   atual (ex.: no Gestão de Aceites, `ConfigProvider` + `src/theme/tokens`) — nunca hardcode
   hex/px soltos que já existam como token.

5. **Traduza DS → código.** O DS é Ant Design, então implemente com os componentes reais do
   pacote `antd` correspondentes, usando as props/variantes que refletem o que você viu no
   Figma/documentação. **Reaproveite** o que o projeto atual já tem (tema, tokens,
   componentes de layout, padrões das telas existentes) antes de criar algo novo.

6. **Feche com usabilidade e verificação.** Garanta estados (loading/empty/error), foco e
   labels acessíveis, contraste, responsividade quando fizer sentido, e feedback claro nas
   ações. Rode o preview e **compare o resultado com o DS/documentação** antes de dar por
   pronto. Se você teve que fugir do DS em algum ponto, diga explicitamente o quê e por quê.

## Erros a evitar

- Escolher variante/estado "de cabeça" sem checar a documentação.
- Hardcodar cor/espaçamento que já é token do DS.
- Introduzir um componente que não existe no DS sem sinalizar.
- Copiar medidas de uma tela/código legado que já divergia do DS — a fonte de verdade é o
  Figma, não o código antigo.
