// 기술 일기 → 포트폴리오 · 자기소개서 (exports/ 폴더, 커밋되지 않음)
//
//   npm run export                         기본 포트폴리오 + 한국어 AI 포트폴리오·자소서
//   npm run export -- --lang ja            일본어 (ES: 志望動機 · 自己PR · ガクチカ)
//   npm run export -- --lang en            영어 (Cover letter)
//   npm run export -- --rec reach          오늘 추천된 '상향 지원' 공고에 맞춰서 (match | reach | interest)
//   npm run export -- --job <공고 id>       특정 공고에 맞춰서 (id 는 src/data/jobs.json)
//   npm run export -- --questions q.txt    문항 직접 지정 (한 줄에 하나, 예: "지원 동기 (1000자)")
//   npm run export -- --only letter        portfolio | letter 중 하나만
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import jobsConfig from '../../config/jobs.mjs';
import profile from '../../config/profile.mjs';
import { buildPortfolio } from '../../src/lib/portfolio.mjs';
import { aiEnabled, generateObject, generateText, MODEL } from '../lib/ai.mjs';
import { loadDiary } from '../lib/diary.mjs';
import { kstDate, readJson, writeText } from '../lib/util.mjs';
import { enrichDescriptions, fetchCompanyJobs, manualJobs } from '../jobs/sources.mjs';
import {
  AnswersSchema, buildLetterPrompt, buildPortfolioPrompt, DEFAULT_QUESTIONS, diaryForPrompt, LANGS, renderBasePortfolio, renderLetter,
} from './prompts.mjs';

const { values: args } = parseArgs({
  options: {
    lang: { type: 'string', default: 'ko' },
    job: { type: 'string' },
    rec: { type: 'string' },
    questions: { type: 'string' },
    only: { type: 'string' },
  },
});
if (!(args.lang in LANGS)) throw new Error(`--lang 은 ${Object.keys(LANGS).join(' | ')} 중 하나`);

const date = kstDate();
const entries = await loadDiary();

// 1) 기본 포트폴리오 — AI 없이 항상 만든다
await writeText('exports/portfolio.md', renderBasePortfolio(profile, buildPortfolio(entries, profile.skills), date));
console.log(`✓ exports/portfolio.md (기술 일기 ${entries.length}개)`);

if (!aiEnabled()) {
  console.log('\n다국어 포트폴리오·자소서는 ANTHROPIC_API_KEY 가 필요해요. .env.example 을 .env 로 복사해서 키를 넣으세요.');
  process.exit(0);
}
if (entries.length === 0) {
  console.log('\n공개된 기술 일기가 없어서 AI 문서는 만들지 않았어요. (draft: true 인 글은 제외돼요)');
  process.exit(0);
}

// 2) 맞춤 대상 공고
const job = await resolveJob(args);
if (job) console.log(`대상 공고: ${job.company} — ${job.title}`);
const diaryText = diaryForPrompt(entries);
const suffix = job ? `.${job.company.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}` : '';
const tasks = [];

// 3) AI 포트폴리오 · 자소서 (동시에 생성)
if (args.only !== 'letter') {
  tasks.push(
    (async () => {
      const markdown = await generateText({ ...buildPortfolioPrompt({ profile, diaryText, job, lang: args.lang }), effort: 'high' });
      const path = `exports/portfolio.${args.lang}${suffix}.md`;
      await writeText(path, markdown);
      console.log(`✓ ${path}`);
    })(),
  );
}
if (args.only !== 'portfolio') {
  const questions = args.questions
    ? (await readFile(args.questions, 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : DEFAULT_QUESTIONS[args.lang];
  tasks.push(
    (async () => {
      const { answers } = await generateObject({
        ...buildLetterPrompt({ profile, diaryText, job, lang: args.lang, questions }),
        schema: AnswersSchema,
        effort: 'high',
        maxTokens: 64_000,
      });
      const path = `exports/cover-letter.${args.lang}${suffix}.md`;
      await writeText(path, renderLetter({ answers, lang: args.lang, job, model: MODEL, entryCount: entries.length, date }));
      console.log(`✓ ${path}`);
    })(),
  );
}
await Promise.all(tasks);

/** --job / --rec → 공고 (본문은 원본 API 에서 다시 가져온다) */
async function resolveJob({ job: jobId, rec }) {
  if (!jobId && !rec) return null;
  const data = await readJson('src/data/jobs.json', { jobs: [], recommendations: null });
  const id = jobId ?? data.recommendations?.picks.find((pick) => pick.type === rec)?.jobId;
  if (!id) throw new Error(`'${rec}' 추천이 아직 없어요. npm run jobs 를 먼저 실행하거나 --job 으로 지정하세요.`);

  if (id.startsWith('manual:')) {
    const manual = manualJobs(jobsConfig.manual).find((j) => j.id === id);
    if (!manual) throw new Error(`config/jobs.mjs 의 manual 에 ${id} 공고가 없어요.`);
    return manual;
  }
  const stored = data.jobs.find((j) => j.id === id);
  if (!stored) throw new Error(`src/data/jobs.json 에 ${id} 공고가 없어요.`);
  const company = jobsConfig.companies.find((c) => `${c.ats}:${c.id}` === stored.companyKey);
  if (!company) return stored;
  const fresh = (await fetchCompanyJobs(company)).find((j) => j.id === id);
  if (!fresh) {
    console.warn('원본에서 공고를 찾지 못했어요 (마감됐을 수 있음). 저장된 정보로만 작성합니다.');
    return stored;
  }
  await enrichDescriptions([fresh]);
  return fresh;
}
