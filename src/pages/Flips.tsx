import { ArrowLeftRight } from 'lucide-react';
import type { ViradaMunicipio } from '../types/tse';

interface FlipsProps {
  flips: ViradaMunicipio[];
  scopeLabel: string;
}

export function Flips({ flips, scopeLabel }: FlipsProps) {
  const requiresStateSelection = scopeLabel === 'Brasil';
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-post17h">Viradas municipais · {scopeLabel}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Mudança de vencedor</h2>
        <p className="mt-2 text-sm text-slate-600">
          Municípios em que o candidato mais votado no 1º turno difere do vencedor do 2º.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {flips.length} {flips.length === 1 ? 'virada encontrada' : 'viradas encontradas'} nos dados selecionados.
      </div>
      {flips.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-semibold text-slate-800">
            {requiresStateSelection
              ? 'Selecione um estado para consultar as viradas municipais.'
              : 'Nenhuma virada nos dados selecionados.'}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {requiresStateSelection
              ? 'Os arquivos estaduais são carregados sob demanda.'
              : 'Confira outro recorte ou estado.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {flips.map((flip) => (
            <li key={flip.cd_municipio}>
              <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{flip.nome_municipio}</h3>
                    <p className="mt-1 text-xs text-slate-500">Código TSE {flip.cd_municipio}</p>
                  </div>
                  <span className="rounded-full bg-purple-50 p-2 text-post17h">
                    <ArrowLeftRight size={18} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-center font-semibold text-slate-700">
                    T1 · {flip.t1_vencedor}
                  </span>
                  <ArrowLeftRight size={16} className="text-slate-400" aria-hidden="true" />
                  <span className="rounded-lg bg-purple-50 px-3 py-2 text-center font-semibold text-post17h">
                    T2 · {flip.t2_vencedor}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Diferença no 2º turno: <strong>{flip.diferenca_votos.toLocaleString('pt-BR')} votos</strong>
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
