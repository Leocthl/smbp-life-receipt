import { en } from './en';
import { zh } from './zh';

export type Lang = 'zh' | 'en';
export const LOCALES: Record<Lang, Record<string, string>> = { zh, en };

/** Look up a text key and fill {vars}. Missing keys show the key itself so gaps are visible, never blank. */
export function translate(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const raw = LOCALES[lang][key] ?? LOCALES.zh[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m));
}

export function has(lang: Lang, key: string): boolean {
  return Boolean(LOCALES[lang][key]);
}
