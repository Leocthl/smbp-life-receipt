import type { Lang } from '../i18n';

/** HK$ with thousands separators; compact (萬 / k / M) when large. */
export function money(n: number, lang: Lang, compact = false): string {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(Math.round(n));
  if (compact && a >= 1_000_000) {
    return lang === 'zh' ? `${sign}$${(a / 10_000).toFixed(0)}萬` : `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  }
  if (compact && a >= 100_000) {
    return lang === 'zh' ? `${sign}$${(a / 10_000).toFixed(1)}萬` : `${sign}$${Math.round(a / 1000)}k`;
  }
  return `${sign}$${a.toLocaleString('en-US')}`;
}

export function signed(n: number, lang: Lang): string {
  return `${n > 0 ? '+' : ''}${money(n, lang, true)}`;
}

export function ageLabel(age: number): string {
  return Number.isInteger(age) ? String(age) : String(Math.floor(age));
}
