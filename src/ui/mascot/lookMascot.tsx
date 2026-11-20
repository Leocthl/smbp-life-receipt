import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ALL_EVENTS } from '../../data/events';
import { resolveChoice } from '../../engine/events';
import { newGame } from '../../engine/sim';
import { LOCALES, type Lang } from '../../i18n';
import { enMascot } from '../../i18n/en/mascot';
import { zhMascot } from '../../i18n/zh/mascot';
import { qualities, type Qualities } from '../../world3d/qualities';
import { ChatCard } from '../chat/ChatCard';
import { ChatResult } from '../chat/ChatResult';
import { I18nProvider, type I18n } from '../i18nContext';
import { EMOTES, isEmote, type Emote } from './emotes';
import { Mascot } from './Mascot';
import './look.css';

// ?look=mascot : Slip cycling every emote, a contact sheet of all of them, and a sample conversation.
//   &emote=cheer       freeze one emote
//   &view=card|result  only that conversation panel (&event=hot_tip&choice=small to pick the sample)
//   &tone=bad          make the result sample a bad one;   &lang=en  English;   &typing=1  keep the typewriter on
// The page sets document.title = 'ready' once mounted.

const CYCLE_MS = 2600;
const SEED = 7;

function makeT(lang: Lang): I18n['t'] {
  const dict: Record<string, string> = { ...LOCALES[lang], ...(lang === 'en' ? enMascot : zhMascot) };
  return (key, vars = {}) => (dict[key] ?? key).replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m));
}

function Cycler({ t }: { t: I18n['t'] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % EMOTES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);
  const e = EMOTES[i];
  return (
    <figure className="ml-look-cycle">
      <Mascot emote={e} emoteKey={i} label={t(`mascot.mood.${e}`)} />
      <figcaption>{e} / {t(`mascot.mood.${e}`)}</figcaption>
    </figure>
  );
}

function Sheet({ t }: { t: I18n['t'] }) {
  return (
    <ul className="ml-look-sheet">
      {EMOTES.map((e) => (
        <li key={e}><Mascot emote={e} still label={t(`mascot.mood.${e}`)} /><span>{e}</span></li>
      ))}
    </ul>
  );
}

const worse = (q: Qualities): Qualities => ({ ...q, safety: Math.max(0, q.safety - 14), freedom: Math.max(0, q.freedom - 9), joy: Math.max(0, q.joy - 5) });

function Chats({ view, eventId, choiceId, bad }: { view: string; eventId: string; choiceId: string; bad: boolean }) {
  const sample = useMemo(() => {
    const state = newGame(SEED);
    const { state: after, result } = resolveChoice(state, ALL_EVENTS, eventId, choiceId);
    const q0 = qualities(state);
    const q1 = bad ? worse(q0) : qualities(after);
    return { state, after, result: bad ? { ...result, notices: ['auto_borrow'] } : result, q0, q1 };
  }, [eventId, choiceId, bad]);
  const card = { eventId };
  useEffect(() => { document.title = 'ready'; }, []);
  return (
    <div className="ml-look-chats">
      {view !== 'result' && <ChatCard state={sample.state} card={card} onChoose={() => undefined} />}
      {view !== 'card' && <ChatResult state={sample.after} card={card} result={sample.result} entry={{ before: sample.q0, after: sample.q1 }} onNext={() => undefined} />}
    </div>
  );
}

function LookPage({ t, q }: { t: I18n['t']; q: URLSearchParams }) {
  const emote = q.get('emote');
  const view = q.get('view') ?? 'all';
  const one: Emote | null = isEmote(emote) ? emote : null;
  useEffect(() => { document.title = 'ready'; }, []);
  if (view === 'card' || view === 'result') {
    return <Chats view={view} eventId={q.get('event') ?? 'hot_tip'} choiceId={q.get('choice') ?? 'small'} bad={q.get('tone') === 'bad'} />;
  }
  return (
    <main className="ml-look">
      {one ? (
        <figure className="ml-look-cycle"><Mascot emote={one} still label={t(`mascot.mood.${one}`)} /><figcaption>{one}</figcaption></figure>
      ) : (
        <><Cycler t={t} /><Sheet t={t} /></>
      )}
      {!one && <Chats view="all" eventId={q.get('event') ?? 'hot_tip'} choiceId={q.get('choice') ?? 'small'} bad={q.get('tone') === 'bad'} />}
    </main>
  );
}

export function mountLookMascot(container: HTMLElement) {
  const q = new URLSearchParams(window.location.search);
  const lang: Lang = q.get('lang') === 'en' ? 'en' : 'zh';
  const t = makeT(lang);
  createRoot(container).render(
    <I18nProvider value={{ lang, t }}>
      <LookPage t={t} q={q} />
    </I18nProvider>,
  );
}
