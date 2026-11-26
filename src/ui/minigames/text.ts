import type { Lang } from '../../i18n';
import { enMini } from '../../i18n/en/mini';
import { enPolish } from '../../i18n/en/polish';
import { zhMini } from '../../i18n/zh/mini';
import { zhPolish } from '../../i18n/zh/polish';

// the polish files hold the mini-game keys the first dictionaries missed (the hold overlay, the end stamp)
const ZH = { ...zhMini, ...zhPolish };
const DICTS: Record<Lang, Record<string, string>> = { zh: ZH, en: { ...enMini, ...enPolish } };
const LOCALE: Record<Lang, string> = { zh: 'zh-HK', en: 'en-HK' };

export function fmtNum(lang: Lang, n: number): string {
  return n.toLocaleString(LOCALE[lang], { maximumFractionDigits: 2 });
}

/** Look up a mini-game string and fill {vars}. Missing keys show the key itself, never blank. */
export function miniText(lang: Lang, key: string, vars: Record<string, number> = {}): string {
  const raw = DICTS[lang][key] ?? ZH[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? fmtNum(lang, vars[v]) : m));
}
