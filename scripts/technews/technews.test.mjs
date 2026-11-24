import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCard, normalizeDay } from './normalize.mjs';

test('normalizeCard: 필요한 필드만, 링크는 http(s) 만', () => {
  const card = normalizeCard({
    id: 'x', date: '2026-11-24', kind: 'repo', rank: 3, score: 9.5, title: ' a / b ', url: 'https://github.com/a/b',
    code: 'javascript:alert(1)', lang: 'TypeScript', stars: 1200, gain: 40, one_line: '한 줄', points: ['p1', '', 2], why: '이유',
    detail: { overview: '개요', features: ['f1'], how: '방법', use_cases: ['u1'], caveats: '' }, readme_md: '# 큰 원문',
  });
  assert.equal(card.title, 'a / b');
  assert.equal(card.code, undefined);
  assert.deepEqual(card.points, ['p1']);
  assert.equal(card.overview, '개요');
  assert.equal('readme_md' in card, false);
});

test('normalizeDay: 저장소 → 논문 → 주목 논문, 같은 종류는 점수순', () => {
  const day = normalizeDay('2026-11-24', [
    { id: '1', title: 'p-low', kind: 'paper', score: 1 },
    { id: '2', title: 't', kind: 'trending', score: 9 },
    { id: '3', title: 'r', kind: 'repo', score: 2 },
    { id: '4', title: 'p-high', kind: 'paper', score: 5 },
    { id: '', title: '빈 id 는 버림', kind: 'repo' },
  ]);
  assert.deepEqual(day.cards.map((c) => c.title), ['r', 'p-high', 'p-low', 't']);
});
