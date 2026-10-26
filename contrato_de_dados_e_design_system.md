# Contrato de Dados e Especificação de Interface (Mobile-First)

Este documento especifica o contrato dos dados das Eleições Presidenciais de 2026 gerados pelo pipeline ETL (Python) para consumo da aplicação frontend (React PWA), assim como as convenções de design system, paleta de cores e interatividade mobile.

> Os valores numéricos nos exemplos abaixo são apenas ilustrativos e não constituem resultados oficiais de 2026. As saídas de demonstração do ETL também são sintéticas e identificadas por `data_source: "demo"`.

---

## 1. Esquema dos Arquivos JSON (Camada de Dados)

### 1.1 Resumo Nacional (`/data/summary.json`, publicado em `public/data/summary.json`)

Carregado no momento da inicialização da aplicação para alimentar a aba principal de Visão Geral.

```json
{
  "updated_at": "2026-10-26T02:00:00Z",
  "totais_brasil": {
    "t1": {
      "aptos": 156454011,
      "validos": 118229719,
      "lula": 57259504,
      "bolsonaro": 51072345,
      "demais": 9897870,
      "brancos": 1964779,
      "nulos": 3487874,
      "abstencao": 32770982
    },
    "t2": {
      "aptos": 156454011,
      "validos": 118552353,
      "lula": 60345999,
      "bolsonaro": 58206354,
      "brancos": 1589807,
      "nulos": 3930765,
      "abstencao": 32200908
    }
  },
  "pos_17h_brasil": {
    "secoes_total": 472075,
    "secoes_pos_17h": 18450,
    "votos_lula_pos_17h": 2150000,
    "votos_bolsonaro_pos_17h": 1850000,
    "brancos_pos_17h": 45000,
    "nulos_pos_17h": 98000
  },
  "ufs": [
    { "sigla": "AC", "nome": "Acre" },
    { "sigla": "AL", "nome": "Alagoas" },
    { "sigla": "SP", "nome": "São Paulo" }
  ]
}
```

---

### 1.2 Dados por Estado (`/data/states/{UF}.json`, publicado em `public/data/states/{UF}.json`)

Carregado sob demanda quando o usuário seleciona um estado específico no aplicativo.

```json
{
  "uf": "SP",
  "nome_estado": "São Paulo",
  "total_municipios": 645,
  "totais": {
    "t1": {
      "aptos": 34642000,
      "validos": 24200000,
      "lula": 8358998,
      "bolsonaro": 12239389,
      "brancos": 750000,
      "nulos": 1100000,
      "abstencao": 5200000
    },
    "t2": {
      "aptos": 34642000,
      "validos": 25140000,
      "lula": 10923456,
      "bolsonaro": 14216589,
      "brancos": 500000,
      "nulos": 800000,
      "abstencao": 5600000
    }
  },
  "pos_17h": {
    "secoes_total": 115000,
    "secoes_pos_17h": 4200,
    "votos_lula_pos_17h": 450000,
    "votos_bolsonaro_pos_17h": 380000,
    "brancos_pos_17h": 12000,
    "nulos_pos_17h": 25000
  },
  "viradas_municipios": [
    {
      "cd_municipio": "71072",
      "nome_municipio": "SÃO PAULO",
      "t1_vencedor": "BOLSONARO",
      "t2_vencedor": "LULA",
      "diferenca_votos": 124500
    }
  ],
  "municipios": [
    {
      "cd_mun": "71072",
      "nome": "SÃO PAULO",
      "flipped": false,
      "t1": {
        "lula": 3212456,
        "bolsonaro": 2988123,
        "brancos": 180000,
        "nulos": 250000,
        "abstencao": 1200000
      },
      "t2": {
        "lula": 3612456,
        "bolsonaro": 3288123,
        "brancos": 120000,
        "nulos": 180000,
        "abstencao": 1300000
      },
      "pos_17h": {
        "secoes_totais": 24500,
        "secoes_pos_17h": 850,
        "votos_lula": 120500,
        "votos_bolsonaro": 98000
      }
    }
  ]
}
```

---

## 2. Tipagem em TypeScript (`src/types/tse.ts`)

```typescript
export interface TurnoData {
  aptos?: number;
  validos?: number;
  lula: number;
  bolsonaro: number;
  demais?: number;
  brancos: number;
  nulos: number;
  abstencao: number;
}

export interface Pos17hData {
  secoes_total?: number;
  secoes_pos_17h: number;
  votos_lula_pos_17h?: number;
  votos_bolsonaro_pos_17h?: number;
  brancos_pos_17h?: number;
  nulos_pos_17h?: number;
  votos_lula?: number;
  votos_bolsonaro?: number;
}

export interface ViradaMunicipio {
  cd_municipio: string;
  nome_municipio: string;
  t1_vencedor: 'LULA' | 'BOLSONARO';
  t2_vencedor: 'LULA' | 'BOLSONARO';
  diferenca_votos: number;
}

export interface Municipio {
  cd_mun: string;
  nome: string;
  flipped: boolean;
  t1: TurnoData;
  t2: TurnoData;
  pos_17h: Pos17hData;
}

export interface StateData {
  uf: string;
  nome_estado: string;
  total_municipios: number;
  totais: {
    t1: TurnoData;
    t2: TurnoData;
  };
  pos_17h: Pos17hData;
  viradas_municipios: ViradaMunicipio[];
  municipios: Municipio[];
}
```

---

## 3. Design System e Diretrizes de UI Mobile

### 3.1 Paleta de Cores Recomendada

| Elemento / Atributo | Cor Hexadecimal | Classe Tailwind |
| :--- | :--- | :--- |
| **Candidato Lula** | `#E53E3E` | `bg-red-600` / `text-red-600` |
| **Candidato Bolsonaro** | `#3182CE` | `bg-blue-600` / `text-blue-600` |
| **Brancos / Nulos** | `#718096` | `bg-slate-500` / `text-slate-500` |
| **Abstenção** | `#DD6B20` | `bg-orange-600` / `text-orange-600` |
| **Análise Pós-17h** | `#805AD5` | `bg-purple-600` / `text-purple-600` |
| **Fundo da Aplicação** | `#F7FAFC` | `bg-slate-50` |
| **Superfície dos Cards** | `#FFFFFF` | `bg-white` |

---

### 3.2 Regras de Usabilidade Mobile

1. **Alvos de Toque (Touch Targets):** Mínimo de `48px x 48px` para todos os botões e links navegáveis na barra inferior.
2. **Exibição Numérica Abreviada:** Formatação de grandes números para economia de espaço em telas pequenas:
   * `1.500.000` ➔ **1,5M**
   * `250.000` ➔ **250k**
3. **Modais Estilo Bottom Sheet:** Filtros de seleção de UF e município emergem da parte inferior do dispositivo para facilidade de manuseio com uma mão.