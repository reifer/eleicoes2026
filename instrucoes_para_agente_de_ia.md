# Instruções para Agente de IA / Assistente da IDE (System Prompt)

Este documento orienta assistentes e agentes de IA (Cursor, GitHub Copilot, Windsurf, Claude Dev, etc.) na execução e construção do projeto **Análise Eleitoral 2022 (Mobile-First)**.

---

## 🎯 Objetivo Principal

Construir uma aplicação web PWA com foco total na experiência **Mobile-First** para analisar comparativamente os resultados do 1º e 2º turno das Eleições Presidenciais de 2022 no Brasil (migração de votos, abstenções, nulos/brancos, viradas de municípios e impacto de votos apurados após as 17h no 2º turno).

---

## 📄 Documentação de Referência Obligatória

Antes de gerar qualquer código, leia e siga rigorosamente as diretrizes contidas nos três arquivos da raiz do projeto:

1. **`arquitetura_do_sistema.md`**: Especificação técnica da solução em duas camadas (ETL Python + React PWA).
2. **`estrutura_de_pastas_e_diretorios.md`**: Mapeamento exato de onde cada arquivo deve ser criado.
3. **`contrato_de_dados_e_design_system.md`**: Esquemas de dados JSON, tipagem TypeScript e guia visual/UI.

---

## 🛠️ Regras Técnicas para Geração de Código

### 1. Camada ETL (Python - `/etl`)
- **Script principal:** `etl/process_tse.py`.
- Utilize **Pandas** ou **DuckDB** para manipular e cruzar os dados brutos do TSE.
- Respeite o contrato de dados: a saída DEVE ser particionada em `output/summary.json` e `output/states/{UF}.json`.
- Adicione tratamento de exceções e logs informativos no terminal para acompanhar o processamento.

### 2. Camada Frontend (React + TypeScript - `/src`)
- **Framework:** React + Vite + TypeScript.
- **Estilização:** TailwindCSS (use classes utilitárias alinhadas às telas verticais).
- **Tipagem:** Utilize estritamente as interfaces declaradas em `contrato_de_dados_e_design_system.md` e armazenadas em `src/types/tse.ts`.
- **UI/UX Mobile:**
  - Mantenha a barra de navegação inferior (*Bottom Navigation Bar*) fixa.
  - Garanta que todos os botões e áreas clicáveis tenham altura mínima de **48px** (*Touch Target*).
  - Use o padrão *Bottom Sheet* (modal que sobe do rodapé) para seleção de estados e municípios.
  - Abreviar grandes números (ex: `1.5M`, `250k`) usando funções utilitárias em `src/utils/formatters.ts`.
- **Gráficos:** Utilize **Recharts** com layouts horizontais de barras para evitar que os nomes fiquem truncados em celulares.

---

## 🚀 Ordem Recomendada de Implementação

Ao solicitar novas tarefas à IA, siga esta ordem lógica:

1. **Setup Inicial:** Criar o projeto Vite React com TypeScript e instalar dependências (`tailwindcss`, `recharts`, `lucide-react`).
2. **Tipagem e Mocks:** Criar `src/types/tse.ts` e dados estáticos mockados para testar a interface imediatamente.
3. **Componentes Base de UI:** Implementar Header compacto, Bottom Navigation e o container PWA.
4. **Páginas da Aplicação:** Construir as 4 telas (`Overview`, `Flips`, `Turnout`, `Post17h`).
5. **ETL Python:** Implementar a automação em `etl/process_tse.py` para gerar os JSONs reais a partir da base do TSE.

---

## ⚠️ Restrições e Cuidados
- **NÃO** tente carregar arquivos CSV gigantescos diretamente no frontend em React.
- **NÃO** utilize bibliotecas pesadas de UI desktop (ex: tabelas complexas sem adaptação para scroll/cards móveis).
- **SEMPRE** mantenha o layout responsivo testado em larguras entre `360px` e `430px`.