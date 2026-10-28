---
name: Finanças IA Gabriel & Ana
description: Private Banking Dark Titanium UI para Gestão Financeira de Casal
colors:
  primary: "#10b981"
  primary-glow: "rgba(16, 185, 129, 0.2)"
  secondary: "#f43f5e"
  secondary-glow: "rgba(244, 63, 94, 0.2)"
  secondary-alt: "#ec4899"
  accent-ai: "#06b6d4"
  accent-ai-glow: "rgba(6, 182, 212, 0.25)"
  bg-canvas: "#07090e"
  bg-subtle: "#0c101a"
  surface-card: "#121826"
  surface-elevated: "#182236"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-strong: "rgba(255, 255, 255, 0.16)"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-tertiary: "#64748b"
  danger: "#ef4444"
  danger-light: "#f87171"
  warning: "#f59e0b"
  category-supermercado: "#10b981"
  category-alimentacao: "#f59e0b"
  category-transporte: "#06b6d4"
  category-moradia: "#6366f1"
  category-saude: "#ec4899"
  category-lazer: "#8b5cf6"
  category-compras: "#f43f5e"
  category-contas: "#eab308"
  category-educacao: "#14b8a6"
  category-outros: "#64748b"
typography:
  display:
    fontFamily: "Outfit, -apple-system, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Outfit, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Instrument Sans, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Instrument Sans, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  card: "22px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
components:
  card-executive:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-canvas}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
---

# Design System: Finanças IA Gabriel & Ana

## Overview

**Creative North Star: "The Private Vault"**

Interface de finanças executiva desenvolvida especificamente para a dinâmica do casal Gabriel e Ana. O visual afasta-se deliberadamente dos clichês de templates genéricos de inteligência artificial (gradientes multicoloridos em textos, neon despropositado e cards flutuantes sem ancoragem). Adota uma estética inspirada em private banking e cartões de titânio escuro: superfícies pretas jateadas, bordas acetinadas finas de 1px com reflexo discreto de luz ambiente, tipografia com números alinhados em modo tabular (`tabular-nums`) e distinção nítida entre o cônjuge pagador (Verde Esmeralda para Gabriel e Framboesa Nobre para Ana).

**Key Characteristics:**
- **Titânio Escuro Acetinado:** Camadas escuras profundas (`#07090e`, `#121826`) com contraste elevado e sem reflexos cansativos.
- **Precisão Numérica de Private Banking:** Todos os valores e porcentagens utilizam algarismos tabulares para alinhamento óptico absoluto de centavos.
- **Affordance e Operabilidade Real:** Botões com área de toque mínima de 44px, feedback tátil claro (`:active`), foco visível para acessibilidade e transições livres de recálculo de layout.
- **Identidade Pessoal do Casal:** Cores de acento reservadas para titularidade e estado, nunca para distração cosmética.

## Colors

Paleta refinada com base em cinzas-titânio profundos e dois acentos nobres para o casal.

### Primary (Gabriel)
- **Verde Esmeralda** (`#10b981`): Identifica lançamentos, salários e contribuições de Gabriel. Utilizado também em saldos positivos e confirmações.

### Secondary (Ana)
- **Framboesa Nobre** (`#f43f5e` / `#ec4899`): Identifica lançamentos, salários e contribuições de Ana. Tom sofisticado e legível sobre preto.

### Tertiary (Inteligência Artificial)
- **Ciano Nórdico** (`#06b6d4`): Destaque exclusivo para ações de visão computacional e conclusão do auditor NVIDIA Nemotron 550B.

### Neutral
- **Preto Titânio (Canvas)** (`#07090e`): Fundo geral imersivo.
- **Surface Card** (`#121826`): Base dos cartões e modais.
- **Text Main** (`#f8fafc`): Texto primário de alto contraste (>= 7:1).
- **Text Muted** (`#94a3b8`): Metadados, descrições e legendas (>= 4.5:1).
- **Text Dim** (`#64748b`): Rótulos secundários e timestamps.

**The One Voice Rule:** Acentos de cor (verde e framboesa) representam titularidade e estado financeiro. Nunca pinte botões neutros ou títulos gerais com essas cores sem que haja correlação com o casal.

## Typography

**Display Font:** Outfit (fallback: system-ui, -apple-system, sans-serif)  
**Body Font:** Instrument Sans (fallback: system-ui, -apple-system, sans-serif)  
**Números & Finanças:** `font-variant-numeric: tabular-nums lining-nums;` obrigatório em todo valor monetário.

### Hierarchy
- **Display** (800, 36px / 2.25rem, line-height: 1.1): Sobra do mês no cartão executivo.
- **Headline** (700, 18px / 1.125rem, line-height: 1.3): Títulos de seções, modais e relatórios.
- **Title** (700, 14px / 0.875rem, line-height: 1.4): Nomes de estabelecimentos e fontes de renda.
- **Body** (400, 13px / 0.8125rem, line-height: 1.5): Textos explicativos e diagnósticos da IA.
- **Label** (700, 11px / 0.6875rem, letter-spacing: 0.05em, uppercase): Rótulos de métricas e status.

**The Solid Text Rule:** O texto jamais utiliza gradiente com clipping. A ênfase visual provém exclusivamente de peso, escala tipográfica e contraste sólido.

## Layout

- **Largura Máxima:** Container centralizado em 680px com espaçamentos laterais de 16px (mobile-first responsivo).
- **Dock de Ações:** Barra de ferramentas flutuante na parte inferior, fixada com espaçamento seguro de `env(safe-area-inset-bottom)`.
- **Rhythm:** Espaçamento vertical rítmico de 12px a 20px entre agrupamentos de dados, facilitando escaneamento visual imediato.

## Elevation & Depth

Profundidade alcançada por sobreposição tonal e sombras físicas com offset em Y, dispensando halos neon artificiais.

### Shadow Vocabulary
- **Card Shadow** (`box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.7)`): Elevação do cartão executivo e modais.
- **Subtle Float** (`box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.4)`): Cartões de transação e docks.
- **Tonal Inset** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12)`): Borda superior chanfrada de iluminação física.

**The Physical Shadow Rule:** Sombras sempre possuem offset vertical e dispersão suave. Halos coloridos com offset zero (`0 0 15px color`) são proibidos.

## Shapes

- **Raio Executivo:** Cantos arredondados contínuos de 22px para grandes blocos estruturais e 10px-12px para botões e inputs.
- **Bordas Acetinadas:** Linha contínua de 1px com transparência suave (`rgba(255, 255, 255, 0.08)`) que se acentua no foco ou hover.

## Components

### Cartão Executivo Black Titanium
- **Estrutura:** Chip dourado escovado, sobra do mês em display monumental, métricas consolidadas em 3 colunas e barra de distribuição proporcional do casal.
- **Barra Proporcional:** Duas faixas coloridas indicando percentual gasto por Gabriel e Ana, com transições em escala aceleradas por GPU.

### Botão de Scanner com IA
- **Destaque:** Localizado no centro do dock inferior com gradiente de alta tecnologia (Esmeralda para Ciano), ícone vetorial nítido e anel de pulsação suave para atração tátil sem sobrecarregar a tela.

### Extrato de Transações
- **Agrupamento:** Lançamentos organizados por dia com total diário em destaque discreto.
- **Item de Transação:** Ícone de categoria em background neutro suave, nome limpo do estabelecimento, badge do pagador (Gabriel ou Ana), método de pagamento e valor em negrito com botões de ação rápida (editar e excluir).

## Do's and Don'ts

### Do:
- **Do** utilizar `font-variant-numeric: tabular-nums lining-nums;` em todos os valores numéricos.
- **Do** garantir contraste de texto superior a 4.5:1 para legendas e 7:1 para valores principais.
- **Do** oferecer feedback visual tátil imediato em botões (`:active { transform: scale(0.98); }`).
- **Do** manter a área de clique de botões do mobile em no mínimo 44x44px.

### Don't:
- **Don't** aplicar gradiente em textos (`background-clip: text`).
- **Don't** animar propriedades de layout como `width`, `height` ou `margin` com `transition` que causem layout thrashing.
- **Don't** usar sombras com offset zero e brilhos fluorescentes sem fonte de luz.
- **Don't** usar fontes genéricas de IA como Plus Jakarta Sans ou Roboto.
