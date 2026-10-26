import { useCallback, useMemo, useState } from 'react';
import { BottomSheet } from './components/common/BottomSheet';
import { DataError } from './components/common/DataError';
import { LoadingStatus } from './components/common/LoadingStatus';
import { BottomNavigation, type ViewId } from './components/layout/BottomNavigation';
import { CompactHeader } from './components/layout/CompactHeader';
import { UFS } from './data/ufs';
import { Flips } from './pages/Flips';
import { Overview } from './pages/Overview';
import { Post17h } from './pages/Post17h';
import { Turnout } from './pages/Turnout';
import { useTseData } from './hooks/useTseData';
import type { UfSigla, ViradaMunicipio } from './types/tse';

type SheetMode = 'state' | 'municipality' | null;

const VIEW_LABELS: Record<ViewId, string> = {
  overview: 'Visão geral',
  turnout: 'Abstenções, brancos e nulos',
  flips: 'Viradas municipais',
  post17h: 'Análise pós-17h',
};

function App() {
  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [selectedUf, setSelectedUf] = useState<UfSigla>();
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>();
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const {
    summary,
    summaryStatus,
    summaryError,
    retrySummary,
    selectedState,
    stateStatus,
    stateError,
    retryState,
  } = useTseData(selectedUf);

  const currentState = selectedState?.uf === selectedUf ? selectedState : undefined;
  const currentMunicipality = currentState?.municipios.find(
    (municipality) => municipality.cd_mun === selectedMunicipalityId,
  );
  const selectedUfSummary = summary?.ufs.find((uf) => uf.sigla === selectedUf);
  const scopeLabel = currentMunicipality?.nome ?? currentState?.nome_estado ?? 'Brasil';

  const availableStates = useMemo(
    () => (summary?.ufs ?? []).map((uf) => ({
      value: uf.sigla,
      label: uf.nome,
      detail: `${uf.sigla} · dados ${summary?.data_source === 'demo' ? 'de demonstração' : 'disponíveis'}`,
    })),
    [summary],
  );
  const municipalityOptions = useMemo(
    () => [
      { value: '', label: 'Todos os municípios', detail: currentState?.nome_estado },
      ...(currentState?.municipios ?? []).map((municipality) => ({
        value: municipality.cd_mun,
        label: municipality.nome,
        detail: `Código ${municipality.cd_mun}`,
      })),
    ],
    [currentState],
  );

  const closeSheet = useCallback(() => setSheetMode(null), []);

  const chooseState = (value: string) => {
    setSelectedUf(UFS.find((uf) => uf.sigla === value)?.sigla);
    setSelectedMunicipalityId(undefined);
    setSheetMode(null);
  };

  const chooseMunicipality = (value: string) => {
    setSelectedMunicipalityId(value || undefined);
    setSheetMode(null);
  };

  const turns = currentMunicipality
    ? { first: currentMunicipality.t1, second: currentMunicipality.t2 }
    : currentState
      ? { first: currentState.totais.t1, second: currentState.totais.t2 }
      : summary
        ? { first: summary.totais_brasil.t1, second: summary.totais_brasil.t2 }
        : undefined;
  const post17h = currentMunicipality
    ? currentMunicipality.pos_17h
    : currentState
      ? currentState.pos_17h
      : summary?.pos_17h_brasil;

  const allFlips: ViradaMunicipio[] = currentState?.viradas_municipios ?? [];
  const visibleFlips = currentMunicipality
    ? allFlips.filter((flip) => flip.cd_municipio === currentMunicipality.cd_mun)
    : allFlips;

  const content = (() => {
    if (summaryStatus === 'error') {
      return (
        <DataError
          title="Não foi possível carregar os dados"
          message={summaryError ?? 'Falha ao carregar o resumo nacional.'}
          actionLabel="Tentar novamente"
          onAction={retrySummary}
        />
      );
    }
    if (summaryStatus === 'loading' || !summary) {
      return <LoadingStatus label="Carregando resumo nacional…" />;
    }
    if (selectedUf && stateStatus === 'error') {
      return (
        <DataError
          title={`Não foi possível carregar ${selectedUf}`}
          message={stateError ?? `O arquivo de dados do estado ${selectedUf} não está disponível.`}
          actionLabel="Tentar novamente"
          onAction={retryState}
        />
      );
    }
    if (selectedUf && (stateStatus !== 'success' || !currentState)) {
      return <LoadingStatus label={`Carregando dados de ${selectedUf}…`} />;
    }
    if (selectedUf && !currentState) {
      return (
        <DataError
          title="Dados do estado indisponíveis"
          message={`Não foi possível encontrar um arquivo estadual válido para ${selectedUf}.`}
          actionLabel="Tentar novamente"
          onAction={retryState}
        />
      );
    }
    if (!turns || !post17h) {
      return (
        <DataError
          title="Dados incompletos"
          message="O resumo não contém as métricas necessárias para exibir esta análise."
        />
      );
    }
    switch (activeView) {
      case 'overview':
        return <Overview first={turns.first} second={turns.second} scopeLabel={scopeLabel} />;
      case 'turnout':
        return <Turnout first={turns.first} second={turns.second} scopeLabel={scopeLabel} />;
      case 'flips':
        return <Flips flips={visibleFlips} scopeLabel={scopeLabel} />;
      case 'post17h':
        return <Post17h totals={post17h} scopeLabel={scopeLabel} />;
    }
  })();

  return (
    <div className="min-h-screen bg-app text-slate-900">
      <CompactHeader
        state={selectedUfSummary}
        municipality={currentMunicipality?.nome}
        dataSource={summary?.data_source ?? 'demo'}
        canSelectMunicipality={stateStatus === 'success' && Boolean(currentState)}
        onSelectState={() => setSheetMode('state')}
        onSelectMunicipality={() => setSheetMode('municipality')}
      />

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-500">{VIEW_LABELS[activeView]}</span>
          {summary?.data_source === 'demo' && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              Dados sintéticos
            </span>
          )}
        </div>
        {content}
      </main>

      <BottomNavigation activeView={activeView} onChange={setActiveView} />

      <BottomSheet
        open={sheetMode === 'state' && Boolean(summary)}
        title="Selecionar estado"
        description="Estados disponíveis nos dados carregados."
        options={[{ value: '', label: 'Brasil', detail: 'Totais nacionais' }, ...availableStates]}
        selectedValue={selectedUf ?? ''}
        onSelect={chooseState}
        onClose={closeSheet}
      />
      <BottomSheet
        open={sheetMode === 'municipality' && stateStatus === 'success' && Boolean(currentState)}
        title="Selecionar município"
        description="Filtre as métricas para um município ou mantenha o estado completo."
        options={municipalityOptions}
        selectedValue={selectedMunicipalityId ?? ''}
        onSelect={chooseMunicipality}
        onClose={closeSheet}
      />
    </div>
  );
}

export default App;
