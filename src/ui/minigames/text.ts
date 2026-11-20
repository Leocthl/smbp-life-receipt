import type { Lang } from '../../i18n';
import { enMini } from '../../i18n/en/mini';
import { zhMini } from '../../i18n/zh/mini';

const DICTS: Record<Lang, Record<string, string>> = { zh: zhMini, en: enMini };
const LOCALE: Record<Lang, string> = { zh: 'zh-HK', en: 'en-HK' };

export function fmtNum(lang: Lang, n: number): string {
  return n.toLocaleString(LOCALE[lang], { maximumFractionDigits: 2 });
}

/** Look up a mini-game string and fill {vars}. Missing keys show the key itself, never blank. */
export function miniText(lang: Lang, key: string, vars: Record<string, number> = {}): string {
  const raw = DICTS[lang][key] ?? zhMini[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? fmtNum(lang, vars[v]) : m));
}
