import { useCallback, useEffect, useState } from 'react';
import { UF_BY_SIGLA } from '../data/ufs';
import type {
  DataSource,
  Municipio,
  NationalPost17hData,
  StateData,
  SummaryData,
  TurnoData,
  UfSigla,
  UfSummary,
  ViradaMunicipio,
} from '../types/tse';

const UF_SIGLAS = new Set<string>(UF_BY_SIGLA.keys());
const inFlightJsonRequests = new Map<string, Promise<unknown>>();

type RequestStatus = 'loading' | 'success' | 'error';
type StateRequestStatus = 'idle' | RequestStatus;

interface StateRequest {
  uf: UfSigla;
  status: 'loading' | 'error';
  error?: string;
}

interface UseTseDataResult {
  summary?: SummaryData;
  summaryStatus: RequestStatus;
  summaryError?: string;
  retrySummary: () => void;
  selectedState?: StateData;
  stateStatus: StateRequestStatus;
  stateError?: string;
  retryState: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isDataSource(value: unknown): value is DataSource {
  return value === 'tse' || value === 'demo';
}

function isTurnoData(value: unknown): value is TurnoData {
  return isRecord(value)
    && ['aptos', 'validos', 'lula', 'bolsonaro', 'demais', 'brancos', 'nulos', 'abstencao']
      .every((key) => isNonNegativeNumber(value[key]));
}

function isNationalPost17hData(value: unknown): value is NationalPost17hData {
  return isRecord(value)
    && [
      'secoes_total',
      'secoes_pos_17h',
      'votos_lula_pos_17h',
      'votos_bolsonaro_pos_17h',
      'brancos_pos_17h',
      'nulos_pos_17h',
    ].every((key) => isNonNegativeNumber(value[key]));
}

function isUfSummary(value: unknown): value is UfSummary {
  return isRecord(value)
    && typeof value.sigla === 'string'
    && UF_SIGLAS.has(value.sigla)
    && typeof value.nome === 'string'
    && value.nome.length > 0;
}

function isViradaMunicipio(value: unknown): value is ViradaMunicipio {
  return isRecord(value)
    && typeof value.cd_municipio === 'string'
    && typeof value.nome_municipio === 'string'
    && (value.t1_vencedor === 'LULA' || value.t1_vencedor === 'BOLSONARO')
    && (value.t2_vencedor === 'LULA' || value.t2_vencedor === 'BOLSONARO')
    && isNonNegativeNumber(value.diferenca_votos);
}

function isMunicipio(value: unknown): value is Municipio {
  return isRecord(value)
    && typeof value.cd_mun === 'string'
    && typeof value.nome === 'string'
    && typeof value.flipped === 'boolean'
    && isTurnoData(value.t1)
    && isTurnoData(value.t2)
    && isRecord(value.pos_17h)
    && isNonNegativeNumber(value.pos_17h.secoes_totais)
    && isNonNegativeNumber(value.pos_17h.secoes_pos_17h)
    && isNonNegativeNumber(value.pos_17h.votos_lula)
    && isNonNegativeNumber(value.pos_17h.votos_bolsonaro);
}

function isSummaryData(value: unknown): value is SummaryData {
  if (!isRecord(value)) return false;
  return typeof value.updated_at === 'string'
    && isRecord(value.totais_brasil)
    && isTurnoData(value.totais_brasil.t1)
    && value.totais_brasil.t1.aptos > 0
    && isTurnoData(value.totais_brasil.t2)
    && value.totais_brasil.t2.aptos > 0
    && isNationalPost17hData(value.pos_17h_brasil)
    && Array.isArray(value.ufs)
    && value.ufs.length > 0
    && value.ufs.every(isUfSummary)
    && isDataSource(value.data_source);
}

function isStateData(value: unknown, expectedUf: UfSigla): value is StateData {
  if (!isRecord(value)) return false;
  return value.uf === expectedUf
    && typeof value.nome_estado === 'string'
    && Number.isInteger(value.total_municipios)
    && isNonNegativeNumber(value.total_municipios)
    && value.total_municipios > 0
    && isRecord(value.totais)
    && isTurnoData(value.totais.t1)
    && value.totais.t1.aptos > 0
    && isTurnoData(value.totais.t2)
    && value.totais.t2.aptos > 0
    && isNationalPost17hData(value.pos_17h)
    && Array.isArray(value.viradas_municipios)
    && value.viradas_municipios.every(isViradaMunicipio)
    && Array.isArray(value.municipios)
    && value.municipios.length === value.total_municipios
    && value.municipios.every(isMunicipio)
    && isDataSource(value.data_source);
}

async function fetchJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Você está offline e não há uma cópia deste arquivo disponível no cache.', { cause: error });
    }
    throw new Error('Não foi possível conectar ao servidor de dados. Verifique sua conexão e tente novamente.', { cause: error });
  }
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('O arquivo de dados solicitado não foi encontrado. Gere novamente os dados de demonstração ou confira a publicação.');
    }
    throw new Error(`Falha ao carregar os dados (HTTP ${response.status}). Tente novamente.`);
  }
  try {
    return await response.json() as unknown;
  } catch (error) {
    throw new Error('O servidor retornou um JSON inválido. Gere novamente os arquivos de dados.', { cause: error });
  }
}

function requestJson(url: string): Promise<unknown> {
  const existingRequest = inFlightJsonRequests.get(url);
  if (existingRequest) return existingRequest;

  const request = fetchJson(url).finally(() => {
    if (inFlightJsonRequests.get(url) === request) inFlightJsonRequests.delete(url);
  });
  inFlightJsonRequests.set(url, request);
  return request;
}

function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function useTseData(selectedUf?: UfSigla): UseTseDataResult {
  const [summary, setSummary] = useState<SummaryData>();
  const [summaryStatus, setSummaryStatus] = useState<RequestStatus>('loading');
  const [summaryError, setSummaryError] = useState<string>();
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [stateCache, setStateCache] = useState(() => new Map<UfSigla, StateData>());
  const [stateRequest, setStateRequest] = useState<StateRequest>();
  const [stateRetry, setStateRetry] = useState(0);

  useEffect(() => {
    let isActive = true;

    requestJson(dataUrl('data/summary.json'))
      .then((data) => {
        if (!isSummaryData(data)) {
          throw new Error('O resumo recebido não corresponde ao contrato de dados esperado.');
        }
        return data;
      })
      .then((data) => {
        if (!isActive) return;
        setSummary(data);
        setSummaryStatus('success');
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setSummaryError(error instanceof Error ? error.message : 'Falha inesperada ao carregar o resumo.');
        setSummaryStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [summaryRetry]);

  useEffect(() => {
    if (!selectedUf || summaryStatus !== 'success') {
      return undefined;
    }

    if (stateCache.has(selectedUf) || !summary?.ufs.some((uf) => uf.sigla === selectedUf)) return undefined;

    let isActive = true;

    requestJson(dataUrl(`data/states/${selectedUf}.json`))
      .then((data) => {
        if (!isStateData(data, selectedUf)) {
          throw new Error(`O arquivo estadual de ${selectedUf} não corresponde ao contrato de dados.`);
        }
        return data;
      })
      .then((data) => {
        if (!isActive) return;
        setStateCache((cache) => new Map(cache).set(selectedUf, data));
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setStateRequest({
          uf: selectedUf,
          status: 'error',
          error: error instanceof Error ? error.message : `Falha inesperada ao carregar ${selectedUf}.`,
        });
      });

    return () => {
      isActive = false;
    };
  }, [selectedUf, stateRetry, stateCache, summary, summaryStatus]);

  const retrySummary = useCallback(() => {
    setSummaryError(undefined);
    setSummaryStatus('loading');
    setSummaryRetry((retry) => retry + 1);
  }, []);
  const retryState = useCallback(() => {
    if (!selectedUf) return;
    setStateRequest({ uf: selectedUf, status: 'loading' });
    setStateRetry((retry) => retry + 1);
  }, [selectedUf]);

  const selectedState = selectedUf ? stateCache.get(selectedUf) : undefined;
  const hasSelectedUf = summary?.ufs.some((uf) => uf.sigla === selectedUf) ?? false;
  const currentRequest = stateRequest?.uf === selectedUf ? stateRequest : undefined;
  const stateStatus: StateRequestStatus = !selectedUf || summaryStatus !== 'success'
    ? 'idle'
    : !hasSelectedUf
      ? 'error'
      : selectedState
        ? 'success'
        : currentRequest?.status === 'error'
          ? 'error'
          : 'loading';
  const stateError = !hasSelectedUf && selectedUf
    ? `A UF ${selectedUf} não está disponível no resumo carregado.`
    : currentRequest?.error;

  return {
    summary,
    summaryStatus,
    summaryError,
    retrySummary,
    selectedState,
    stateStatus,
    stateError,
    retryState,
  };
}
