# Especificação de Arquitetura: Análise Eleitoral 2026 (Mobile-First PWA)

Este documento especifica a arquitetura técnica para a aplicação web mobile-first destinada à análise comparativa dos resultados do 1º e 2º turno das Eleições Presidenciais de 2026 no Brasil, com foco em migração de votos, abstenções, nulos/brancos, "viradas" (flips) regionais e o impacto dos votos apurados/encerrados após as 17h no 2º turno.

---

## 1. Visão Geral da Arquitetura

A aplicação adota uma **arquitetura de duas camadas desassociadas (Decoupled/Static Architecture)** com um pipeline ETL offline prévio e um frontend PWA de alto desempenho consumindo dados estáticos e otimizados via CDN.

```text
 ┌────────────────────────────────────────────────────────┐
 │                   FONTE BRUTA (TSE)                    │
 │   - Arquivos CSV de Votação por Seção (1º e 2º Turno)  │
 │   - Arquivos de Boletim de Urna (BU) com Horários      │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                 PIPELINE ETL (PYTHON)                  │
 │   - Leitura, Limpeza e Tratamento dos Dados            │
 │   - Cálculo do Cruzamento 1º vs 2º Turno              │
 │   - Mapeamento de Seções Encerradas Pós-17h             │
 │   - Particionamento e Compressão                       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                DATAMART ESTÁTICO (JSON)                │
 │   - summary.json (Totais Nacionais)                    │
 │   - {UF}.json (Dados Agregados por Estado/Município)   │
 └───────────────────────────┬────────────────────────────┘
                             │ (Hospedagem em CDN / Vercel)
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │               FRONTEND PWA (MOBILE-FIRST)              │
 │   - React + Vite + TypeScript                          │
 │   - TailwindCSS + Lucide Icons                         │
 │   - Recharts (Gráficos Interativos Otimizados Touch)   │
 │   - Service Workers (Cache Offline & Fast Load)        │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Especificação do Pipeline ETL (Python)

### 2.1 Objetivos do Processamento
1. **Consolidação dos Turnos:** Cruzar dados por município (`CD_MUNICIPIO`) e zona eleitoral (`NR_ZONA`) entre o 1º e 2º turno.
2. **Análise Pós-17h:** Processar a coluna `DH_GERACAO` dos Boletins de Urna (BU) do 2º turno para identificar seções onde o encerramento/geração do BU ocorreu após as 17:00:00 (horário oficial local/Brasília).
3. **Mapeamento de Métricas:**
   * Votos Nominais por Candidato (Lula vs. Bolsonaro vs. Demais candidatos do 1º turno).
   * Votos Brancos e Nulos no 1º e 2º turno.
   * Total de Abstenções e Eleitores Aptos.
   * Identificação de Municípios com "Virada" (*Flip*).

### 2.2 Estrutura de Saída dos Dados (JSON Particionado)

Para otimizar a experiência mobile e evitar downloads pesados via redes móveis (4G/5G), os dados são repartidos em micro-arquivos JSON:

* `data/summary.json`: Totais agregados do Brasil e lista de UFs (carregado na inicialização).
* `data/states/{UF}.json`: Dados detalhados de cada município daquele estado (carregado sob demanda ao selecionar a UF).

#### Exemplo de Esquema JSON (`/data/states/SP.json`):
```json
{
  "uf": "SP",
  "total_municipios": 645,
  "summary": {
    "t1": { "lula": 8358998, "bolsonaro": 12239389, "brancos": 750000, "nulos": 1100000, "abstencao": 5200000 },
    "t2": { "lula": 10923456, "bolsonaro": 14216589, "brancos": 500000, "nulos": 800000, "abstencao": 5600000 },
    "pos_17h": {
      "total_secoes": 115000,
      "secoes_apos_17h": 4200,
      "votos_lula_apos_17h": 450000,
      "votos_bolsonaro_apos_17h": 380000
    }
  },
  "municipios": [
    {
      "cd_mun": "71072",
      "nome": "SÃO PAULO",
      "flipped": false,
      "t1": { "lula": 3212456, "bolsonaro": 2988123, "brancos": 180000, "nulos": 250000, "abstencao": 1200000 },
      "t2": { "lula": 3612456, "bolsonaro": 3288123, "brancos": 120000, "nulos": 180000, "abstencao": 1300000 },
      "pos_17h": {
        "secoes_totais": 24500,
        "secoes_pos_17h": 850,
        "lula_pos_17h": 120500,
        "bolsonaro_pos_17h": 98000
      }
    }
  ]
}
```

---

## 3. Arquitetura da Aplicação Web (Mobile-First)

### 3.1 Tecnologias e Bibliotecas
* **Framework:** React 18+ com Vite e TypeScript.
* **Estilização:** TailwindCSS com componentes responsivos focados em viewport mobile (`360px` a `430px`).
* **Icons:** Lucide-React.
* **Visualização de Dados:** Recharts (configurado com tooltips baseados em toque e eixos otimizados para layout vertical).
* **Gerenciamento de Estado:** Zustand ou React Context (para persistência do estado da pesquisa e cache de dados carregados no `localStorage`).

### 3.2 Princípios de Design Mobile (UX/UI)

1. **Navegação por Abas Inferiores (Bottom Navigation Bar):**
   * **Visão Geral:** Dashboard nacional e comparativo geral entre turnos.
   * **Abstenções & Nulos:** Análise detalhada do comportamento de nulos, brancos e abstenções.
   * **Viradas (Flips):** Mapeamento e lista de cidades onde houve alteração do vencedor no 2º turno.
   * **Análise Pós-17h:** Mapeamento de seções com horário estendido e distribuição de votos apurados após as 17h.

2. **Componentes Otimizados para Toque:**
   * **Bottom Sheets:** Modais que sobem da parte inferior da tela para seleção de Filtros e Estados.
   * **Horizontal Scroll Cards:** Métricas principais apresentadas em carrosséis de rápida rolagem lateral.
   * **Gráficos de Barras Horizontais:** Evita o truncamento de nomes de candidatos/regiões em telas pequenas.

3. **Performance & PWA:**
   * Manifest WebApp configurado (`display: standalone`) para instalação na tela inicial do smartphone.
   * Service Worker pré-carregando o arquivo `summary.json` e os dados do estado ativo para navegação instantânea.

---

## 4. Roteiro de Implementação

1. **Módulo ETL (`/etl/process_tse_data.py`):**
   * Download/Leitura do dataset do TSE.
   * Agregação por município/seção.
   * Exportação do conjunto de arquivos `summary.json` e `{UF}.json`.

2. **Módulo Frontend (`/src`):**
   * Configuração das rotas e abas inferiores no React.
   * Implementação dos componentes gráficos do Recharts.
   * Integração do carregamento dinâmico de dados com cache local.

3. **Deploy:**
   * Publicação do ecossistema no Vercel ou Netlify com CDN global ativada.