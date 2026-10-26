import type { StateData, SummaryData } from '../types/tse';

export const mockSummary = {
  updated_at: '2026-10-26T17:22:01Z',
  totais_brasil: {
    t1: {
      aptos: 700,
      validos: 315,
      lula: 150,
      bolsonaro: 150,
      demais: 15,
      brancos: 4,
      nulos: 6,
      abstencao: 150,
    },
    t2: {
      aptos: 700,
      validos: 300,
      lula: 205,
      bolsonaro: 95,
      demais: 0,
      brancos: 3,
      nulos: 3,
      abstencao: 130,
    },
  },
  pos_17h_brasil: {
    secoes_total: 3,
    secoes_pos_17h: 1,
    votos_lula_pos_17h: 70,
    votos_bolsonaro_pos_17h: 30,
    brancos_pos_17h: 1,
    nulos_pos_17h: 1,
  },
  ufs: [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'SP', nome: 'São Paulo' },
  ],
  data_source: 'demo',
} satisfies SummaryData;

export const mockAcreState = {
  uf: 'AC',
  nome_estado: 'Acre',
  total_municipios: 1,
  totais: {
    t1: {
      aptos: 500,
      validos: 215,
      lula: 70,
      bolsonaro: 130,
      demais: 15,
      brancos: 3,
      nulos: 5,
      abstencao: 100,
    },
    t2: {
      aptos: 500,
      validos: 200,
      lula: 120,
      bolsonaro: 80,
      demais: 0,
      brancos: 2,
      nulos: 2,
      abstencao: 90,
    },
  },
  pos_17h: {
    secoes_total: 2,
    secoes_pos_17h: 1,
    votos_lula_pos_17h: 70,
    votos_bolsonaro_pos_17h: 30,
    brancos_pos_17h: 1,
    nulos_pos_17h: 1,
  },
  viradas_municipios: [
    {
      cd_municipio: '00001',
      nome_municipio: 'MUNICÍPIO DEMO A',
      t1_vencedor: 'BOLSONARO',
      t2_vencedor: 'LULA',
      diferenca_votos: 40,
    },
  ],
  municipios: [
    {
      cd_mun: '00001',
      nome: 'MUNICÍPIO DEMO A',
      flipped: true,
      t1: {
        aptos: 500,
        validos: 215,
        lula: 70,
        bolsonaro: 130,
        demais: 15,
        brancos: 3,
        nulos: 5,
        abstencao: 100,
      },
      t2: {
        aptos: 500,
        validos: 200,
        lula: 120,
        bolsonaro: 80,
        demais: 0,
        brancos: 2,
        nulos: 2,
        abstencao: 90,
      },
      pos_17h: {
        secoes_totais: 2,
        secoes_pos_17h: 1,
        votos_lula: 70,
        votos_bolsonaro: 30,
      },
    },
  ],
  data_source: 'demo',
} satisfies StateData;
