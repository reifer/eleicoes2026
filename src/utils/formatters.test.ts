import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatNumber, formatPercentage } from './formatters';

describe('number formatters', () => {
  it('formats numbers for Brazilian Portuguese', () => {
    expect(formatNumber(1500)).toBe('1.500');
    expect(formatCompactNumber(250)).toBe('250');
    expect(formatCompactNumber(1_500_000)).toMatch(/1,5/);
  });

  it('formats percentages and guards zero totals', () => {
    expect(formatPercentage(25, 100)).toBe('25%');
    expect(formatPercentage(1, 0)).toBe('0%');
  });
});
