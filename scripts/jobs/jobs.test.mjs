import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessFit, familyOf } from './fit.mjs';
import { isExpired, matchesFilters, mergeJobs, rankCandidates } from './merge.mjs';
import { buildDigest, buildRecommendPrompt, validatePicks, validateRatings } from './recommend.mjs';
import { manualJobs } from './sources.mjs';

const me = { targetRoles: ['게임 클라이언트 프로그래머 (Unity·C#)'], experience: '신입', skills: ['Unity', 'C#', 'R3', 'UniRx', 'FSM'] };

test('familyOf: 실제 공고 제목들의 직군', () => {
  const cases = {
    'Senior Anticheat Engineer': 'server',
    'Technical VFX Artist, Pokémon GO': 'art',
    'Technical Artist, Pokémon GO': 'techart',
    'Rendering Engineer': 'tools',
    'ゲームエンジンプログラマー': 'tools',
    'Unreal Engineプログラマー': 'client',
    'ゲームサーバープログラマー': 'server',
    'ソフトウェアエンジニア': 'programmer',
    'ゲームプランナー（新卒）': 'design',
    'マーケティング担当（長期インターン）': 'other',
    '게임 클라이언트 프로그래머 (Unity·C#)': 'client',
  };
  for (const [title, key] of Object.entries(cases)) assert.equal(familyOf(title).key, key, title);
});

test('assessFit: 신입 클라이언트 기준 — 시니어·아트는 안 맞음, 포트폴리오 근거가 있으면 다른 직무도 검토', () => {
  const anticheat = assessFit({ title: 'Senior Anticheat Engineer' }, me);
  assert.equal(anticheat.level, 'low');
  assert.match(anticheat.reason, /시니어/);
  assert.equal(assessFit({ title: 'Technical VFX Artist, Pokémon GO' }, me).level, 'low');

  const client = assessFit({ title: 'Client Engineer (Unity)', description: 'C# required' }, me);
  assert.equal(client.level, 'good');
  assert.equal(client.reason, '희망 직무 (클라이언트·게임플레이) · 기술 일치: Unity, C#');

  assert.equal(assessFit({ title: 'Tools Programmer', description: 'Unity editor extensions in C#' }, me).level, 'maybe');
  assert.equal(assessFit({ title: 'Software Engineer' }, me).level, 'maybe');
  assert.equal(assessFit({ title: 'ゲームプログラマー（新卒）' }, me).level, 'good');

  // 오탐 회귀: Community 의 'unity', Engineer 의 'engine'
  const marketing = assessFit({ title: 'マーケティング担当（長期インターン）', department: 'Marketing, Community & Business Development' }, me);
  assert.equal(marketing.level, 'low');
  assert.match(marketing.reason, /직군이 달라요/);
  assert.equal(familyOf('Software Engineer, Data Infrastructure').key, 'server');

  // 엔진 불일치: Unity 개발자에게 언리얼 프로그래머는 '검토'로 내려간다
  const unreal = assessFit({ title: 'Unreal Engine Programmer', description: 'C++ / Unity experience a plus. C#' }, me);
  assert.equal(unreal.level, 'maybe');
  assert.match(unreal.reason, /언리얼 경험이 필요해요/);
});

test('validateRatings: 후보에 없는 id·중복을 버린다', () => {
  const ratings = validateRatings(
    [{ jobId: 'a', fit: 'good', reason: ' 좋음 ' }, { jobId: 'a', fit: 'low', reason: 'x' }, { jobId: 'zz', fit: 'good', reason: 'y' }],
    [{ id: 'a' }, { id: 'b' }],
  );
  assert.deepEqual(ratings, { a: { level: 'good', reason: '좋음' } });
});

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

test('parseHrmosList: HRMOS 채용 목록 페이지에서 제목·근무지·링크·본문', async () => {
  const { parseHrmosList } = await import('./sources.mjs');
  const html = `<ul><li class="pg-list-cassette jsc-joblist-cassette"> <a href="https://hrmos.co/pages/sumzap/jobs/01_01_01"> <figure></figure>
    <div><h2>【社員】Unityエンジニア</h2> <p> <span class="pg-list-cassette-body jsc-joblist-cassette-body">仕事内容 Unity+C#&amp;開発</span> </p></div>
    <ul class="sg-tags cf"> <li>エンジニア</li> <li>正社員</li> <li class="sg-tag-location">東京都渋谷区宇田川町40番1号 他(1)</li> </ul> </a> </li>
    <li class="pg-list-cassette jsc-joblist-cassette"> <a href="https://example.com/x">링크 없음</a></li></ul>`;
  const jobs = parseHrmosList(html, 'sumzap');
  assert.equal(jobs.length, 1);
  assert.deepEqual(
    { ...jobs[0], description: undefined },
    {
      id: 'hrmos:sumzap:01_01_01',
      title: '【社員】Unityエンジニア',
      location: '東京都渋谷区宇田川町40番1号',
      url: 'https://hrmos.co/pages/sumzap/jobs/01_01_01',
      department: 'エンジニア',
      postedAt: undefined,
      description: undefined,
    },
  );
  assert.match(jobs[0].description, /エンジニア · 正社員\n仕事内容 Unity\+C#&開発/);
});
