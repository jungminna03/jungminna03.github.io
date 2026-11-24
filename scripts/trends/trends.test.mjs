import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateRevenue, genreStats, marketSummary, normalizeGame, opportunities, rankEntry, ruleInsights, topGames, usd } from './analyze.mjs';
import { buildTrendsPrompt } from './insights.mjs';

const ko = new Map([[492, '인디'], [1716, '로그라이크'], [1662, '생존'], [599, '시뮬레이션']]);
const item = (appid, { tags = [492, 1716], reviews = 100, cents = 999, free = false, days = 5, positive = 90 } = {}) => ({
  appid,
  name: `Game ${appid}`,
  is_free: free,
  best_purchase_option: free ? undefined : { final_price_in_cents: String(cents) },
  tags: tags.map((tagid, i) => ({ tagid, weight: 100 - i })),
  reviews: { summary_filtered: { review_count: reviews, percent_positive: positive } },
  basic_info: { developers: [{ name: 'Dev' }] },
  release: { steam_release_date: Math.floor((Date.parse('2026-11-24') - days * 86_400_000) / 1000) },
});
const cfg = { reviewMultiplier: 30, priceRealization: 0.7, tractionReviews: 10, minGenreReleases: 2 };

test('normalizeGame: 가격(할인 전 원가)·리뷰·태그·인디 여부', () => {
  const game = normalizeGame({ ...item(1), best_purchase_option: { final_price_in_cents: '401', original_price_in_cents: '599' } }, ko);
  assert.equal(game.price, 5.99);
  assert.equal(game.free, false);
  assert.equal(game.indie, true);
  assert.deepEqual(game.tags, ['로그라이크']);
  assert.equal(game.reviews, 100);
  assert.equal(game.released, '2026-11-19');
  assert.equal(game.url, 'https://store.steampowered.com/app/1/');
  assert.equal(normalizeGame(item(2, { free: true }), ko).free, true);
});

test('estimateRevenue: 리뷰 × 30 × 가격 × 0.7, 무료는 0', () => {
  assert.equal(estimateRevenue({ free: false, reviews: 100, price: 10 }, cfg), 21000);
  assert.equal(estimateRevenue({ free: true, reviews: 100, price: 10 }, cfg), 0);
});

test('genreStats / opportunities / topGames', () => {
  const games = [
    normalizeGame(item(1, { tags: [492, 1716], reviews: 200, cents: 1999 }), ko),
    normalizeGame(item(2, { tags: [492, 1716], reviews: 2, cents: 499 }), ko),
    normalizeGame(item(3, { tags: [492, 1662], reviews: 50, cents: 999 }), ko),
    normalizeGame(item(4, { tags: [492, 1662], free: true, reviews: 500 }), ko),
    normalizeGame(item(5, { tags: [492, 1662], reviews: 0, cents: 999 }), ko),
  ];
  for (const game of games) game.revenue = estimateRevenue(game, cfg);
  games[0].youtube = { views: 1000 };
  const genres = genreStats(games, [{ id: 1716, en: 'Roguelike', ko: '로그라이크' }, { id: 1662, en: 'Survival', ko: '생존' }, { id: 599, en: 'Simulation' }], cfg);

  assert.deepEqual(genres.map((g) => [g.name, g.releases, g.traction]), [['생존', 3, 2], ['로그라이크', 2, 1]]);
  const rogue = genres.find((g) => g.en === 'Roguelike');
  // 200리뷰 × 30 × $19.99 × 0.7 = 83,958 / 2리뷰 × 30 × $4.99 × 0.7 = 210
  assert.equal(rogue.revenue, 83958 + 210);
  assert.equal(rogue.perRelease, Math.round((83958 + 210) / 2));
  assert.equal(rogue.top.name, 'Game 1');
  assert.equal(rogue.youtube, 1000);
  assert.equal(genres.find((g) => g.en === 'Survival').median, Math.round((0 + 10490) / 2));

  assert.deepEqual(opportunities(genres, cfg).map((g) => g.en), ['Roguelike', 'Survival']);
  assert.deepEqual(opportunities(genres, { minGenreReleases: 3 }).map((g) => g.en), ['Survival']);
  assert.deepEqual(topGames(games, 2).map((g) => g.appid), [1, 3]);
  assert.equal(topGames(games, 5).some((g) => g.free), false);
});

test('rankEntry / marketSummary: 신작(90일)·무료·인디 비중과 장르', () => {
  const now = Date.parse('2026-11-24');
  const sellers = [
    rankEntry({ rank: 1, weeks: 2, item: item(10, { tags: [492, 1716], days: 10 }) }, ko, now),
    rankEntry({ rank: 2, weeks: 300, item: item(11, { tags: [599], days: 2000, free: true }) }, ko, now),
  ];
  assert.equal(sellers[0].isNew, true);
  assert.equal(sellers[1].isNew, false);
  assert.equal(sellers[0].weeks, 2);
  assert.deepEqual(marketSummary(sellers), {
    sellers: 2, newCount: 1, freeCount: 1, indieCount: 1, earlyAccessCount: 0,
    topTags: [{ name: '로그라이크', count: 1 }, { name: '시뮬레이션', count: 1 }],
  });
});

test('ruleInsights: 숫자가 들어간 요약 문장', () => {
  const indie = {
    releases: 1200, withTraction: 120,
    genres: [{ name: '시뮬레이션', releases: 300 }, { name: '로그라이크', releases: 120 }, { name: '생존', releases: 90 }],
    opportunities: [{ name: '로그라이크', perRelease: 12000 }],
    topGames: [{ name: 'Hit', tags: ['로그라이크', '덱빌딩'], revenue: 1_500_000, youtube: { views: 2_000_000 } }],
  };
  const market = {
    sellers: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], mostPlayed: [{ name: 'CS2', peak: 1_000_000 }], mobileJP: [{ name: 'モンスト' }],
    summary: { sellers: 30, newCount: 5, freeCount: 8, indieCount: 4, topTags: [{ name: '액션' }] },
  };
  const out = ruleInsights({ windowDays: 30, indie, market }, cfg);
  assert.equal(out.indie.headline, '최근 30일 인디 신작 1,200개 — 가장 많이 나온 장르는 시뮬레이션');
  assert.ok(out.indie.points.includes('추정 매출 1위: Hit (로그라이크·덱빌딩) $1.5M'));
  assert.ok(out.indie.points.includes('리뷰 10개 이상 받은 게임은 10%뿐 — 대부분은 거의 팔리지 않았어요'));
  assert.ok(out.indie.points.some((p) => p.startsWith('유튜브 화제성 1위: Hit')));
  assert.equal(out.market.headline, '스팀 주간 매출 TOP 30 중 신작 5 · 무료 8 · 인디 4');
  assert.equal(usd(999), '$999');
  assert.equal(usd(12_345), '$12K');
});

test('buildTrendsPrompt: 장르 표·상위 게임·시장·프로필이 들어간다', () => {
  const report = {
    window: { days: 30, from: '2026-10-25', to: '2026-11-24' },
    method: { reviewMultiplier: 30, priceRealization: 0.7, tractionReviews: 10 },
    indie: {
      releases: 10, paid: 8, free: 2, withTraction: 3,
      genres: [{ name: '로그라이크', en: 'Roguelike', releases: 5, traction: 2, revenue: 50_000, perRelease: 10_000, median: 1000, positive: 88, youtube: 0 }],
      topGames: [{ name: 'Hit', tags: ['로그라이크'], released: '2026-11-01', price: 9.99, reviews: 300, positive: 95, revenue: 62_937 }],
    },
    market: { sellers: [{ rank: 1, name: 'CS2', tags: ['FPS'], isNew: false, free: true }], mostPlayed: [{ rank: 1, name: 'CS2', peak: 1_000_000 }], mobileJP: [] },
  };
  const profile = { targetRoles: ['클라이언트'], experience: '신입', skills: ['Unity'], languages: [{ name: '日本語', level: 'N1' }] };
  const prompt = buildTrendsPrompt({ report, news: [{ feed: 'GI', title: 'Switch 2 sales' }], profile });
  assert.match(prompt, /- 로그라이크\(Roguelike\): 5 \/ 2 \/ \$50K \/ \$10K \/ \$1K \/ 88% \/ 0/);
  assert.match(prompt, /1\. Hit \(로그라이크\) — 출시 2026-11-01, \$9\.99, 리뷰 300 \(긍정 95%\), 추정 \$63K/);
  assert.match(prompt, /1\. CS2 \[무료\] FPS/);
  assert.match(prompt, /\[GI\] Switch 2 sales/);
  assert.match(prompt, /Unity 1인 개발/);
});

test('sourcesOf: 검색 결과와 인용에서 URL 을 중복 없이 모은다', async () => {
  const { sourcesOf } = await import('../lib/ai.mjs');
  const blocks = [
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } },
    {
      type: 'web_search_tool_result',
      content: [
        { type: 'web_search_result', url: 'https://a.com/1', title: 'A' },
        { type: 'web_search_result', url: 'https://b.com/2', title: 'B' },
      ],
    },
    { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } },
    { type: 'text', text: '99점', citations: [{ type: 'web_search_result_location', url: 'https://a.com/1', title: 'A' }, { url: 'https://c.com/3', title: 'C' }] },
  ];
  assert.deepEqual(sourcesOf(blocks), [
    { url: 'https://a.com/1', title: 'A' },
    { url: 'https://b.com/2', title: 'B' },
    { url: 'https://c.com/3', title: 'C' },
  ]);
});

test('keepKnownSources: 검색에 나오지 않은 링크는 버린다', async () => {
  const { keepKnownSources, buildResearchPrompt } = await import('./majors.mjs');
  const result = { headline: 'h', upcoming: [], games: [{ name: 'G', sources: ['https://a.com/1', 'https://made-up.com/x'] }] };
  const out = keepKnownSources(result, [{ url: 'https://a.com/1', title: 'A' }]);
  assert.deepEqual(out.games[0].sources, ['https://a.com/1']);
  assert.match(buildResearchPrompt({ today: '2026-11-24', days: 45 }), /2026-11-24.*45일/s);
});

test('buildGapPrompt: 빈 항목만 묻는다', async () => {
  const { buildGapPrompt } = await import('./majors.mjs');
  const both = buildGapPrompt({ name: 'GTA VI', released: '2026-11-19', user: null, streams: null });
  assert.match(both, /Metacritic user score/);
  assert.match(both, /peak viewers/);
  const onlyStreams = buildGapPrompt({ name: 'GTA VI', released: '2026-11-19', user: { score: 4.8 }, streams: null });
  assert.doesNotMatch(onlyStreams, /user score/);
  assert.match(onlyStreams, /peak viewers/);
});
