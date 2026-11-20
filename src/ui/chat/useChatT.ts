import { useCallback } from 'react';
import { enMascot } from '../../i18n/en/mascot';
import { zhMascot } from '../../i18n/zh/mascot';
import { useI18n, type I18n } from '../i18nContext';

const OWN: Record<'zh' | 'en', Record<string, string>> = { zh: zhMascot, en: enMascot };

/** t() that also knows the mascot strings, so the chat works whether or not the lead has merged them into the main dictionary. */
export function useChatT(): I18n {
  const { t, lang } = useI18n();
  const mt = useCallback<I18n['t']>((key, vars = {}) => {
    const own = OWN[lang][key];
    if (own === undefined) return t(key, vars);
    return own.replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m));
  }, [t, lang]);
  return { lang, t: mt };
}
