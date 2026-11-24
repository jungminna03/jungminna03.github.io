import raw from '../data/technews.json';

export type TechKind = 'repo' | 'paper' | 'trending';

export interface TechCard {
  id: string;
  date: string;
  kind: TechKind;
  rank?: number;
  score: number;
  title: string;
  url?: string;
  arxiv?: string;
  code?: string;
  lang?: string;
  stars?: number;
  gain?: number;
  oneLine: string;
  points: string[];
  why: string;
  overview: string;
  features: string[];
  how: string;
  useCases: string[];
  caveats: string;
}

/** scripts/technews/run.mjs 가 매일 갱신 (최신 날짜가 앞) */
export const technews = raw as unknown as { generatedAt: string; days: { date: string; cards: TechCard[] }[] };

export const KIND_LABELS: Record<TechKind, string> = { repo: 'GitHub 트렌딩', paper: '오늘의 논문', trending: '주목받는 논문 · 코드 공개' };
