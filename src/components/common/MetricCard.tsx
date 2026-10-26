import { formatCompactNumber } from '../../utils/formatters';

interface MetricCardProps {
  label: string;
  value: number;
  detail?: string;
  tone: 'lula' | 'bolsonaro' | 'neutral' | 'abstencao' | 'post17h';
}

const toneClasses: Record<MetricCardProps['tone'], string> = {
  lula: 'border-lula/30 bg-red-50 text-lula',
  bolsonaro: 'border-bolsonaro/30 bg-blue-50 text-bolsonaro',
  neutral: 'border-neutraldata/30 bg-slate-100 text-neutraldata',
  abstencao: 'border-abstencao/30 bg-orange-50 text-abstencao',
  post17h: 'border-post17h/30 bg-purple-50 text-post17h',
};

export function MetricCard({ label, value, detail, tone }: MetricCardProps) {
  return (
    <article className={`min-w-0 rounded-xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p
        className="mt-2 break-words text-2xl font-bold text-slate-900"
        aria-label={value.toLocaleString('pt-BR')}
        title={value.toLocaleString('pt-BR')}
      >
        {formatCompactNumber(value)}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </article>
  );
}
