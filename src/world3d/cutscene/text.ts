import { translate, type Lang } from '../../i18n';
import { enCutscene } from '../../i18n/en/cutscene';
import { zhCutscene } from '../../i18n/zh/cutscene';

// shortcut: reads this area's own tables first, because the lead merges them into the app's locale later.
export function ct(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const raw = (lang === 'zh' ? zhCutscene : enCutscene)[key];
  if (raw === undefined) return translate(lang, key, vars);
  return raw.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m));
}
