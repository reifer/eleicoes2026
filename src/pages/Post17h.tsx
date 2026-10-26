import { ComparisonChart } from '../components/common/ComparisonChart';
import { MetricCard } from '../components/common/MetricCard';
import type { MunicipalityPost17hData, NationalPost17hData } from '../types/tse';

type Post17hTotals = NationalPost17hData | MunicipalityPost17hData;

interface Post17hProps {
  totals: Post17hTotals;
  scopeLabel: string;
}

export function Post17h({ totals, scopeLabel }: Post17hProps) {
  const totalSections = 'secoes_total' in totals ? totals.secoes_total : totals.secoes_totais;
  const lula = 'votos_lula_pos_17h' in totals ? totals.votos_lula_pos_17h : totals.votos_lula;
  const bolsonaro = 'votos_bolsonaro_pos_17h' in totals ? totals.votos_bolsonaro_pos_17h : totals.votos_bolsonaro;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-post17h">Análise pós-17h · {scopeLabel}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Seções com geração após as 17h</h2>
        <p className="mt-2 text-sm text-slate-600">
          A classificação usa o horário de geração do BU como proxy, conforme as limitações descritas no projeto.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Seções pós-17h"
          value={totals.secoes_pos_17h}
          detail={`de ${totalSections.toLocaleString('pt-BR')} seções`}
          tone="post17h"
        />
        <MetricCard label="Votos Lula · pós-17h" value={lula} tone="lula" />
        <MetricCard label="Votos Bolsonaro · pós-17h" value={bolsonaro} tone="bolsonaro" />
        {'brancos_pos_17h' in totals && (
          <MetricCard
            label="Brancos + nulos · pós-17h"
            value={totals.brancos_pos_17h + totals.nulos_pos_17h}
            tone="neutral"
          />
        )}
      </div>
      <ComparisonChart
        title="Votos por candidato nas seções pós-17h"
        data={[
          { label: 'Lula', first: lula, second: 0, color: '#E53E3E' },
          { label: 'Bolsonaro', first: bolsonaro, second: 0, color: '#3182CE' },
        ]}
        firstLabel="Votos pós-17h"
        secondLabel="—"
        compact
      />
    </div>
  );
}
