// 채용 공고 수집 → 병합 → AI 추천 → src/data/jobs.json
// 실행: npm run jobs   (GitHub Actions 가 매일 실행)
import config from '../../config/jobs.mjs';
import profile from '../../config/profile.mjs';
import { buildPortfolio } from '../../src/lib/portfolio.mjs';
import { aiEnabled, MODEL } from '../lib/ai.mjs';
import { loadDiary } from '../lib/diary.mjs';
import { kstDate, readJson, sha1, warn, writeJson } from '../lib/util.mjs';
import { isExpired, matchesFilters, mergeJobs, rankCandidates } from './merge.mjs';
import { buildDigest, recommend } from './recommend.mjs';
import { enrichDescriptions, fetchCompanyJobs, manualJobs } from './sources.mjs';

const OUTPUT = 'src/data/jobs.json';
const now = new Date().toISOString();
const previous = await readJson(OUTPUT, { updatedAt: null, jobs: [], recommendations: null });
let failed = false;

// 1) 수집 + 필터
const fetched = [];
const failedCompanies = new Set();
for (const company of config.companies) {
  try {
    const all = await fetchCompanyJobs(company);
    const jobs = all.filter((job) => matchesFilters(job, config.filters));
    fetched.push(...jobs);
    console.log(`✓ ${company.name}: ${jobs.length}건 (전체 ${all.length}건)`);
  } catch (err) {
    failed = true;
    failedCompanies.add(`${company.ats}:${company.id}`);
    warn(`${company.name} 수집 실패 — 이전 공고 유지: ${err.message}`);
  }
}
const manual = manualJobs(config.manual).filter((job) => !isExpired(job, kstDate()));
if (manual.length) console.log(`✓ 직접 추가: ${manual.length}건`);
fetched.push(...manual);
await enrichDescriptions(fetched);

const jobs = mergeJobs(previous.jobs, fetched, failedCompanies, now);

// 2) AI 추천 (후보·프로필·일기가 어제와 같으면 다시 부르지 않는다)
let recommendations = previous.recommendations;
if (!aiEnabled()) {
  console.log('ANTHROPIC_API_KEY 가 없어서 AI 추천은 건너뜁니다.');
} else if (jobs.length === 0) {
  recommendations = null;
} else {
  const diary = await loadDiary();
  const skills = buildPortfolio(diary, profile.skills).skills.map((s) => s.name);
  const candidates = rankCandidates(jobs, { skills, interestCompanies: profile.interestCompanies });
  const digest = buildDigest(diary);
  const inputHash = sha1({ model: MODEL, profile, digest, ids: candidates.map((job) => job.id).sort() });

  if (inputHash === previous.recommendations?.inputHash) {
    console.log('후보·프로필·일기 변화 없음 — 이전 추천 유지');
  } else {
    try {
      const picks = await recommend({ profile, skills, digest, candidates });
      recommendations = { generatedAt: now, model: MODEL, inputHash, picks };
      console.log(`✓ AI 추천 ${picks.length}건 (${picks.map((p) => p.type).join(', ') || '없음'})`);
    } catch (err) {
      failed = true;
      warn(`AI 추천 실패 — 이전 추천 유지: ${err.message}`);
    }
  }
}

// 3) 내용이 바뀌었을 때만 저장 (매일 빈 커밋이 생기지 않게)
const stored = jobs.map(({ description, ...job }) => job);
if (JSON.stringify([previous.jobs, previous.recommendations]) === JSON.stringify([stored, recommendations])) {
  console.log('변경 없음');
} else {
  await writeJson(OUTPUT, { updatedAt: now, jobs: stored, recommendations });
  console.log(`저장: ${OUTPUT} — 공고 ${stored.length}건`);
}
if (failed) process.exitCode = 1;
