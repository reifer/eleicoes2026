# Estrutura de Diretórios do Projeto: Análise Eleitoral 2022 (Mobile-First)

Este documento especifica a organização de arquivos e diretórios do projeto **Análise Eleitoral 2022**, abrangendo a divisão entre a camada de ETL (Python) e o frontend web mobile-first (React + TypeScript + Vite + TailwindCSS).

```text
eleicoes-analise-mobile/
├── .gitignore
├── package.json               # Dependências do app React (React, Tailwind, Recharts, Lucide, etc.)
├── tsconfig.json              # Configuração do TypeScript
├── tailwind.config.js         # Configuração do TailwindCSS (cores e breakpoints mobile)
├── vite.config.ts             # Configuração do Vite + Plugin PWA
├── README.md                  # Documentação principal do projeto
├── arquitetura.md             # Especificação técnica da arquitetura do sistema
├── arvorediretorio.md         # Mapeamento e especificação da estrutura de diretórios
│
├── etl/                       # Pipeline de Processamento de Dados (Python)
│   ├── requirements.txt       # Dependências do ETL (pandas, requests, pyarrow, etc.)
│   ├── raw/                   # [Ignorado no Git] Armazena arquivos CSVs/Zips brutos do TSE
│   ├── output/                # JSONs finais particionados por UF (gerados pelo script)
│   │   ├── summary.json       # Resumo consolidado nacional
│   │   └── states/            # JSONs individuais por estado (ex: SP.json, RJ.json)
│   └── process_tse.py         # Script principal de limpeza, agregação e cruzamento de dados
│
└── src/                       # Código-fonte da aplicação Mobile-First PWA
    ├── assets/                # Ícones, splash screens, logos e imagens estáticas
    ├── components/            # Componentes reutilizáveis de interface
    │   ├── common/            # Elementos base (Cards, Botões, Modais / Bottom Sheets)
    │   ├── layout/            # Barra de navegação inferior (Bottom Nav) e Header compacto
    │   └── charts/            # Gráficos responsivos otimizados para toque (Recharts)
    │
    ├── data/                  # Constantes e metadados auxiliares
    │   └── ufs.ts             # Lista de estados brasileiros, regiões e códigos TSE
    │
    ├── hooks/                 # Hooks customizados para lógica do React
    │   ├── useTseData.ts      # Hook para carregamento dinâmico dos JSONs por UF
    │   └── useLocalStorage.ts # Hook para gerenciamento de cache local no dispositivo
    │
    ├── pages/                 # Telas da barra de navegação inferior (Bottom Nav)
    │   ├── Overview.tsx       # Visão Geral (Comparativo nacional/estadual 1º vs 2º turno)
    │   ├── Flips.tsx          # Análise de "Viradas" (Municípios que alteraram o vencedor)
    │   ├── Turnout.tsx        # Detalhamento de Brancos, Nulos e Abstenções
    │   └── Post17h.tsx        # Análise de Seções/Votos encerrados após as 17h
    │
    ├── types/                 # Definições de tipos TypeScript
    │   └── tse.ts             # Interfaces para respostas dos dados do TSE e agregados
    │
    ├── utils/                 # Funções utilitárias e ajudantes
    │   ├── formatters.ts      # Formatadores para números, porcentagens e abreviações (ex: 1.5M)
    │   └── analytics.ts       # Cálculos matemáticos secundários para exibições em tela
    │
    ├── App.tsx                # Componente raiz da aplicação com rotas/abas
    ├── main.tsx               # Ponto de entrada do React
    └── index.css              # Estilos globais e diretivas do TailwindCSS
```

## Detalhamento das Responsabilidades

### 1. Camada ETL (`/etl`)
* **`raw/`**: Diretório reservado para o download temporário das bases brutas de Boletins de Urna e Votação por Seção do TSE.
* **`output/`**: Local de destino do dataset processado. Os arquivos aqui gerados serão publicados na CDN para consumo da aplicação frontend.
* **`process_tse.py`**: Converte os arquivos CSV gigantescos em arquivos JSON ultraleves particionados por estado, realizando o cálculo da variação entre turnos e marcando as seções encerradas após as 17h.

### 2. Camada Frontend (`/src`)
* **`components/layout/`**: Contém os componentes de navegação adaptados para o uso de smartphones com uma mão só (navegação por abas inferiores fixa).
* **`components/charts/`**: Encapsula os gráficos interativos da biblioteca Recharts configurados para rolagem e gestos de toque.
* **`pages/`**: Cada arquivo mapeia uma das 4 abas principais da barra de navegação inferior (*Overview*, *Flips*, *Turnout*, *Post17h*).
* **`types/tse.ts`**: Garante a consistência dos dados manipulados na aplicação com tipagem forte via TypeScript.