import { createContext, useContext } from 'react';
import { translate, type Lang } from '../i18n';

export interface I18n { lang: Lang; t: (key: string, vars?: Record<string, string | number>) => string }

const Ctx = createContext<I18n>({ lang: 'zh', t: (k, v) => translate('zh', k, v) });
export const I18nProvider = Ctx.Provider;
export const useI18n = () => useContext(Ctx);
export const makeI18n = (lang: Lang): I18n => ({ lang, t: (k, v) => translate(lang, k, v) });
