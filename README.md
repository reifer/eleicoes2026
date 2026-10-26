# Análise Eleitoral 2022 — Mobile-First PWA

Aplicação web progressiva para análise comparativa dos resultados do 1º e 2º turnos das Eleições Presidenciais de 2022 no Brasil. O projeto combina um pipeline ETL offline em Python, que processa arquivos oficiais do TSE e produz JSONs particionados, com uma aplicação React PWA mobile-first que consome esses dados estáticos.

As análises previstas incluem votos por candidato, brancos e nulos, abstenções, municípios em que houve virada do vencedor e votos/seções associados a boletins gerados após as 17h no 2º turno. A aplicação deve priorizar telas entre 360px e 430px e carregar os dados estaduais sob demanda.

## Estrutura

- `etl/raw/`: arquivos originais do TSE; ignorados pelo Git.
- `etl/process_tse.py`: ponto de entrada previsto para o processamento ETL.
- `etl/output/`: destino previsto dos JSONs gerados, incluindo `summary.json` e `states/{UF}.json`.
- `src/`: aplicação React, componentes, páginas, hooks, tipos e utilitários.
- `arquitetura_do_sistema.md`, `contrato_de_dados_e_design_system.md` e `estrutura_de_pastas_e_diretorios.md`: especificações de referência.
- `FasesdoProjeto.md`: sequência de implementação e critérios de aceite.

## Pré-requisitos

- Git.
- Node.js 20 ou superior e npm, para o frontend.
- Python 3.10 ou superior e `venv`, para o ETL.

O ETL usa Python e Pandas. A configuração do frontend será adicionada quando o aplicativo React/Vite for iniciado; ainda não há `package.json`.

## Instalação e preparação do ambiente

Clone o repositório e entre na pasta do projeto:

```bash
git clone <URL_DO_REPOSITORIO>
cd Eleicoes2026
```

### Ambiente Python

Crie e ative um ambiente virtual:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

No Windows PowerShell, ative com:

```powershell
.venv\Scripts\Activate.ps1
```

Instale as dependências do ETL:

```bash
python -m pip install -r etl/requirements.txt
```

### Frontend

O frontend ainda não tem `package.json`; portanto, a instalação e execução do React serão documentadas quando essa etapa começar.

## Dados e execução

Mantenha os arquivos originais de votação por seção e os Boletins de Urna em `etl/raw/`. Esses dados não devem ser adicionados ao Git nem carregados diretamente no navegador.

### Gerar saídas sintéticas de demonstração

Para exercitar o pipeline antes de obter os arquivos de origem:

```bash
python etl/process_tse.py --demo
```

Os valores são fictícios e os JSONs indicam `"data_source": "demo"`. Não use nem publique esses números como resultados oficiais.

### Processar arquivos TSE

O processamento real exige quatro CSVs: votação por seção para cada turno, um arquivo de comparecimento/abstenção por seção contendo os dois turnos e um arquivo de Boletins do 2º turno com `DH_GERACAO`. Os identificadores devem permitir cruzar seção por `SG_UF`, `CD_MUNICIPIO`, `NR_ZONA` e `NR_SECAO`. A votação precisa conter `NR_TURNO`, `NR_VOTAVEL`, `NM_VOTAVEL`, `QT_VOTOS` e `DS_CARGO` (ou `CD_CARGO` para identificar Presidente); o arquivo de comparecimento deve conter `QT_APTOS`, `QT_ABSTENCOES` e `NR_TURNO`.

Os nomes padrão reconhecidos automaticamente em `etl/raw/` são `votacao_t1.csv`, `votacao_t2.csv`, `comparecimento_abstencao.csv` e `boletins_t2.csv`:

```bash
python etl/process_tse.py
```

Ou informe caminhos explícitos:

```bash
python etl/process_tse.py \
  --first-turn etl/raw/votacao_t1.csv \
  --second-turn etl/raw/votacao_t2.csv \
  --attendance etl/raw/comparecimento_abstencao.csv \
  --bu etl/raw/boletins_t2.csv
```

Por padrão, CSVs usam separador `;` e codificação `latin-1`. Ajuste com `--delimiter` e `--encoding` se a origem usar outras configurações. O ETL interpreta o horário local contido em `DH_GERACAO` como proxy do encerramento e classifica somente horários estritamente posteriores a `17:00:00` como pós-17h; valide essa interpretação contra a documentação dos arquivos TSE antes de publicar resultados.

O script grava as saídas:

- `etl/output/summary.json`: totais nacionais e lista de UFs.
- `etl/output/states/{UF}.json`: totais e dados municipais da UF.

Os dados de aptos e abstenção são lidos da fonte de comparecimento, pois não são inferidos dos votos por candidato. O ETL valida os arquivos e as chaves de seção, os campos do contrato e a reconciliação dos totais nacionais com as partições estaduais antes de gravar.

Para os arquivos estaduais, o ETL segue o esquema detalhado em `contrato_de_dados_e_design_system.md` (`totais`, `pos_17h`, `viradas_municipios`, `cd_mun` e `nome_estado`), em vez dos nomes alternativos usados no exemplo da arquitetura. Os cruzamentos de entrada usam município, zona e seção; as saídas são agregadas por município.

Execute os testes automatizados do ETL com:

```bash
python -m unittest discover -s etl -p 'test_*.py' -v
```

O frontend consumirá o resumo na inicialização e carregará cada JSON estadual sob demanda. As instruções de build e publicação serão adicionadas quando o frontend estiver implementado.

## Documentação

Consulte [FasesdoProjeto.md](./FasesdoProjeto.md) para acompanhar o progresso. As caixas devem ser marcadas somente após a conclusão e verificação do item e dos critérios de aceite aplicáveis.
