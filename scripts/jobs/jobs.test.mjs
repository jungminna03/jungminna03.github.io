import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExpired, matchesFilters, mergeJobs, rankCandidates } from './merge.mjs';
import { buildDigest, buildRecommendPrompt, validatePicks } from './recommend.mjs';
import { manualJobs } from './sources.mjs';

const job = (id, extra = {}) => ({ id, title: 'Engineer', company: 'A', companyKey: 'greenhouse:a', location: 'Tokyo, Japan', ...extra });

test('matchesFilters: 근무지·직무·제외어', () => {
  const filters = { locations: ['Japan', '東京'], roles: ['engineer', 'エンジニア'], exclude: ['Director'] };
  assert.equal(matchesFilters(job('1'), filters), true);
  assert.equal(matchesFilters(job('2', { location: '東京都港区', title: 'ゲームエンジニア' }), filters), true);
  assert.equal(matchesFilters(job('3', { location: 'Los Angeles, CA' }), filters), false);
  assert.equal(matchesFilters(job('4', { title: 'Recruiter' }), filters), false);
  assert.equal(matchesFilters(job('5', { title: 'Engineering Director' }), filters), false);
  assert.equal(matchesFilters(job('6', { location: '' }), {}), true);
});

test('isExpired: 마감일이 오늘보다 이전이면 만료', () => {
  assert.equal(isExpired({ deadline: '2026-11-23' }, '2026-11-24'), true);
  assert.equal(isExpired({ deadline: '2026-11-24' }, '2026-11-24'), false);
  assert.equal(isExpired({}, '2026-11-24'), false);
});

test('mergeJobs: firstSeenAt 유지, 실패한 회사의 이전 공고 유지, 최신순', () => {
  const previous = [
    job('gh:1', { firstSeenAt: '2026-11-01T00:00:00Z', postedAt: '2026-10-01T00:00:00Z' }),
    job('gh:gone', { firstSeenAt: '2026-11-01T00:00:00Z' }),
    job('lv:1', { companyKey: 'lever:b', firstSeenAt: '2026-11-02T00:00:00Z', postedAt: '2026-11-02T00:00:00Z' }),
  ];
  const fetched = [job('gh:1', { postedAt: '2026-10-01T00:00:00Z' }), job('gh:new', { postedAt: '2026-11-20T00:00:00Z' })];
  const merged = mergeJobs(previous, fetched, new Set(['lever:b']), '2026-11-24T00:00:00Z');

  assert.deepEqual(merged.map((j) => j.id), ['gh:new', 'lv:1', 'gh:1']);
  assert.equal(merged.find((j) => j.id === 'gh:1').firstSeenAt, '2026-11-01T00:00:00Z');
  assert.equal(merged.find((j) => j.id === 'gh:new').firstSeenAt, '2026-11-24T00:00:00Z');
});

test('rankCandidates: 기술 키워드 점수 + 관심 기업은 항상 포함, 짧은 기술명 오탐 방지', () => {
  const jobs = [
    job('go', { title: 'Backend (Go)', description: '' }),
    job('google', { title: 'Google Ads Manager', description: '' }),
    job('unity', { title: 'Unityエンジニア', description: 'C# 必須' }),
    job('dream', { title: 'Producer', company: 'Riot Games', description: '' }),
  ];
  const ranked = rankCandidates(jobs, { skills: ['Unity', 'C#', 'Go'], interestCompanies: ['riot games'] }, 2);

  assert.deepEqual(ranked.map((j) => j.id), ['unity', 'go', 'dream']);
  assert.equal(ranked.find((j) => j.id === 'unity').score, 4);
  assert.equal(ranked.find((j) => j.id === 'dream').interest, true);
});

test('validatePicks: 후보에 없는 id·중복·관심 기업 아닌 interest 를 버리고 순서 정렬', () => {
  const candidates = [{ id: 'a', interest: false }, { id: 'b', interest: false }, { id: 'c', interest: true }];
  const pick = (type, jobId) => ({ type, jobId, reason: ` ${type} `, gaps: ['1', '2', '3', '4'], tip: 't' });
  const picks = validatePicks(
    [pick('interest', 'a'), pick('reach', 'b'), pick('match', 'zzz'), pick('match', 'b'), pick('interest', 'c'), pick('match', 'a')],
    candidates,
  );
  assert.deepEqual(picks.map((p) => [p.type, p.jobId]), [['match', 'a'], ['reach', 'b'], ['interest', 'c']]);
  assert.equal(picks[0].reason, 'match');
  assert.equal(picks[0].gaps.length, 3);
});

test('buildRecommendPrompt: 후보 id 와 관심 기업 표시, 프로필이 들어간다', () => {
  const profile = { targetRoles: ['클라이언트'], targetLocations: ['일본'], languages: [{ name: '日本語', level: 'N2' }], education: [], interestCompanies: ['X'], notes: '' };
  const prompt = buildRecommendPrompt({
    profile,
    skills: ['Unity'],
    digest: buildDigest([]),
    candidates: [{ id: 'greenhouse:x:1', company: 'X', title: 'Client Engineer', location: 'Tokyo', interest: true, description: 'Unity 3年以上' }],
  });
  assert.match(prompt, /\[greenhouse:x:1\] ★관심 기업/);
  assert.match(prompt, /日本語 N2/);
  assert.match(prompt, /아직 기술 일기 기록이 없음/);
  assert.match(prompt, /match \(적정 지원\)/);
});

test('manualJobs: url 로 안정적인 id', () => {
  const [a] = manualJobs([{ company: 'S', title: 'T', url: 'https://example.com/1' }]);
  const [b] = manualJobs([{ company: 'S', title: 'T2', url: 'https://example.com/1' }]);
  assert.equal(a.id, b.id);
  assert.match(a.id, /^manual:[0-9a-f]{12}$/);
  assert.equal(a.companyKey, 'manual');
});
