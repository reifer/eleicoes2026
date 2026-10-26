import type { UfSigla } from '../types/tse';

export type RegiaoBrasileira =
  | 'Centro-Oeste'
  | 'Nordeste'
  | 'Norte'
  | 'Sudeste'
  | 'Sul';

export interface UfMetadata {
  sigla: UfSigla;
  nome: string;
  codigoTse: number;
  regiao: RegiaoBrasileira;
}

export const UFS: readonly UfMetadata[] = [
  { sigla: 'AC', nome: 'Acre', codigoTse: 12, regiao: 'Norte' },
  { sigla: 'AL', nome: 'Alagoas', codigoTse: 27, regiao: 'Nordeste' },
  { sigla: 'AP', nome: 'Amapá', codigoTse: 16, regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', codigoTse: 13, regiao: 'Norte' },
  { sigla: 'BA', nome: 'Bahia', codigoTse: 29, regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', codigoTse: 23, regiao: 'Nordeste' },
  { sigla: 'DF', nome: 'Distrito Federal', codigoTse: 53, regiao: 'Centro-Oeste' },
  { sigla: 'ES', nome: 'Espírito Santo', codigoTse: 32, regiao: 'Sudeste' },
  { sigla: 'GO', nome: 'Goiás', codigoTse: 52, regiao: 'Centro-Oeste' },
  { sigla: 'MA', nome: 'Maranhão', codigoTse: 21, regiao: 'Nordeste' },
  { sigla: 'MT', nome: 'Mato Grosso', codigoTse: 51, regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', codigoTse: 50, regiao: 'Centro-Oeste' },
  { sigla: 'MG', nome: 'Minas Gerais', codigoTse: 31, regiao: 'Sudeste' },
  { sigla: 'PA', nome: 'Pará', codigoTse: 15, regiao: 'Norte' },
  { sigla: 'PB', nome: 'Paraíba', codigoTse: 25, regiao: 'Nordeste' },
  { sigla: 'PR', nome: 'Paraná', codigoTse: 41, regiao: 'Sul' },
  { sigla: 'PE', nome: 'Pernambuco', codigoTse: 26, regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', codigoTse: 22, regiao: 'Nordeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', codigoTse: 33, regiao: 'Sudeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', codigoTse: 24, regiao: 'Nordeste' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', codigoTse: 43, regiao: 'Sul' },
  { sigla: 'RO', nome: 'Rondônia', codigoTse: 11, regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', codigoTse: 14, regiao: 'Norte' },
  { sigla: 'SC', nome: 'Santa Catarina', codigoTse: 42, regiao: 'Sul' },
  { sigla: 'SP', nome: 'São Paulo', codigoTse: 35, regiao: 'Sudeste' },
  { sigla: 'SE', nome: 'Sergipe', codigoTse: 28, regiao: 'Nordeste' },
  { sigla: 'TO', nome: 'Tocantins', codigoTse: 17, regiao: 'Norte' },
];

export const UF_BY_SIGLA: ReadonlyMap<UfSigla, UfMetadata> = new Map(
  UFS.map((uf) => [uf.sigla, uf]),
);
