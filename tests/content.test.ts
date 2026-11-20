import { describe, expect, it } from 'vitest';
import { ALL_EVENTS } from '../src/data/events';
import { validateContent } from '../src/engine/validate';
import { zhEvents } from '../src/i18n/zh/events';
import { enEvents } from '../src/i18n/en/events';

describe('content', () => {
  it('passes every content rule (choices, ids, reveals, text in zh and en)', () => {
    expect(validateContent(ALL_EVENTS, { zh: zhEvents, en: enEvents })).toEqual([]);
  });
  it('has the spec seed events for 18-25', () => {
    const ids = ALL_EVENTS.map((e) => e.id);
    for (const id of ['part_time', 'tuition', 'japan_trip', 'jiayong', 'insurance_pitch', 'hot_tip', 'first_crash', 'card_cashback', 'ipo', 'medical_bill', 'rent_increase', 'internship', 'mpf_choice', 'laptop', 'side_hustle']) {
      expect(ids).toContain(id);
    }
  });
});
