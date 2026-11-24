import raw from '../data/jobs.json';

export type PickType = 'match' | 'reach' | 'interest';

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
  recommendations: { generatedAt: string; model: string; inputHash: string; picks: Pick[] } | null;
}

/** scripts/jobs/run.mjs 가 매일 갱신하는 데이터 */
export const jobsData = raw as unknown as JobsData;

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
