import { ComparisonChart } from '../components/common/ComparisonChart';
import { MetricCard } from '../components/common/MetricCard';
import type { TurnoData } from '../types/tse';
import { formatPercentage } from '../utils/formatters';

interface OverviewProps {
  first: TurnoData;
  second: TurnoData;
  scopeLabel: string;
}

export function Overview({ first, second, scopeLabel }: OverviewProps) {
  const totalValid = second.validos;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-post17h">Visão geral · {scopeLabel}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Comparativo entre turnos</h2>
        <p className="mt-2 text-sm text-slate-600">Valores do conjunto de demonstração sintético.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Lula · 2º turno" value={second.lula} detail={formatPercentage(second.lula, totalValid)} tone="lula" />
        <MetricCard label="Bolsonaro · 2º turno" value={second.bolsonaro} detail={formatPercentage(second.bolsonaro, totalValid)} tone="bolsonaro" />
      </div>

      <ComparisonChart
        title="Votos válidos por candidato"
        description="Comparação dos votos registrados em cada turno."
        data={[
          { label: 'Lula', first: first.lula, second: second.lula, color: '#E53E3E' },
          { label: 'Bolsonaro', first: first.bolsonaro, second: second.bolsonaro, color: '#3182CE' },
          { label: 'Demais', first: first.demais, second: second.demais, color: '#718096' },
        ]}
        compact
      />

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Votos válidos · T1" value={first.validos} tone="neutral" />
        <MetricCard label="Votos válidos · T2" value={second.validos} tone="neutral" />
      </div>
    </div>
  );
}
