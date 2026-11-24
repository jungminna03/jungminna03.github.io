// Steam 데이터. api.steampowered.com 은 Valve 공식 API (키 불필요).
// 스토어 검색 페이지는 '출시일 순 신작 목록'에만 쓴다 (공식 API 에 출시일 정렬이 없음). 요청 사이에 쉬어서 부담을 줄인다.
import { fetchJson } from '../lib/util.mjs';

const API = 'https://api.steampowered.com';
const CONTEXT = { language: 'english', country_code: 'US' }; // 가격은 USD 기준
const DETAILS = { include_basic_info: true, include_release: true, include_tag_count: 12, include_reviews: true };
const input = (body) => `input_json=${encodeURIComponent(JSON.stringify(body))}`;
export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 429(요청 과다)·5xx 는 60초, 120초, 180초 쉬었다가 다시 시도 */
async function fetchJsonPolitely(url, { retries = 3, wait = 60_000, log = () => {} } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (err) {
      if (attempt >= retries || !/HTTP (429|5\d\d)/.test(err.message)) throw err;
      log(`  ${err.message.split(' — ')[0]} — ${(wait * (attempt + 1)) / 1000}초 쉬고 다시 시도`);
      await pause(wait * (attempt + 1));
    }
  }
}

/** 태그 id → 이름 (language: 'english' | 'koreana') */
export async function tagNames(language) {
  const data = await fetchJson(`${API}/IStoreService/GetTagList/v1/?language=${language}`);
  return new Map(data.response.tags.map((tag) => [tag.tagid, tag.name]));
}

/** appid 100개씩 상세 정보 (태그·리뷰·가격·개발사·출시일) */
export async function getItems(appids, { log } = {}) {
  const items = [];
  for (let i = 0; i < appids.length; i += 100) {
    const ids = appids.slice(i, i + 100).map((appid) => ({ appid }));
    const data = await fetchJsonPolitely(`${API}/IStoreBrowseService/GetItems/v1/?${input({ ids, context: CONTEXT, data_request: DETAILS })}`, { log });
    items.push(...(data.response.store_items ?? []).filter((item) => item.success === 1 && item.visible !== false));
    if (i + 100 < appids.length) await pause(300);
  }
  return items;
}

/**
 * 최근 days 일 동안 출시된 게임 — 출시일 순 검색 결과를 넘기다가 기간을 벗어나면 멈춘다.
 * 중간에 계속 막히면 모은 데까지만 돌려주고 complete: false (리포트에 실제 기간을 적는다)
 */
export async function recentReleases(days, { maxPages = 80, log = () => {} } = {}) {
  const cutoff = Date.now() / 1000 - days * 86_400;
  const byId = new Map();
  let complete = false;
  for (let page = 0; page < maxPages; page += 1) {
    let items;
    try {
      const data = await fetchJsonPolitely(
        `https://store.steampowered.com/search/results/?query&start=${page * 100}&count=100&sort_by=Released_DESC&category1=998&json=1&cc=us&l=english`,
        { log },
      );
      const appids = (data.items ?? []).map((item) => Number(item.logo?.match(/\/apps\/(\d+)\//)?.[1])).filter(Boolean);
      if (appids.length === 0) {
        complete = true;
        break;
      }
      items = await getItems(appids, { log });
    } catch (err) {
      if (byId.size === 0) throw err;
      log(`  ${page + 1}쪽에서 멈춤 (${err.message.split(' — ')[0]}) — 모은 ${byId.size}개로 진행`);
      break;
    }
    for (const item of items) {
      // 얼리 액세스를 졸업한 게임은 정식 출시일이 새로 잡히므로 처음 출시된 날짜로 거른다
      if ((item.release?.original_steam_release_date ?? item.release?.steam_release_date ?? 0) >= cutoff) byId.set(item.appid, item);
    }
    log(`  검색 ${page + 1}쪽: 누적 ${byId.size}개`);
    const oldest = Math.min(...items.map((item) => item.release?.steam_release_date ?? Infinity));
    if (oldest < cutoff) {
      complete = true;
      break;
    }
    await pause(2000);
  }
  return { items: [...byId.values()], complete };
}

/** 주간 매출 TOP (전 세계, 매출 기준 순위) */
export async function weeklyTopSellers(count = 30) {
  const data = await fetchJson(
    `${API}/IStoreTopSellersService/GetWeeklyTopSellers/v1/?${input({ context: CONTEXT, data_request: DETAILS, page_start: 0, page_count: count })}`,
  );
  return (data.response.ranks ?? [])
    .filter((rank) => rank.item)
    .map((rank) => ({ rank: rank.rank, lastWeekRank: rank.last_week_rank, weeks: rank.consecutive_weeks, item: rank.item }));
}

/** 동시 접속 TOP (최고 동접 기준) */
export async function mostPlayed(count = 20) {
  const data = await fetchJson(`${API}/ISteamChartsService/GetMostPlayedGames/v1/`);
  const ranks = (data.response.ranks ?? []).slice(0, count);
  const items = new Map((await getItems(ranks.map((rank) => rank.appid))).map((item) => [item.appid, item]));
  return ranks
    .filter((rank) => items.has(rank.appid))
    .map((rank) => ({ rank: rank.rank, peak: rank.peak_in_game, lastWeekRank: rank.last_week_rank, item: items.get(rank.appid) }));
}
