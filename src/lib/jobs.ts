import raw from '../data/jobs.json';

export type PickType = 'match' | 'reach' | 'interest';
export type FitLevel = 'good' | 'maybe' | 'low';

export interface Fit {
  level: FitLevel;
  reason: string;
  /** 규칙 점수 (AI 평가에는 없음) */
  score?: number;
}

export interface Job {
  id: string;
  source: string;
  company: string;
  companyKey: string;
  title: string;
  location?: string;
  url: string;
  department?: string;
  postedAt?: string;
  deadline?: string;
  firstSeenAt: string;
  fit?: Fit & { family: string; score: number };
}

export interface Pick {
  type: PickType;
  jobId: string;
  reason: string;
  gaps: string[];
  tip: string;
}

export interface JobsData {
  updatedAt: string | null;
  jobs: Job[];
  recommendations: {
    generatedAt: string;
    model: string;
    inputHash: string;
    picks: Pick[];
    ratings?: Record<string, Fit>;
  } | null;
}

/** scripts/jobs/run.mjs 가 매일 갱신하는 데이터 */
export const jobsData = raw as unknown as JobsData;

export const FIT_LABELS: Record<FitLevel, string> = { good: '잘 맞음', maybe: '검토', low: '안 맞음' };
const FIT_ORDER: Record<FitLevel, number> = { good: 0, maybe: 1, low: 2 };

/** AI 평가가 있으면 그걸, 없으면 규칙 평가 */
export function fitOf(job: Job): (Fit & { by: 'ai' | 'rule' }) | undefined {
  const ai = jobsData.recommendations?.ratings?.[job.id];
  if (ai) return { ...ai, by: 'ai' };
  return job.fit ? { ...job.fit, by: 'rule' } : undefined;
}

/** 잘 맞는 순 → 규칙 점수 → 최신순 */
export function sortByFit(jobs: Job[]) {
  return [...jobs].sort((a, b) => {
    const fa = fitOf(a);
    const fb = fitOf(b);
    return (
      FIT_ORDER[fa?.level ?? 'low'] - FIT_ORDER[fb?.level ?? 'low'] ||
      (b.fit?.score ?? 0) - (a.fit?.score ?? 0) ||
      (b.postedAt ?? '').localeCompare(a.postedAt ?? '')
    );
  });
}

export const PICK_LABELS: Record<PickType, string> = {
  match: '적정 지원',
  reach: '상향 지원',
  interest: '관심 기업',
};

export const SOURCE_LABELS: Record<string, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  smartrecruiters: 'SmartRecruiters',
  ashby: 'Ashby',
  manual: '직접 추가',
};
