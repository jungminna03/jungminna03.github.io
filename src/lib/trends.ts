import raw from '../data/trends.json';

export interface TrendGame {
  appid: number;
  name: string;
  url: string;
  released?: string;
  free: boolean;
  price: number;
  reviews: number;
  positive: number | null;
  developer?: string;
  tags: string[];
  revenue: number;
  owners?: string;
  youtube?: { videos: number; views: number; top: { title: string; channel: string; views: number; url: string } | null };
}

export interface Genre {
  id: number;
  name: string;
  en: string;
  releases: number;
  traction: number;
  revenue: number;
  median: number;
  perRelease: number;
  positive: number | null;
  youtube: number;
  top: { appid: number; name: string; url: string; revenue: number } | null;
}

export interface RankEntry {
  rank: number;
  name: string;
  url: string;
  released?: string;
  free: boolean;
  price: number;
  indie: boolean;
  earlyAccess: boolean;
  isNew: boolean;
  tags: string[];
  peak?: number;
  weeks?: number;
  lastWeekRank?: number;
}

export interface Insights {
  by: 'ai' | 'rule';
  generatedAt?: string;
  model?: string;
  indie: { headline: string; points: string[] };
  market: { headline: string; points: string[] };
  ideas: { title: string; genres: string[]; why: string; scope: string; references: string[]; risks: string }[];
}

export interface MajorScore {
  score: number;
  outOf: number;
  outlet: string;
  count: number | null;
}

export interface MajorGame {
  name: string;
  released: string;
  platforms: string[];
  studio: string;
  critic: MajorScore | null;
  user: MajorScore | null;
  steam: { positive: number; reviews: number } | null;
  streams: { peak: number; scope: string; source: string } | null;
  sales: string | null;
  summary: string;
  sources: string[];
}

/** 대작 출시·평가 현황 (Claude 웹 검색, 며칠마다) */
export interface Majors {
  generatedAt: string;
  model: string;
  days: number;
  headline: string;
  games: MajorGame[];
  upcoming: { name: string; date: string; platforms: string[] }[];
  sourceTitles: Record<string, string>;
}

export interface TrendsReport {
  generatedAt: string;
  window: { days: number; from: string; to: string; complete: boolean };
  method: { reviewMultiplier: number; priceRealization: number; tractionReviews: number };
  /** 기간 안의 스팀 신작 전체 (인디 아닌 것 포함) */
  total: number;
  indie: { releases: number; paid: number; free: number; withTraction: number; genres: Genre[]; opportunities: Genre[]; topGames: TrendGame[] };
  market: {
    sellers: RankEntry[];
    mostPlayed: RankEntry[];
    mobileJP: { rank: number; name: string; publisher: string; url: string }[];
    summary: { sellers: number; newCount: number; freeCount: number; indieCount: number; earlyAccessCount: number; topTags: { name: string; count: number }[] };
  };
  insights: Insights;
  majors?: Majors | null;
  sources: { youtube: boolean };
}

/** scripts/trends/run.mjs 가 매일 갱신하는 리포트 */
export const trends = raw as unknown as TrendsReport;

export const usd = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);
export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
