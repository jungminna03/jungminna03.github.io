// 게임 트렌드 분석 → src/data/trends.json
// 실행: npm run trends   (AI 인사이트를 지금 다시 쓰려면 npm run trends -- --force-ai)
import config from '../../config/trends.mjs';
import profile from '../../config/profile.mjs';
import { aiEnabled } from '../lib/ai.mjs';
import { kstDate, readJson, warn, writeJson } from '../lib/util.mjs';
import { estimateRevenue, genreStats, marketSummary, normalizeGame, opportunities, rankEntry, ruleInsights, topGames } from './analyze.mjs';
import { appleTopGrossingJP, recentNews, steamSpyOwners, youtubeBuzz, youtubeEnabled } from './external.mjs';
import { aiInsights } from './insights.mjs';
import { majorReleases } from './majors.mjs';
import { mostPlayed, pause, recentReleases, tagNames, weeklyTopSellers } from './steam.mjs';

const OUTPUT = 'src/data/trends.json';
const previous = await readJson(OUTPUT, null);
const now = new Date();
let failed = false;

// 1) 태그 이름 (영어: 설정의 장르 이름 → id, 한국어: 화면 표시)
const [enTags, koTags] = await Promise.all([tagNames('english'), tagNames('koreana')]);
const idByName = new Map([...enTags].map(([id, name]) => [name.toLowerCase(), id]));
const genres = config.genres.flatMap((en) => {
  const id = idByName.get(en.toLowerCase());
  if (!id) warn(`장르 태그를 찾지 못함: ${en}`);
  return id ? [{ id, en, ko: koTags.get(id) }] : [];
});

// 2) 최근 신작 (실패하면 어제 리포트를 그대로 둔다)
console.log(`최근 ${config.windowDays}일 신작 수집…`);
const releases = await recentReleases(config.windowDays, { log: console.log });
const recent = releases.items.map((item) => normalizeGame(item, koTags));
const indie = recent.filter((game) => game.indie);
for (const game of indie) game.revenue = estimateRevenue(game, config);
// 중간에 막혔으면 실제로 모은 가장 오래된 출시일부터로 기간을 적는다
const oldest = recent.map((game) => game.released).filter(Boolean).sort()[0];
const windowFrom = releases.complete || !oldest ? kstDate(new Date(now.getTime() - config.windowDays * 86_400_000)) : oldest;
const windowDays = Math.round((now.getTime() - Date.parse(windowFrom)) / 86_400_000);
if (!releases.complete) warn(`신작 목록을 끝까지 못 가져와서 ${windowFrom} 이후 ${windowDays}일치로 분석합니다.`);
console.log(`✓ 신작 ${recent.length}개 (인디 ${indie.length}개)`);

// 3) 추정 매출 상위 + SteamSpy 보유자 + 유튜브 화제성
const top = topGames(indie, config.topGames);
for (const game of top) {
  try {
    game.owners = await steamSpyOwners(game.appid);
  } catch {
    // 보유자 추정은 없어도 된다
  }
  await pause(1100);
}
if (youtubeEnabled()) {
  for (const game of top.slice(0, config.youtube.games)) {
    try {
      game.youtube = await youtubeBuzz(game.name, game.released, config.youtube.videosPerGame);
    } catch (err) {
      warn(`유튜브 조회 실패 (${game.name}): ${err.message}`);
      if (err.quota) break;
    }
  }
  console.log(`✓ 유튜브 화제성 ${top.filter((game) => game.youtube).length}개`);
} else {
  console.log('YOUTUBE_API_KEY 가 없어서 유튜브 화제성은 건너뜁니다.');
}

// 4) 전체 시장 (부분 실패는 어제 값으로)
let market = previous?.market ?? { sellers: [], mostPlayed: [], mobileJP: [], summary: marketSummary([]) };
try {
  const sellers = (await weeklyTopSellers(30)).map((rank) => rankEntry(rank, koTags, now.getTime()));
  const played = (await mostPlayed(15)).map((rank) => rankEntry(rank, koTags, now.getTime()));
  market = { ...market, sellers, mostPlayed: played, summary: marketSummary(sellers) };
  console.log(`✓ 주간 매출 TOP ${sellers.length} · 동접 TOP ${played.length}`);
} catch (err) {
  failed = true;
  warn(`스팀 순위 실패 — 이전 값 유지: ${err.message}`);
}
try {
  market.mobileJP = await appleTopGrossingJP(15);
  console.log(`✓ 일본 모바일 매출 TOP ${market.mobileJP.length}`);
} catch (err) {
  warn(`일본 모바일 순위 실패 — 이전 값 유지: ${err.message}`);
}

// 5) 리포트
const genreTable = genreStats(indie, genres, config);
const report = {
  generatedAt: now.toISOString(),
  window: { days: windowDays, from: windowFrom, to: kstDate(now), complete: releases.complete },
  method: { reviewMultiplier: config.reviewMultiplier, priceRealization: config.priceRealization, tractionReviews: config.tractionReviews },
  total: recent.length,
  indie: {
    releases: indie.length,
    paid: indie.filter((game) => !game.free).length,
    free: indie.filter((game) => game.free).length,
    withTraction: indie.filter((game) => game.reviews >= config.tractionReviews).length,
    genres: genreTable.slice(0, 30),
    opportunities: opportunities(genreTable, config),
    topGames: top.map(({ tagIds, indie: _indie, ...game }) => game),
  },
  market,
  insights: null,
  majors: previous?.majors ?? null,
  sources: { youtube: youtubeEnabled() },
};

// 6) 인사이트 — AI 는 aiEveryDays 마다 (숫자는 매일 갱신)
report.insights = ruleInsights({ windowDays, indie: report.indie, market }, config);
if (aiEnabled()) {
  const last = previous?.insights;
  const fresh = last?.by === 'ai' && now.getTime() - Date.parse(last.generatedAt) < config.aiEveryDays * 86_400_000;
  if (fresh && !process.argv.includes('--force-ai')) {
    report.insights = last;
    console.log(`AI 인사이트 유지 (${last.generatedAt.slice(0, 10)} 작성)`);
  } else {
    try {
      const news = await recentNews(config.feeds, config.newsHours);
      report.insights = await aiInsights({ report, news, profile });
      console.log('✓ AI 인사이트 작성');
    } catch (err) {
      failed = true;
      warn(`AI 인사이트 실패 — 규칙 요약으로 대체: ${err.message}`);
    }
  }
} else {
  console.log('ANTHROPIC_API_KEY 가 없어서 규칙 요약만 씁니다.');
}

// 7) 대작 출시·평가 — 웹 검색이라 majors.everyDays 마다, majors.model 로 (실패하면 이전 값 유지)
if (aiEnabled()) {
  const last = previous?.majors;
  const fresh = last && now.getTime() - Date.parse(last.generatedAt) < config.majors.everyDays * 86_400_000;
  if (fresh && !process.argv.includes('--force-ai') && !process.argv.includes('--force-majors')) {
    console.log(`대작 현황 유지 (${last.generatedAt.slice(0, 10)} 조사)`);
  } else {
    try {
      report.majors = await majorReleases({ today: kstDate(now), days: config.majors.days, maxSearches: config.majors.maxSearches, model: config.majors.model, gapGames: config.majors.gapGames, gapSearches: config.majors.gapSearches });
      console.log(`✓ 대작 현황 ${report.majors.games.length}개 · 출시 예정 ${report.majors.upcoming.length}개`);
    } catch (err) {
      failed = true;
      warn(`대작 현황 조사 실패 — 이전 값 유지: ${err.message}`);
    }
  }
}

await writeJson(OUTPUT, report);
console.log(`저장: ${OUTPUT}`);
if (failed) process.exitCode = 1;
