export type DataSource = 'tse' | 'demo';

export type UfSigla =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MT'
  | 'MS'
  | 'MG'
  | 'PA'
  | 'PB'
  | 'PR'
  | 'PE'
  | 'PI'
  | 'RJ'
  | 'RN'
  | 'RS'
  | 'RO'
  | 'RR'
  | 'SC'
  | 'SP'
  | 'SE'
  | 'TO';

export interface TurnoData {
  aptos: number;
  validos: number;
  lula: number;
  bolsonaro: number;
  demais: number;
  brancos: number;
  nulos: number;
  abstencao: number;
}

export interface NationalPost17hData {
  secoes_total: number;
  secoes_pos_17h: number;
  votos_lula_pos_17h: number;
  votos_bolsonaro_pos_17h: number;
  brancos_pos_17h: number;
  nulos_pos_17h: number;
}

export type StatePost17hData = NationalPost17hData;

export interface MunicipalityPost17hData {
  secoes_totais: number;
  secoes_pos_17h: number;
  votos_lula: number;
  votos_bolsonaro: number;
}

export interface UfSummary {
  sigla: UfSigla;
  nome: string;
}

export interface SummaryData {
  updated_at: string;
  totais_brasil: {
    t1: TurnoData;
    t2: TurnoData;
  };
  pos_17h_brasil: NationalPost17hData;
  ufs: UfSummary[];
  data_source: DataSource;
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
  pos_17h: MunicipalityPost17hData;
}

export interface StateData {
  uf: UfSigla;
  nome_estado: string;
  total_municipios: number;
  totais: {
    t1: TurnoData;
    t2: TurnoData;
  };
  pos_17h: StatePost17hData;
  viradas_municipios: ViradaMunicipio[];
  municipios: Municipio[];
  data_source: DataSource;
}
