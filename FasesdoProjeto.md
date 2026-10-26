# Fases do Projeto — Análise Eleitoral 2026

Este roteiro organiza o desenvolvimento em ordem estritamente sequencial. Conclua os itens de uma fase e verifique seus critérios de aceite antes de iniciar a fase seguinte.

**Regra de acompanhamento:** a IA ou o desenvolvedor deve marcar cada caixa (`- [ ]` → `- [x]`) assim que o item correspondente for concluído e verificado. Não marque etapas ou critérios como concluídos por intenção; marque-os somente após validar o resultado.

**Documentação de referência:** este roteiro foi elaborado a partir de `arquitetura_do_sistema.md`, `contrato_de_dados_e_design_system.md`, `estrutura_de_pastas_e_diretorios.md` e `instrucoes_para_agente_de_ia.md`. O arquivo `prompt_da_ia.md` solicitado não estava presente na raiz na elaboração deste documento; se for adicionado, leia-o e reconcilie eventuais requisitos antes de prosseguir com o projeto.

---

## Fase 1 — Preparação do projeto e do ambiente

- [x] Confirmar o objetivo do produto: PWA mobile-first para análise comparativa do 1º e 2º turnos das Eleições Presidenciais de 2026.
- [x] Revisar os documentos de arquitetura, estrutura de diretórios, contrato de dados/design system e instruções para agente de IA.
- [x] Confirmar e registrar a estrutura de trabalho prevista: raiz do projeto, `etl/` e `src/`.
- [x] Definir versões compatíveis de Node.js e Python e registrá-las na documentação do projeto.
- [x] Criar e configurar o repositório Git e o `.gitignore`, excluindo arquivos brutos do TSE, ambientes virtuais, dependências instaladas e saídas temporárias.
- [x] Criar a estrutura de diretórios descrita em `estrutura_de_pastas_e_diretorios.md`, incluindo `etl/raw/`, `public/data/states/` e as pastas previstas de `src/`.
- [x] Criar o `README.md` com visão geral, pré-requisitos e instruções reproduzíveis de instalação, execução e testes do ETL.
- [x] Registrar comandos reproduzíveis para instalar dependências e executar cada parte do projeto.

**Critérios de aceite da Fase 1**

- [x] A estrutura necessária existe na raiz correta e corresponde à documentação, sem incluir dados brutos no Git.
- [x] As versões de runtime e os comandos de instalação/execução estão documentados e podem ser seguidos em um ambiente limpo.
- [x] O repositório está inicializado e as regras de exclusão protegem arquivos brutos, ambientes locais e artefatos gerados.
- [x] Os documentos de referência foram revisados; qualquer divergência ou documento ausente foi registrado antes de continuar.

## Fase 2 — Especificação e preparação dos dados de origem

- [ ] Identificar e obter as bases oficiais do TSE das Eleições Presidenciais de 2026 necessárias: votação por seção nos dois turnos e Boletins de Urna com horários do 2º turno.
- [ ] Guardar arquivos originais em `etl/raw/`, preservando-os sem alterações e mantendo-os fora do controle de versão.
- [ ] Registrar origem, data de obtenção, período, formato, codificação e eventuais limitações de cada arquivo.
- [ ] Inspecionar colunas, tipos, valores ausentes, duplicidades, chaves e granularidade dos arquivos antes de implementar os cálculos.
- [x] Confirmar as chaves para cruzar turnos por município e zona eleitoral e para associar os dados de seção aos Boletins de Urna; as seções são identificadas por UF, município, zona e seção.
- [x] Definir como interpretar `DH_GERACAO` e identificar encerramentos após as 17:00:00 no horário oficial local/Brasília; o horário local do campo é tratado como proxy e apenas horários estritamente posteriores a 17:00:00 são classificados como pós-17h.
- [x] Resolver e documentar as diferenças entre exemplos de campos do contrato antes de fixar o formato de saída, mantendo um esquema canônico validável; os JSONs estaduais seguem os nomes do contrato de dados.

**Critérios de aceite da Fase 2**

- [ ] As fontes exigidas estão disponíveis localmente, identificadas e não foram modificadas.
- [ ] A inspeção confirma que as colunas e chaves necessárias estão presentes ou registra explicitamente os dados indisponíveis.
- [x] As regras de cruzamento, horário e tratamento de ausências/duplicidades estão documentadas e podem ser aplicadas de forma determinística.
- [x] O esquema JSON canônico foi definido com base no contrato de dados, incluindo nomes de campos e diferenças entre resumo nacional e arquivos estaduais.

## Fase 3 — Implementação do ETL em Python

- [x] Criar `etl/requirements.txt` com as dependências necessárias; Pandas é a dependência direta usada pelo pipeline.
- [x] Criar o script principal `etl/process_tse.py`.
- [x] Implementar a leitura dos arquivos TSE com tratamento explícito de codificação, tipos e formatos.
- [x] Implementar validações de entrada para arquivos ausentes, colunas obrigatórias, valores inválidos e chaves duplicadas.
- [x] Limpar e normalizar os dados sem perder os identificadores necessários para os cruzamentos.
- [x] Agregar os resultados do 1º e do 2º turno por município, usando as chaves eleitorais definidas.
- [x] Calcular aptos, válidos, votos nominais, demais candidatos, brancos, nulos e abstenções de acordo com os dados disponíveis e o contrato.
- [x] Identificar municípios em que o vencedor mudou entre os turnos e gerar a lista de viradas com os campos definidos no contrato.
- [x] Identificar seções do 2º turno com `DH_GERACAO` posterior às 17:00:00 e agregar totais de seções e votos por município, estado e Brasil.
- [x] Gerar `public/data/summary.json` com totais nacionais e lista de UFs; os arquivos atuais usam dados sintéticos identificados como demo.
- [x] Gerar `public/data/states/{UF}.json` para cada UF, contendo totais, viradas e dados municipais de acordo com o esquema canônico; os arquivos atuais usam dados sintéticos identificados como demo.
- [x] Garantir serialização JSON válida, codificação UTF-8, identificadores consistentes e valores numéricos nos campos quantitativos.
- [x] Exibir logs informativos sobre etapas, arquivos processados, contagens, validações e erros; falhas de processamento devem retornar erro explícito.
- [x] Tornar a execução reproduzível, documentando o comando e evitando depender de estado manual não registrado.

**Critérios de aceite da Fase 3**

- [x] O ETL executa do início ao fim a partir das instruções documentadas e produz `summary.json` e arquivos estaduais particionados no modo demo.
- [x] Todos os JSONs são parseáveis e passam por validação automatizada do esquema canônico.
- [x] Totais nacionais e estaduais reconciliam-se com as agregações de origem segundo as regras documentadas.
- [x] Cruzamento entre turnos, identificação de viradas e regra de pós-17h passam por verificações com casos conhecidos ou dados de teste controlados.
- [x] O processo informa erros de entrada ou processamento sem produzir saídas aparentando sucesso quando os dados estão inválidos.
- [x] Os arquivos gerados estão em `public/data/` e os dados brutos permanecem fora do controle de versão.

## Fase 4 — Testes e congelamento do contrato de dados

- [x] Criar testes automatizados para parsing, limpeza, cruzamento entre turnos, totais, viradas e classificação pós-17h.
- [x] Criar dados de teste pequenos e controlados para cobrir valores ausentes, duplicidades, limites de horário e municípios sem virada.
- [x] Validar `summary.json` e arquivos estaduais contra o contrato, incluindo tipos, campos obrigatórios e códigos de UF.
- [x] Confirmar coerência entre nomes/formatos produzidos pelo ETL e as interfaces TypeScript previstas em `src/types/tse.ts`.
- [x] Registrar no contrato ou na documentação qualquer decisão necessária para resolver inconsistências entre exemplos de esquema.

**Critérios de aceite da Fase 4**

- [x] Os testes do ETL passam e exercitam os casos de fronteira relevantes.
- [x] Os artefatos produzidos são compatíveis com os tipos e formatos que o frontend consumirá, sem adaptações silenciosas ou campos ambíguos.
- [x] O contrato de dados está suficientemente estável para iniciar a implementação do frontend.

## Fase 5 — Configuração do frontend React PWA

- [x] Criar o aplicativo React com Vite e TypeScript na raiz, respeitando a estrutura documentada.
- [x] Configurar TailwindCSS, Lucide-React, Recharts e o plugin/recursos necessários para PWA.
- [x] Configurar scripts de desenvolvimento, build e preview no `package.json`.
- [x] Adicionar scripts e configuração de lint e testes automatizados do frontend.
- [x] Criar `src/types/tse.ts` de acordo com o contrato de dados congelado e os campos atualmente emitidos pelo ETL.
- [x] Criar `src/data/ufs.ts` com metadados de estados, regiões e códigos TSE necessários à interface.
- [x] Criar dados sintéticos representativos do contrato para demonstração e testes da UI, identificados como demo e sem confundi-los com dados oficiais.
- [x] Configurar `src/main.tsx`, `src/App.tsx` e `src/index.css`, incluindo estilos globais e diretivas do TailwindCSS.
- [x] Implementar a estrutura inicial mobile-first e validar o layout em 360px, 390px e 430px, sem rolagem horizontal e com controles de navegação acima de 48px.
- [x] Aplicar as cores do design system para candidatos, brancos/nulos, abstenção, pós-17h, fundo e superfícies.

**Critérios de aceite da Fase 5**

- [x] O frontend inicia localmente e compila com TypeScript sem erros.
- [x] Os tipos correspondem ao esquema JSON real e os mocks respeitam esses tipos.
- [x] O layout é utilizável em viewports de 360px a 430px e usa as cores definidas no design system.

## Fase 6 — Componentes e funcionalidades da aplicação

- [x] Implementar Header compacto e barra inferior fixa com as quatro áreas: Visão Geral, Abstenções & Nulos, Viradas e Análise Pós-17h.
- [x] Garantir alvos de toque de no mínimo 48px × 48px para botões, links e controles navegáveis.
- [x] Implementar componentes comuns, cards de métricas, estados vazios e mensagem explícita para JSON estadual indisponível.
- [x] Implementar estados de carregamento e mensagens amigáveis para operações assíncronas de dados.
- [x] Implementar Bottom Sheets para seleção de UF e município, com controles acessíveis e utilizáveis em telas pequenas.
- [x] Implementar `Overview.tsx` para comparação nacional/estadual/municipal dos dois turnos.
- [x] Implementar `Turnout.tsx` para análise de brancos, nulos e abstenções.
- [x] Implementar `Flips.tsx` para consulta de municípios com mudança de vencedor.
- [x] Implementar `Post17h.tsx` para análise de seções e votos apurados após as 17h.
- [x] Implementar gráficos Recharts com barras horizontais, tooltips utilizáveis por toque e apresentação compatível com telas estreitas.
- [x] Implementar formatadores de números e porcentagens, abreviando valores grandes (por exemplo, 1,5M e 250k).
- [x] Manter cálculos de domínio no ETL e cálculos de apresentação/percentuais em `src/utils/formatters.ts`; não duplicar cálculos de domínio em `analytics.ts`.
- [x] Testar navegação, filtros de estado/município e exibição de dados nas quatro áreas; a aplicação consome os JSONs sintéticos gerados pelo ETL de acordo com as interfaces tipadas.

**Critérios de aceite da Fase 6**

- [x] As quatro áreas estão acessíveis pela navegação inferior fixa e apresentam dados sintéticos do ETL e estados vazios previstos.
- [x] Todos os controles atendem ao mínimo de 48px × 48px e os Bottom Sheets permitem selecionar UF e município.
- [x] Gráficos e números são legíveis em telas de 360px a 430px, sem overflow horizontal que impeça a interpretação.
- [x] Verificar navegação, filtros, formatação, estados vazios e ausência de arquivo estadual nos fluxos principais.
- [x] Verificar carregamento assíncrono do resumo e dos dados estaduais sob demanda, incluindo falhas e novas tentativas.

## Fase 7 — Integração entre frontend e dados do ETL

- [x] Implementar em `src/hooks/useTseData.ts` o carregamento inicial HTTP de `summary.json`, com deduplicação de requisições simultâneas.
- [x] Implementar carregamento sob demanda de `states/{UF}.json` somente quando uma UF disponível no resumo for selecionada.
- [x] Implementar cache em memória por UF durante a sessão; o Service Worker fornece persistência offline dos estados já solicitados.
- [x] Tratar carregamento, falhas de rede, JSON inválido, UF inexistente e respostas sem dados sem apresentar resultados como se fossem válidos.
- [x] Ligar filtros e páginas aos artefatos JSON publicados em `public/data/`; não há importação de mocks no caminho de produção, e os arquivos demo mantêm identificação explícita como dados sintéticos.
- [x] Verificar que métricas, viradas e filtros municipais exibidos correspondem aos valores dos JSONs do ETL por testes de integração.

**Critérios de aceite da Fase 7**

- [x] A aplicação carrega o resumo nacional na inicialização e solicita dados estaduais somente quando necessários.
- [x] Dados válidos aparecem nas telas corretas, e falhas de leitura são comunicadas explicitamente.
- [x] Cache em memória e cache offline do Service Worker funcionam sem quebrar a seleção de UF ou a validação dos dados.
- [x] A interface de produção consome os artefatos publicados pelo ETL, não módulos de mocks.

## Fase 8 — PWA, acessibilidade e desempenho

- [x] Configurar o Web App Manifest com nome, ícones PNG de 192px e 512px, cores do design system e `display: standalone`.
- [x] Configurar o Service Worker para pré-cachear `summary.json` com revisão pelo conteúdo e armazenar sob demanda os estados acessados usando Network First, limite de 27 arquivos e retenção de 30 dias.
- [x] Validar o manifesto, os ícones, o registro do Service Worker e a configuração de modo standalone em navegador compatível.
- [x] Verificar navegação offline para recursos armazenados e comunicar claramente quando um estado não estiver disponível no cache.
- [x] Revisar acessibilidade de navegação por teclado, nomes acessíveis, contraste, foco e comportamento dos modais; botões navegáveis mantêm alvos mínimos de 48px.
- [x] Avaliar tamanho dos artefatos publicados e manter a partição por UF; os JSONs demo atuais totalizam 3.658 bytes. O chunk de gráficos Recharts fica em 519,44 kB (149,67 kB gzip) e mantém o aviso de limite do Vite para eventual otimização futura.
- [x] Verificar carregamento inicial e troca de estado em condição offline/emulação de rede.

**Critérios de aceite da Fase 8**

- [x] O manifesto é válido, contém ícones instaláveis e declara `display: standalone`.
- [x] O Service Worker aplica a estratégia documentada: resumo pré-cacheado com revisão do conteúdo e estados acessados em Network First, limitando a retenção offline a 30 dias.
- [x] Os fluxos principais permanecem utilizáveis offline dentro dos limites do cache e informam quando uma informação não está disponível.
- [x] A interface mantém acessibilidade básica e desempenho compatível com o uso mobile-first.

## Fase 9 — Verificação integrada e preparação para publicação

- [ ] Executar testes unitários e de integração do ETL e do frontend.
- [ ] Executar lint, verificação TypeScript e build de produção.
- [ ] Fazer teste ponta a ponta do fluxo: carregar resumo, selecionar UF, visualizar município, consultar viradas e consultar dados pós-17h.
- [ ] Validar consistência entre fontes, agregações do ETL, JSON publicado e valores apresentados na interface.
- [ ] Validar responsividade e alvos de toque em pelo menos 360px, 390px e 430px.
- [ ] Conferir mensagens de erro, estados de carregamento, estados vazios e funcionamento sem rede.
- [ ] Revisar o `README.md` e documentar comandos de geração de dados, testes e build.
- [ ] Confirmar que nenhum arquivo bruto, segredo, credencial ou artefato local desnecessário será publicado.

**Critérios de aceite da Fase 9**

- [ ] Testes, lint, verificação TypeScript e build de produção terminam sem falhas.
- [ ] O fluxo ponta a ponta apresenta valores coerentes e não depende de mocks.
- [ ] Os requisitos mobile, PWA, carregamento particionado e tratamento de falhas foram verificados.
- [ ] A versão e os dados destinados ao deploy estão identificados e prontos para publicação.

## Fase 10 — Deploy e validação em produção

- [ ] Escolher e configurar Vercel ou Netlify para hospedar a aplicação e os JSONs estáticos com CDN.
- [ ] Configurar build e publicação a partir de comandos documentados, sem incluir `etl/raw/` no artefato público.
- [ ] Publicar o frontend e `summary.json` e garantir que os arquivos estaduais estejam disponíveis nos caminhos esperados.
- [ ] Configurar cabeçalhos/cache para os recursos estáticos de forma compatível com atualização dos dados e do Service Worker.
- [ ] Validar a aplicação publicada em desktop e em dispositivo/emulação mobile, incluindo instalação PWA.
- [ ] Validar carregamento do resumo, seleção de UF, navegação entre as quatro áreas e funcionamento do cache após o deploy.
- [ ] Registrar URL, data da publicação, versão do código e identificação dos dados publicados.
- [ ] Documentar o procedimento de atualização dos dados e de nova publicação.

**Critérios de aceite da Fase 10**

- [ ] A URL pública responde por HTTPS e entrega o build de produção sem erros críticos.
- [ ] O resumo e os arquivos estaduais estão acessíveis via CDN e são carregados pela aplicação nos caminhos corretos.
- [ ] Os fluxos principais, o modo instalável e a estratégia de cache foram confirmados na versão publicada.
- [ ] A publicação não expõe arquivos brutos nem credenciais, e o procedimento de atualização está documentado.
