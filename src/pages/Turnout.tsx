import { ComparisonChart } from '../components/common/ComparisonChart';
import { MetricCard } from '../components/common/MetricCard';
import type { TurnoData } from '../types/tse';
import { formatPercentage } from '../utils/formatters';

interface TurnoutProps {
  first: TurnoData;
  second: TurnoData;
  scopeLabel: string;
}

export function Turnout({ first, second, scopeLabel }: TurnoutProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-orange-800">Abstenções, brancos e nulos · {scopeLabel}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Comparecimento e votos não válidos</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Abstenções · T2"
          value={second.abstencao}
          detail={formatPercentage(second.abstencao, second.aptos)}
          tone="abstencao"
        />
        <MetricCard
          label="Brancos + nulos · T2"
          value={second.brancos + second.nulos}
          detail={`${second.brancos.toLocaleString('pt-BR')} brancos · ${second.nulos.toLocaleString('pt-BR')} nulos`}
          tone="neutral"
        />
      </div>
      <ComparisonChart
        title="Votos brancos, nulos e abstenções"
        description="Comparação dos totais entre o 1º e o 2º turno."
        data={[
          { label: 'Brancos', first: first.brancos, second: second.brancos, color: '#718096' },
          { label: 'Nulos', first: first.nulos, second: second.nulos, color: '#94A3B8' },
          { label: 'Abstenções', first: first.abstencao, second: second.abstencao, color: '#DD6B20' },
        ]}
        compact
      />
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Aptos · T2" value={second.aptos} tone="neutral" />
        <MetricCard label="Compareceram · T2" value={second.aptos - second.abstencao} tone="neutral" />
      </div>
    </div>
  );
}
