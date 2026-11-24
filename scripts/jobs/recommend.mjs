// 포트폴리오(기술 일기)에 맞춰 적정 지원 · 상향 지원 · 관심 기업 세 곳을 고른다.
import { z } from 'zod';
import { generateObject } from '../lib/ai.mjs';
import { markdownToText } from '../lib/diary.mjs';
import { truncate } from '../lib/util.mjs';

export const PICK_TYPES = ['match', 'reach', 'interest'];

const ResultSchema = z.object({
  picks: z.array(
    z.object({
      type: z.enum(PICK_TYPES).describe('match = 적정 지원, reach = 상향 지원, interest = 관심 기업'),
      jobId: z.string().describe('후보 공고의 [id] 값을 그대로'),
      reason: z.string().describe('추천 이유. 공고 요구사항과 지원자 기록을 연결해서 한국어 2~3문장'),
      gaps: z.array(z.string()).describe('지원 전에 보완하면 좋은 점. 한국어로 최대 3개'),
      tip: z.string().describe('이력서·자소서에서 강조할 점 한 문장 (한국어)'),
    }),
  ),
  ratings: z
    .array(
      z.object({
        jobId: z.string().describe('후보 공고의 [id] 값을 그대로'),
        fit: z.enum(['good', 'maybe', 'low']).describe('good = 잘 맞음, maybe = 검토해볼 만함, low = 안 맞음'),
        reason: z.string().describe('판단 이유 한 줄 (한국어 45자 이내). 맞는 점이나 걸리는 점을 구체적으로'),
      }),
    )
    .describe('모든 후보 공고에 대한 적합도'),
});

const SYSTEM =
  '너는 일본과 해외 게임·IT 업계 채용 사정에 밝은 커리어 코치다. ' +
  '한국인 지원자의 프로필과 기술 일기를 보고 지원할 공고를 골라 준다. 설명은 한국어로 짧고 구체적으로 쓴다.';

/** 기술 일기 → 프롬프트용 요약 (최근 max 개) */
export function buildDigest(entries, max = 30) {
  if (!entries.length) return '(아직 기술 일기 기록이 없음)';
  return entries
    .slice(0, max)
    .map((entry) =>
      [
        `- ${entry.date.toISOString().slice(0, 10)} ${entry.project ? `[${entry.project}] ` : ''}${entry.title}`,
        entry.highlight && `  성과: ${entry.highlight}`,
        entry.skills.length > 0 && `  기술: ${entry.skills.join(', ')}`,
        `  내용: ${truncate(markdownToText(entry.body), 240)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');
}

export function buildRecommendPrompt({ profile, skills, digest, candidates }) {
  const applicant = {
    희망직무: profile.targetRoles,
    경력: profile.experience,
    희망지역: profile.targetLocations,
    언어: profile.languages.map((l) => `${l.name} ${l.level}`),
    학력: profile.education,
    기술: skills.slice(0, 25),
    관심기업: profile.interestCompanies,
    메모: profile.notes || undefined,
  };
  const jobs = candidates
    .map((job) =>
      [
        `[${job.id}]${job.interest ? ' ★관심 기업' : ''}`,
        `${job.company} — ${job.title}`,
        [job.location, job.department, job.postedAt?.slice(0, 10)].filter(Boolean).join(' | '),
        job.description ? truncate(job.description.replace(/\s+/g, ' '), 700) : '(본문 없음)',
      ].join('\n'),
    )
    .join('\n\n');

  return `## 지원자 프로필
${JSON.stringify(applicant, null, 2)}

## 기술 일기 요약 (최근순)
${digest}

## 후보 공고 (${candidates.length}건)
${jobs}

## 할 일
위 후보 중에서 아래 세 종류를 하나씩 골라라. 세 추천은 서로 다른 공고여야 한다.
- match (적정 지원): 지원자가 기록한 경험·기술로 요구사항 대부분을 충족해서 합격 가능성이 현실적인 공고
- reach (상향 지원): 요구 수준은 지원자보다 높지만 기록된 강점으로 도전해볼 만한 공고
- interest (관심 기업): ★관심 기업 표시가 있는 공고 중 가장 잘 맞는 것. 그런 공고가 없으면 생략
알맞은 공고가 없는 종류는 억지로 채우지 말고 생략한다.

그리고 ratings 에 **모든 후보 공고**의 적합도(good / maybe / low)와 한 줄 이유를 적어라.
- 희망 직무가 1순위지만, 기술 일기·프로필에 근거가 있으면 다른 직무(툴 프로그래머 등)도 good / maybe 로 매겨도 된다.
- 지원자의 경력 수준에 비해 요구 경력이 크게 높으면 low 로 매기고 이유에 적는다.

판단 근거는 공고 본문과 지원자 기록뿐이다. 기록에 없는 경력·능력을 가정하지 말고, 신입/경력 요건과 언어 요건(일본어·영어)을 꼭 따져라.`;
}

/** AI 적합도 검증: 후보에 없는 id·중복은 버리고 { [jobId]: { level, reason } } 로 */
export function validateRatings(ratings, candidates) {
  const ids = new Set(candidates.map((job) => job.id));
  const result = {};
  for (const { jobId, fit, reason } of ratings) {
    if (!ids.has(jobId) || result[jobId]) continue;
    result[jobId] = { level: fit, reason: reason.trim() };
  }
  return result;
}

/** AI 응답 검증: 후보에 없는 id, 중복 공고·종류, 관심 기업이 아닌 interest 는 버린다 */
export function validatePicks(picks, candidates) {
  const byId = new Map(candidates.map((job) => [job.id, job]));
  const usedJobs = new Set();
  const usedTypes = new Set();
  const valid = [];
  for (const pick of picks) {
    const job = byId.get(pick.jobId);
    if (!job || usedJobs.has(pick.jobId) || usedTypes.has(pick.type)) continue;
    if (pick.type === 'interest' && !job.interest) continue;
    usedJobs.add(pick.jobId);
    usedTypes.add(pick.type);
    valid.push({ type: pick.type, jobId: pick.jobId, reason: pick.reason.trim(), gaps: pick.gaps.slice(0, 3), tip: pick.tip.trim() });
  }
  return valid.sort((a, b) => PICK_TYPES.indexOf(a.type) - PICK_TYPES.indexOf(b.type));
}

export async function recommend(input) {
  const result = await generateObject({
    system: SYSTEM,
    prompt: buildRecommendPrompt(input),
    schema: ResultSchema,
    effort: 'medium',
  });
  return {
    picks: validatePicks(result.picks, input.candidates),
    ratings: validateRatings(result.ratings, input.candidates),
  };
}
