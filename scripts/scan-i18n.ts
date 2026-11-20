// Flags strings that mix languages on one screen (zh with English words, en with Chinese characters).
import { zh } from '../src/i18n/zh';
import { en } from '../src/i18n/en';
const OK = /^(MPF|GPA|IPO|TSFS|NLS|App|app|ETF|HK|k|M)$/;
for (const [k, v] of Object.entries(zh)) {
  const words = (v.replace(/\{\w+\}/g, '').match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !OK.test(w));
  if (words.length) console.log('zh', k, words.join(','));
}
for (const [k, v] of Object.entries(en)) if (/\p{Script=Han}/u.test(v) && !k.startsWith('app.lang')) console.log('en', k, v);
