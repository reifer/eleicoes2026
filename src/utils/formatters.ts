export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) {
    return '0%';
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    (value / total) * 100,
  )}%`;
}
