// 신작·시장 데이터 집계 (순수 함수 — 테스트 대상)
export const INDIE_TAG = 492; // Steam 'Indie' 태그
const DAY = 86_400_000;

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

export const usd = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);

/** Steam 상세(IStoreBrowseService) → 분석용 게임 */
export function normalizeGame(item, koTags = new Map()) {
  const option = item.best_purchase_option ?? {};
  const cents = Number(option.original_price_in_cents ?? option.final_price_in_cents ?? 0);
  const tagIds = item.tags?.length ? [...item.tags].sort((a, b) => b.weight - a.weight).map((tag) => tag.tagid) : (item.tagids ?? []);
  const summary = item.reviews?.summary_filtered;
  const firstRelease = item.release?.original_steam_release_date ?? item.release?.steam_release_date;
  return {
    appid: item.appid,
    name: item.name,
    url: `https://store.steampowered.com/app/${item.appid}/`,
    released: firstRelease ? new Date(firstRelease * 1000).toISOString().slice(0, 10) : undefined,
    free: Boolean(item.is_free) || cents === 0,
    price: cents / 100,
    reviews: summary?.review_count ?? 0,
    positive: summary?.percent_positive ?? null,
    developer: item.basic_info?.developers?.[0]?.name,
    earlyAccess: Boolean(item.is_early_access),
    indie: tagIds.includes(INDIE_TAG),
    tagIds,
    tags: tagIds.filter((id) => id !== INDIE_TAG).slice(0, 4).map((id) => koTags.get(id)).filter(Boolean),
  };
}

/** 추정 매출(USD) = 리뷰 수 × 배수 × 출시가 × 실판매가 비율 (Boxleiter 방식). 무료 게임은 0 */
export const estimateRevenue = (game, { reviewMultiplier, priceRealization }) =>
  game.free ? 0 : Math.round(game.reviews * reviewMultiplier * game.price * priceRealization);

/**
 * 장르별 집계. 한 게임이 여러 장르 태그를 가지면 각 장르에 모두 들어간다.
 * @param {Array<ReturnType<typeof normalizeGame> & { revenue: number, youtube?: { views: number } }>} games
 * @param {{ id: number, en: string, ko?: string }[]} genres
 */
export function genreStats(games, genres, { tractionReviews }) {
  return genres
    .map((genre) => {
      const list = games.filter((game) => game.tagIds.includes(genre.id));
      const paid = list.filter((game) => !game.free);
      const traction = list.filter((game) => game.reviews >= tractionReviews);
      const rated = traction.filter((game) => game.positive != null);
      const revenue = paid.reduce((sum, game) => sum + game.revenue, 0);
      const top = paid.reduce((best, game) => (!best || game.revenue > best.revenue ? game : best), null);
      return {
        id: genre.id,
        name: genre.ko ?? genre.en,
        en: genre.en,
        releases: list.length,
        traction: traction.length,
        revenue,
        median: median(paid.map((game) => game.revenue)),
        perRelease: list.length ? Math.round(revenue / list.length) : 0,
        positive: rated.length ? Math.round(rated.reduce((sum, game) => sum + game.positive, 0) / rated.length) : null,
        youtube: list.reduce((sum, game) => sum + (game.youtube?.views ?? 0), 0),
        top: top && top.revenue > 0 ? { appid: top.appid, name: top.name, url: top.url, revenue: top.revenue } : null,
      };
    })
    .filter((genre) => genre.releases > 0)
    .sort((a, b) => b.releases - a.releases || b.revenue - a.revenue);
}

/** 기회 장르: 표본이 충분한 장르 중 출시 1개당 추정 매출이 높은 순 */
export const opportunities = (genres, { minGenreReleases }, n = 5) =>
  genres.filter((genre) => genre.releases >= minGenreReleases && genre.perRelease > 0).sort((a, b) => b.perRelease - a.perRelease).slice(0, n);

/** 추정 매출 상위 (같은 객체를 돌려줘서 나중에 붙인 유튜브 데이터가 장르 집계에도 반영된다) */
export const topGames = (games, n) =>
  games.filter((game) => !game.free && game.revenue > 0).sort((a, b) => b.revenue - a.revenue || b.reviews - a.reviews).slice(0, n);

/** 시장 순위표 한 줄 */
export function rankEntry({ item, ...rank }, koTags, now = Date.now()) {
  const game = normalizeGame(item, koTags);
  const released = game.released ? Date.parse(game.released) : 0;
  return {
    ...rank,
    appid: game.appid,
    name: game.name,
    url: game.url,
    released: game.released,
    free: game.free,
    price: game.price,
    indie: game.indie,
    earlyAccess: game.earlyAccess,
    isNew: released > now - 90 * DAY,
    reviews: game.reviews,
    positive: game.positive,
    tags: game.tags,
  };
}

export function marketSummary(sellers) {
  const count = (test) => sellers.filter(test).length;
  const tagCount = new Map();
  for (const seller of sellers) for (const tag of seller.tags.slice(0, 3)) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
  return {
    sellers: sellers.length,
    newCount: count((s) => s.isNew),
    freeCount: count((s) => s.free),
    indieCount: count((s) => s.indie),
    earlyAccessCount: count((s) => s.earlyAccess),
    topTags: [...tagCount].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, count: n })),
  };
}

/** AI 없이 쓰는 요약 */
export function ruleInsights({ windowDays, indie, market }, { tractionReviews }) {
  const [first] = indie.genres;
  const buzz = indie.topGames.filter((game) => game.youtube?.views).sort((a, b) => b.youtube.views - a.youtube.views)[0];
  const tractionRate = indie.releases ? Math.round((indie.withTraction / indie.releases) * 100) : 0;
  const [topGame] = indie.topGames;
  return {
    by: 'rule',
    indie: {
      headline: `최근 ${windowDays}일 인디 신작 ${indie.releases.toLocaleString()}개 — 가장 많이 나온 장르는 ${first?.name ?? '-'}`,
      points: [
        `출시가 많은 장르: ${indie.genres.slice(0, 3).map((g) => `${g.name} ${g.releases}개`).join(', ')}`,
        indie.opportunities.length > 0 &&
          `출시 1개당 추정 매출이 높은 장르: ${indie.opportunities.slice(0, 3).map((g) => `${g.name} ${usd(g.perRelease)}`).join(', ')}`,
        topGame && `추정 매출 1위: ${topGame.name}${topGame.tags.length ? ` (${topGame.tags.slice(0, 2).join('·')})` : ''} ${usd(topGame.revenue)}`,
        `리뷰 ${tractionReviews}개 이상 받은 게임은 ${tractionRate}%뿐 — 대부분은 거의 팔리지 않았어요`,
        buzz && `유튜브 화제성 1위: ${buzz.name} (상위 영상 조회수 합 ${buzz.youtube.views.toLocaleString()})`,
      ].filter(Boolean),
    },
    market: {
      headline: `스팀 주간 매출 TOP ${market.summary.sellers} 중 신작 ${market.summary.newCount} · 무료 ${market.summary.freeCount} · 인디 ${market.summary.indieCount}`,
      points: [
        market.sellers.length > 0 && `매출 1~3위: ${market.sellers.slice(0, 3).map((s) => s.name).join(', ')}`,
        market.mostPlayed.length > 0 && `동시 접속 1위: ${market.mostPlayed[0].name} (최고 ${market.mostPlayed[0].peak.toLocaleString()}명)`,
        market.summary.topTags.length > 0 && `매출 상위에 많은 장르: ${market.summary.topTags.slice(0, 4).map((t) => t.name).join(', ')}`,
        market.mobileJP.length > 0 && `일본 모바일 매출 1~3위: ${market.mobileJP.slice(0, 3).map((m) => m.name).join(', ')}`,
      ].filter(Boolean),
    },
    ideas: [],
  };
}
