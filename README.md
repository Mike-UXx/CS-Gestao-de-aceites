# CS — Gestão de Aceites

Plataforma web de gestão de documentos corporativos e controle de aceite digital. Permite criar, distribuir e auditar documentos como Códigos de Conduta, Políticas LGPD e Termos de Uso, com rastreabilidade jurídica via hash SHA-256.

---

## Visão Geral

| Característica | Detalhe |
|---|---|
| **Tipo** | SPA (Single Page Application) |
| **Perfis de acesso** | Admin · Gestor · Colaborador |
| **Blindagem jurídica** | Hash SHA-256 por documento · WORM · trilha de auditoria |
| **Responsividade** | Mobile-First (AntD Grid) |

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| UI Library | Ant Design (AntD) v5 |
| Roteamento | React Router v6 |
| Build | Vite |
| Estilo | CSS-in-JS via AntD tokens + Montserrat |
| Data/Hora | Day.js (PT-BR) |
| Estado global | React Context + useReducer + localStorage |

---

## Módulos

| # | Módulo | Status | Branch |
|---|---|---|---|
| 01 | **Criação de Documentos** (Épicos 02 e 03) | ✅ Concluído — Sprint 1 | `feat/criacao-documento` |
| 02 | **Listagem de Documentos** | 🔄 Em desenvolvimento | `feat/listagem-documentos` |
| 03 | Aceite pelo Colaborador | 🔜 Planejado | — |
| 04 | Dashboard & Relatórios | 🔜 Planejado | — |

---

## Estrutura de Pastas

```
src/
├── features/                  # Módulos isolados por domínio
│   ├── criacao/               # Módulo 01 — Criação de Documentos
│   │   ├── pages/             # Steps do fluxo (SelectTemplate, Informações…)
│   │   ├── components/        # Componentes exclusivos (RadioCard, Stepper…)
│   │   ├── context/           # DocumentFormContext (estado global do formulário)
│   │   └── utils/             # fileHash (SHA-256)
│   └── listagem/              # Módulo 02 — Listagem (em construção)
│
├── components/
│   ├── layout/                # AppHeader · AppSidebar · AppFooter
│   └── documents/             # Cards reutilizáveis (NewDocumentCard, TemplateCard…)
│
├── data/                      # Mocks compartilhados (substituídos por API)
├── theme/                     # Design tokens (cores, fontes)
└── App.tsx                    # Roteamento principal
```

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Build de produção
npm run build
```

Acesse em: **http://localhost:5173**

---

## Regras de Negócio Críticas (Sprint 1)

- **RN01** — Upload restrito a PDF, máx. 10 MB
- **RN06** — Hash SHA-256 gerado no upload (imutabilidade)
- **RN20** — Um documento pertence a apenas uma classificação principal
- **Scroll Lock** — Botão de aceite habilitado somente após rolar todo o PDF
- **WORM** — Documentos publicados não podem ser alterados, apenas inativados

---

> Desenvolvido em parceria com **Contato Seguro** · Design System baseado em Ant Design
