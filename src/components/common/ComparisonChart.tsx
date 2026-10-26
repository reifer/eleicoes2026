import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ComparisonDatum {
  label: string;
  first: number;
  second: number;
  color?: string;
}

interface ComparisonChartProps {
  title: string;
  description?: string;
  data: ComparisonDatum[];
  firstLabel?: string;
  secondLabel?: string;
  compact?: boolean;
}

const DEFAULT_COLORS = ['#E53E3E', '#3182CE', '#718096', '#DD6B20', '#805AD5'];

export function ComparisonChart({
  title,
  description,
  data,
  firstLabel = '1º turno',
  secondLabel = '2º turno',
  compact = false,
}: ComparisonChartProps) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="h-56 w-full" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickFormatter={(value: number) => compact ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : value.toLocaleString('pt-BR')}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={compact ? 82 : 94}
              tick={{ fill: '#334155', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [value.toLocaleString('pt-BR'), name]}
              contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0', fontSize: 12 }}
            />
            <Bar
              dataKey="first"
              name={firstLabel}
              radius={[0, 4, 4, 0]}
              barSize={compact ? 8 : 10}
            >
              {data.map((datum, index) => (
                <Cell
                  key={`${datum.label}-first`}
                  fill={datum.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Bar>
            <Bar
              dataKey="second"
              name={secondLabel}
              radius={[0, 4, 4, 0]}
              barSize={compact ? 8 : 10}
            >
              {data.map((datum, index) => (
                <Cell
                  key={`${datum.label}-second`}
                  fill={datum.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  fillOpacity={0.48}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600" aria-label="Legenda">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: data[0]?.color ?? DEFAULT_COLORS[0] }}
            aria-hidden="true"
          />
          {firstLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: data[0]?.color ?? DEFAULT_COLORS[0], opacity: 0.48 }}
            aria-hidden="true"
          />
          {secondLabel}
        </span>
      </div>
    </section>
  );
}
