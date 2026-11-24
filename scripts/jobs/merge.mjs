// 공고 필터 · 병합 · 추천 후보 고르기 (순수 함수)

const lower = (value) => String(value ?? '').toLowerCase();
const containsAny = (text, words) => words.some((word) => lower(text).includes(lower(word)));

/** config/jobs.mjs 의 filters 적용 */
export function matchesFilters(job, { locations = [], roles = [], exclude = [] } = {}) {
  if (locations.length && !containsAny(job.location, locations)) return false;
  if (roles.length && !containsAny(job.title, roles)) return false;
  if (exclude.length && containsAny(job.title, exclude)) return false;
  return true;
}

/** today: 'YYYY-MM-DD' */
export const isExpired = (job, today) => Boolean(job.deadline && job.deadline < today);

/**
 * 이번 수집 결과를 이전 데이터와 합친다.
 * - 수집에 성공한 회사: 이번 결과로 교체하되 처음 본 시각(firstSeenAt)은 유지
 * - 수집에 실패한 회사: 이전 공고를 그대로 둔다 (일시적인 장애로 목록이 비지 않게)
 */
export function mergeJobs(previous, fetched, failedCompanies, now) {
  const firstSeen = new Map(previous.map((job) => [job.id, job.firstSeenAt]));
  const fresh = fetched.map((job) => ({ ...job, firstSeenAt: firstSeen.get(job.id) ?? now }));
  const kept = previous.filter((job) => failedCompanies.has(job.companyKey));

  const seen = new Set();
  const merged = [];
  for (const job of [...fresh, ...kept]) {
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    merged.push(job);
  }
  const sortKey = (job) => job.postedAt ?? job.firstSeenAt;
  return merged.sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || a.id.localeCompare(b.id));
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 영문자 경계만 본다: 'Go' 가 'Google' 에 걸리지 않고, 'Unity' 는 'Unityエンジニア' 에 걸린다 */
const keywordPattern = (word) => new RegExp(`(?<![A-Za-z0-9+#])${escapeRegExp(word)}(?![A-Za-z0-9+#])`, 'i');

/**
 * AI 에게 보낼 후보를 고른다: 기술 키워드 점수 상위 limit 개 + 관심 기업 공고(최대 10개).
 * 공고가 많아도 프롬프트 크기와 비용을 일정하게 유지하기 위함.
 */
export function rankCandidates(jobs, { skills = [], interestCompanies = [] } = {}, limit = 40) {
  const patterns = [...new Set(skills.map((s) => s.trim()).filter(Boolean))].map(keywordPattern);
  const interest = new Set(interestCompanies.map(lower));

  const scored = jobs.map((job) => {
    const body = `${job.department ?? ''}\n${job.description ?? ''}`;
    const score = patterns.reduce((sum, re) => sum + (re.test(job.title) ? 3 : 0) + (re.test(body) ? 1 : 0), 0);
    return { ...job, score, interest: interest.has(lower(job.company)) };
  });
  scored.sort((a, b) => b.score - a.score || (b.postedAt ?? '').localeCompare(a.postedAt ?? ''));

  const top = scored.slice(0, limit);
  const extra = scored.slice(limit).filter((job) => job.interest).slice(0, 10);
  return [...top, ...extra];
}
