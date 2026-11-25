// 포트폴리오 · 자기소개서 export 용 프롬프트와 Markdown 렌더링 (순수 함수)
import { z } from 'zod';
import { groupSkills } from '../../src/lib/portfolio.mjs';

export const LANGS = { ko: '한국어', ja: '日本語', en: 'English' };

/** --questions 파일이 없을 때 쓰는 기본 문항 */
export const DEFAULT_QUESTIONS = {
  ko: [
    '지원 동기 (700자 이내)',
    '직무 관련 경험과 역량 — 프로젝트 중심으로 (1000자 이내)',
    '어려운 문제를 해결한 경험 (700자 이내)',
    '입사 후 포부 (500자 이내)',
  ],
  ja: ['志望動機（400字以内）', '自己PR（400字以内）', '学生時代に力を入れたこと（400字以内）'],
  en: ['Cover letter (about 300–400 words)'],
};

const LETTER_TITLE = { ko: '자기소개서', ja: 'エントリーシート', en: 'Cover Letter' };
const LETTER_STYLE = {
  ko: '한국 기업 자기소개서 문체(~습니다)',
  ja: '日本の新卒エントリーシートの文体（です・ます調）',
  en: 'a professional cover letter tone',
};

export const AnswersSchema = z.object({
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
});

const ymd = (date) => date.toISOString().slice(0, 10);
const ym = (date) => ymd(date).slice(0, 7);

/** { Steam: 'https://…' } → 한 줄 (링크가 없으면 '') */
const joinLinks = (links, format, sep) =>
  Object.entries(links ?? {})
    .map(([label, href]) => format(label, href))
    .join(sep);

export function diaryForPrompt(entries) {
  return entries
    .map((entry) => {
      const links = joinLinks(entry.links, (label, href) => `${label} ${href}`, ', ');
      return [
        `### ${ymd(entry.date)} · ${entry.title}`,
        [
          entry.project && `프로젝트: ${entry.project}`,
          entry.summary && `개요: ${entry.summary}`,
          entry.period && `기간: ${entry.period}`,
          entry.team && `팀: ${entry.team}`,
          entry.role && `역할: ${entry.role}`,
          entry.skills.length > 0 && `기술: ${entry.skills.join(', ')}`,
          entry.highlight && `성과: ${entry.highlight}`,
          links && `링크: ${links}`,
        ]
          .filter(Boolean)
          .join(' | '),
        entry.body,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function profileForPrompt(profile) {
  return JSON.stringify(
    {
      이름: profile.name,
      소개: profile.headline,
      지역: profile.location,
      학력: profile.education,
      언어: profile.languages,
      기술: profile.skills,
      희망직무: profile.targetRoles,
      희망지역: profile.targetLocations,
      메모: profile.notes || undefined,
    },
    null,
    2,
  );
}

function jobForPrompt(job) {
  if (!job) return '(특정 공고 없음 — 희망 직무 기준으로 작성)';
  return [`회사: ${job.company}`, `직무: ${job.title}`, job.location && `근무지: ${job.location}`, `링크: ${job.url}`, '', job.description || '(공고 본문 없음)']
    .filter((line) => line !== undefined && line !== false)
    .join('\n');
}

const RULES = `- 기술 일기에 실제로 기록된 경험만 쓴다. 기록에 없는 경력·수치·수상·역할을 지어내지 않는다.
- 근거가 부족한 부분은 [확인 필요: ...] 로 표시해서 지원자가 직접 채우게 한다.
- 공고가 주어지면 공고의 요구사항과 지원자의 경험을 구체적으로 연결한다.`;

const context = ({ profile, diaryText, job }) => `## 지원자 프로필
${profileForPrompt(profile)}

## 지원 공고
${jobForPrompt(job)}

## 기술 일기
${diaryText}`;

export function buildPortfolioPrompt({ profile, diaryText, job, lang }) {
  return {
    system: `너는 게임·IT 업계 채용 서류를 잘 아는 포트폴리오 에디터다. 지원자의 기술 일기를 채용 담당자가 읽기 좋은 포트폴리오 문서로 바꾼다. 결과물은 ${LANGS[lang]}로 쓴다.`,
    prompt: `${context({ profile, diaryText, job })}

## 할 일
위 기록으로 포트폴리오를 Markdown 문서 하나로 작성하라 (설명 없이 문서만 출력).
구성:
1. 한 줄 소개와 요약 (3문장 이내)
2. 기술 스택 — 기록에서 확인되는 것만, 어디에 썼는지와 함께
3. 프로젝트별: 한 줄 개요 / 기간·팀 규모·맡은 역할 / 문제와 해결 과정 / 결과 / 사용 기술 / 링크 (기록에 있는 것만, 주소는 그대로)
4. 그 밖에 배운 것 (짧게)
${RULES}`,
  };
}

export function buildLetterPrompt({ profile, diaryText, job, lang, questions }) {
  return {
    system: `너는 일본·해외 게임 업계 채용 서류 첨삭 전문가다. 지원자의 기술 일기를 근거로 지원 서류 문항에 답한다. 답변은 ${LANGS[lang]}로, ${LETTER_STYLE[lang]}로 쓴다.`,
    prompt: `${context({ profile, diaryText, job })}

## 문항
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## 할 일
각 문항에 답하라. answers 의 question 에는 문항을 그대로 적는다.
- 문항에 글자 수 제한이 있으면 반드시 지키고 제한의 90~100% 를 채운다. 제한이 없으면 600자 안팎으로 쓴다.
- 문항마다 다른 경험을 써서 내용이 겹치지 않게 한다.
${RULES}`,
  };
}

const countChars = (text) => ({ withSpaces: [...text].length, withoutSpaces: [...text.replace(/\s/g, '')].length });

export function renderLetter({ answers, lang, job, model, entryCount, date }) {
  const title = `# ${LETTER_TITLE[lang]}${job ? ` — ${job.company} · ${job.title}` : ''}`;
  const note = `> ${date} · ${model} · 기술 일기 ${entryCount}개 기반 초안. 사실관계와 글자 수를 꼭 확인하세요.`;
  const body = answers.map(({ question, answer }, i) => {
    const { withSpaces, withoutSpaces } = countChars(answer.trim());
    return `## ${i + 1}. ${question}\n\n${answer.trim()}\n\n<sub>공백 포함 ${withSpaces}자 · 공백 제외 ${withoutSpaces}자</sub>`;
  });
  return [title, note, ...body].join('\n\n');
}

/** AI 없이 일기 frontmatter 만으로 만드는 기본 포트폴리오 */
export function renderBasePortfolio(profile, portfolio, date) {
  const out = [`# ${profile.name} — 포트폴리오`, '', ...(profile.headline ? [`**${profile.headline}**`, ''] : []), profile.intro, ''];
  out.push(
    ...[
      profile.email && `- 이메일: ${profile.email}`,
      profile.phone && `- 전화: ${profile.phone}`,
      profile.location && `- 지역: ${profile.location}`,
      profile.languages.length > 0 && `- 언어: ${profile.languages.map((l) => `${l.name} (${l.level})`).join(', ')}`,
      ...profile.education.map((e) => `- 학력: ${[e.school, e.major, e.period].filter(Boolean).join(' · ')}`),
      ...Object.entries(profile.links).map(([label, href]) => `- ${label}: ${href}`),
    ].filter(Boolean),
    '',
  );
  if (portfolio.highlights.length) {
    out.push('## 핵심 성과', '', ...portfolio.highlights.map((h) => `- ${h.text} (${ymd(h.entry.date)})`), '');
  }
  for (const [i, project] of portfolio.projects.entries()) {
    if (i === 0) out.push('## 프로젝트', '');
    const links = joinLinks(project.links, (label, href) => `[${label}](${href})`, ' · ');
    out.push(`### ${project.name}`, '');
    if (project.summary) out.push(project.summary, '');
    out.push(
      ...[
        `- 기간: ${project.period ?? `${ym(project.from)} – ${ym(project.to)}`}`,
        project.team && `- 팀: ${project.team}`,
        project.role && `- 역할: ${project.role}`,
        project.skills.length > 0 && `- 기술: ${project.skills.join(', ')}`,
        links && `- 링크: ${links}`,
      ].filter(Boolean),
      ...project.entries.map((e) => `- ${ymd(e.date)} ${e.title}${e.highlight ? ` — ${e.highlight}` : ''}`),
      '',
    );
  }
  const groups = groupSkills(profile.skillGroups ?? [], portfolio.skills);
  if (groups.length) {
    out.push('## 기술 스택', '', ...groups.map((g) => `- **${g.name}**: ${g.skills.join(', ')}`), '');
  }
  out.push('---', '', `기술 일기 ${portfolio.count}개에서 자동 생성 · ${date}`);
  return out.join('\n');
}
