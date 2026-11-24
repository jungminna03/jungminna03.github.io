// Steam 밖의 데이터: SteamSpy(보유자 추정), Apple(일본 모바일 매출 순위), YouTube(화제성), 게임 매체 RSS(참고)
import { parseFeed } from '../lib/feeds.mjs';
import { fetchJson, fetchText } from '../lib/util.mjs';

/** SteamSpy 보유자 수 추정 (예: "20,000 .. 50,000"). 초당 1회 제한이 있어서 호출하는 쪽에서 쉬어 준다 */
export async function steamSpyOwners(appid) {
  const data = await fetchJson(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
  return data.owners && data.owners !== '0 .. 20,000' ? data.owners.replace(/ \.\. /, ' ~ ') : undefined;
}

/** Apple 공식 RSS: 일본 App Store 게임 매출 순위 */
export async function appleTopGrossingJP(count = 20) {
  const data = await fetchJson(`https://itunes.apple.com/jp/rss/topgrossingapplications/limit=${count}/genre=6014/json`);
  return (data.feed?.entry ?? []).map((entry, i) => ({
    rank: i + 1,
    name: entry['im:name']?.label,
    publisher: entry['im:artist']?.label,
    url: entry.id?.label,
  }));
}

export const youtubeEnabled = () => Boolean(process.env.YOUTUBE_API_KEY);

/** YouTube 는 키가 URL 에 들어가므로 에러 메시지에 URL 을 남기지 않는다 */
async function youtube(path, params) {
  const url = `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`YouTube API ${res.status}: ${body.error?.errors?.[0]?.reason ?? body.error?.message ?? 'error'}`);
    error.quota = res.status === 403;
    throw error;
  }
  return body;
}

/**
 * 출시 후 올라온 영상 중 조회수 상위 max 개 → { videos, views, top }
 * 비용: search 100 + videos 1 = 101 쿼터 (하루 기본 10,000)
 */
export async function youtubeBuzz(name, since, max = 10) {
  const search = await youtube('search', {
    part: 'snippet', type: 'video', order: 'viewCount', maxResults: String(max), q: `"${name}"`, publishedAfter: new Date(since).toISOString(),
  });
  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
  if (ids.length === 0) return { videos: 0, views: 0, top: null };
  const stats = await youtube('videos', { part: 'statistics,snippet', id: ids.join(',') });
  const videos = (stats.items ?? [])
    .map((video) => ({ id: video.id, title: video.snippet?.title, channel: video.snippet?.channelTitle, views: Number(video.statistics?.viewCount ?? 0) }))
    .sort((a, b) => b.views - a.views);
  const [top] = videos;
  return {
    videos: videos.length,
    views: videos.reduce((sum, video) => sum + video.views, 0),
    top: top ? { title: top.title, channel: top.channel, views: top.views, url: `https://www.youtube.com/watch?v=${top.id}` } : null,
  };
}

/** 최근 hours 시간 기사 제목 (AI 가 시장 흐름을 해석할 때 참고) */
export async function recentNews(feeds, hours, perFeed = 10) {
  const cutoff = Date.now() - hours * 3_600_000;
  const news = [];
  for (const feed of feeds) {
    try {
      const items = parseFeed(await fetchText(feed.url), { defaultOffset: feed.lang === 'en' ? 'Z' : '+09:00' });
      news.push(
        ...items
          .filter((item) => !item.date || Date.parse(item.date) >= cutoff)
          .slice(0, perFeed)
          .map((item) => ({ feed: feed.name, lang: feed.lang, title: item.title, url: item.link, date: item.date })),
      );
    } catch {
      // 기사는 참고 자료라 실패해도 계속
    }
  }
  return news;
}
