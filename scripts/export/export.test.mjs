import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPortfolio } from '../../src/lib/portfolio.mjs';
import { buildLetterPrompt, buildPortfolioPrompt, DEFAULT_QUESTIONS, diaryForPrompt, renderBasePortfolio, renderLetter } from './prompts.mjs';

const profile = {
  name: '홍길동', headline: '클라이언트 개발자 지망', intro: '소개', location: 'Seoul',
  links: { GitHub: 'https://github.com/x' }, education: [{ school: 'OO대', major: '컴공' }],
  languages: [{ name: '日本語', level: 'N2' }], skills: [], targetRoles: [], targetLocations: [], notes: '',
};
const entries = [
  { id: 'b', title: '풀링', date: new Date('2026-03-01'), tags: [], project: '슈팅', skills: ['Unity'], highlight: 'GC 0B', body: '본문 B' },
  { id: 'a', title: '시작', date: new Date('2026-01-01'), tags: [], skills: [], body: '본문 A' },
];

test('renderBasePortfolio: 프로필·성과·프로젝트·기술 섹션', () => {
  const md = renderBasePortfolio(profile, buildPortfolio(entries), '2026-11-24');
  assert.match(md, /^# 홍길동 — 포트폴리오/);
  assert.match(md, /- 학력: OO대 · 컴공/);
  assert.match(md, /## 핵심 성과\n\n- GC 0B \(2026-03-01\)/);
  assert.match(md, /### 슈팅\n\n- 기간: 2026-03 – 2026-03\n- 기술: Unity\n- 2026-03-01 풀링 — GC 0B/);
  assert.match(md, /## 기술 스택\n\n- \*\*기타\*\*: Unity/);
  assert.match(md, /기술 일기 2개에서 자동 생성 · 2026-11-24$/);
});

test('renderBasePortfolio: 일기가 없어도 프로필만으로 만든다', () => {
  const md = renderBasePortfolio(profile, buildPortfolio([]), '2026-11-24');
  assert.doesNotMatch(md, /## 프로젝트/);
  assert.match(md, /기술 일기 0개/);
});

test('renderLetter: 문항 번호와 글자 수(공백 포함/제외)', () => {
  const md = renderLetter({
    answers: [{ question: '지원 동기 (700자 이내)', answer: ' 게임을 만듭니다 ' }],
    lang: 'ko', job: { company: 'Riot Games', title: 'Engineer' }, model: 'm', entryCount: 2, date: '2026-11-24',
  });
  assert.match(md, /^# 자기소개서 — Riot Games · Engineer/);
  assert.match(md, /## 1\. 지원 동기 \(700자 이내\)\n\n게임을 만듭니다\n\n<sub>공백 포함 8자 · 공백 제외 7자<\/sub>/);
});

test('buildLetterPrompt: 언어별 문체·문항·공고가 들어가고, 지어내지 말라는 규칙이 있다', () => {
  const { system, prompt } = buildLetterPrompt({
    profile, diaryText: diaryForPrompt(entries), job: { company: 'X', title: 'Y', url: 'https://x', description: 'C++ 必須' },
    lang: 'ja', questions: DEFAULT_QUESTIONS.ja,
  });
  assert.match(system, /日本語/);
  assert.match(system, /です・ます/);
  assert.match(prompt, /1\. 志望動機（400字以内）/);
  assert.match(prompt, /C\+\+ 必須/);
  assert.match(prompt, /### 2026-03-01 · 풀링\n프로젝트: 슈팅 \| 기술: Unity \| 성과: GC 0B\n본문 B/);
  assert.match(prompt, /지어내지 않는다/);
});

test('buildPortfolioPrompt: 공고가 없으면 희망 직무 기준', () => {
  const { prompt } = buildPortfolioPrompt({ profile, diaryText: '', job: null, lang: 'en' });
  assert.match(prompt, /특정 공고 없음/);
});
