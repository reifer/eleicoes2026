import { MapPin, SlidersHorizontal } from 'lucide-react';
import type { UfSummary } from '../../types/tse';

interface CompactHeaderProps {
  state?: UfSummary;
  municipality?: string;
  dataSource?: 'demo' | 'tse';
  canSelectMunicipality: boolean;
  onSelectState: () => void;
  onSelectMunicipality: () => void;
}

export function CompactHeader({
  state,
  municipality,
  dataSource,
  canSelectMunicipality,
  onSelectState,
  onSelectMunicipality,
}: CompactHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Análise Eleitoral 2026
          </p>
          <h1 className="truncate text-base font-bold text-slate-900">
            {state ? state.nome : 'Brasil'}
            {municipality ? ` · ${municipality}` : ''}
          </h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onSelectState}
            className="inline-flex min-h-12 min-w-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-post17h"
            aria-label="Selecionar estado"
          >
            <MapPin size={16} aria-hidden="true" />
            <span>{state?.sigla ?? 'BR'}</span>
          </button>
          {state && canSelectMunicipality && (
            <button
              type="button"
              onClick={onSelectMunicipality}
              className="inline-flex min-h-12 min-w-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-post17h"
              aria-label="Selecionar município"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Município</span>
            </button>
          )}
        </div>
      </div>
      {dataSource === 'demo' && (
        <p className="mx-auto mt-2 max-w-5xl text-xs font-medium text-amber-800">
          Demonstração com dados sintéticos; não são resultados oficiais.
        </p>
      )}
    </header>
  );
}
