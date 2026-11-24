// 규칙 기반 적합도 — AI 없이도 공고마다 '잘 맞음 · 검토 · 안 맞음'과 이유를 붙인다.
// (ANTHROPIC_API_KEY 가 있으면 recommend.mjs 의 AI 평가가 이 값을 덮어쓴다)

const SENIOR =
  /\b(senior|sr\.|lead|principal|staff|director|head of|manager|architect)\b|シニア|リード|マネージャー|マネジャー|責任者|ディレクター|시니어|리드/i;
const ENTRY = /\b(intern|internship|graduate|new grad|entry[- ]level|junior|jr\.)\b|インターン|新卒|未経験|第二新卒|신입|인턴/i;

/** 위에서부터 먼저 걸리는 직군 하나 (공고 제목·부서, 프로필 희망 직무 모두에 쓴다) */
export const FAMILIES = [
  { key: 'techart', label: '테크니컬 아티스트', re: /technical artist|tech artist|テクニカルアーティスト|테크니컬 ?아티스트/i },
  {
    key: 'design',
    label: '게임 기획',
    re: /game designer|level designer|systems? designer|narrative designer|technical designer|planner|プランナー|ゲームデザイナー|レベルデザイナー|企画|기획/i,
  },
  {
    key: 'art',
    label: '아트',
    re: /artist|animator|\bvfx\b|modeler|illustrat|concept art|アーティスト|アニメーター|モデラー|イラスト|エフェクト|デザイナー|아트|아티스트|원화/i,
  },
  {
    key: 'client',
    label: '클라이언트·게임플레이',
    // \b 로 감싸야 Community 안의 'unity' 같은 오탐이 없다
    re: /\bclient\b|\bgameplay\b|\bgame ?(programmer|engineer|developer|development)\b|\bunity\b|\bunreal\b|クライアント|ゲームプログラマ|ゲームエンジニア|클라이언트|게임플레이/i,
  },
  {
    key: 'tools',
    label: '툴·엔진',
    // 'engine' 이 Engineer 에 걸리지 않게 \bengines?\b
    re: /\btools?\b|\bengines?\b|\beditor\b|pipeline|rendering|graphics|ツール|エンジン|レンダリング|グラフィックス|툴|엔진/i,
  },
  {
    key: 'server',
    label: '서버·인프라',
    re: /server|backend|back-end|infra|devops|\bsre\b|\bdata\b|security|anti-?cheat|サーバー|バックエンド|インフラ|セキュリティ|서버/i,
  },
  { key: 'programmer', label: '프로그래머', re: /engineer|programmer|developer|software|エンジニア|プログラマ|開発|프로그래머|개발/i },
];

const OTHER = { key: 'other', label: '비개발 직군' };

export const familyOf = (text) => FAMILIES.find((family) => family.re.test(text)) ?? OTHER;

// 희망 직무가 아닐 때의 기본 점수: 프로그래밍 계열은 포트폴리오 근거가 있으면 '검토'까지 올라간다
const NEIGHBOR_SCORE = { client: 2, tools: 2, programmer: 2, server: 1, techart: 1, design: 1, art: -2, other: -3 };

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const skillPattern = (skill) => new RegExp(`(?<![A-Za-z0-9+#])${escapeRegExp(skill)}(?![A-Za-z0-9+#])`, 'i');

// 직무명에 엔진이 박혀 있는데 그 엔진 경험이 없으면 감점 (예: Unity 개발자에게 'Unreal Engine Programmer')
const ENGINES = [
  { re: /\bunreal\b|\bue[45]\b|アンリアル/i, label: '언리얼', skills: ['unreal', 'unreal engine', 'c++'] },
  { re: /\bunity\b/i, label: 'Unity', skills: ['unity'] },
  { re: /\bgodot\b/i, label: 'Godot', skills: ['godot'] },
];

/**
 * @param {{ title: string, department?: string, description?: string }} job
 * @param {{ targetRoles: string[], experience: string, skills: string[] }} context
 * @returns {{ level: 'good' | 'maybe' | 'low', score: number, family: string, reason: string }}
 */
export function assessFit(job, { targetRoles = [], experience = '신입', skills = [] }) {
  const heading = `${job.title} ${job.department ?? ''}`;
  const family = familyOf(job.title) === OTHER ? familyOf(heading) : familyOf(job.title);
  const targets = new Set(targetRoles.map((role) => familyOf(role).key));
  const reasons = [];
  let score = 0;

  if (targets.has(family.key)) {
    score += 4;
    reasons.push(`희망 직무 (${family.label})`);
  } else {
    score += NEIGHBOR_SCORE[family.key];
    reasons.push(family.key === 'art' || family.key === 'other' ? `직군이 달라요 (${family.label})` : family.label);
  }

  const senior = SENIOR.test(job.title);
  if (senior && experience === '신입') {
    score -= 5;
    reasons.push('시니어·리드 직급이라 경력이 필요해요');
  } else if (senior && experience === '1~3년') {
    score -= 2;
    reasons.push('시니어 직급');
  } else if (ENTRY.test(job.title) && experience === '신입') {
    score += 2;
    reasons.push('신입·인턴 대상');
  }

  const mySkills = new Set(skills.map((skill) => skill.toLowerCase()));
  for (const engine of ENGINES) {
    if (engine.re.test(job.title) && !engine.skills.some((skill) => mySkills.has(skill))) {
      score -= 2;
      reasons.push(`${engine.label} 경험이 필요해요`);
    }
  }

  const matched = [...new Set(skills)].filter((skill) => skill && skillPattern(skill).test(`${heading}\n${job.description ?? ''}`));
  if (matched.length) {
    score += Math.min(4, matched.length + matched.filter((skill) => skillPattern(skill).test(job.title)).length);
    reasons.push(`기술 일치: ${matched.slice(0, 4).join(', ')}`);
  }

  const level = score >= 5 ? 'good' : score >= 2 ? 'maybe' : 'low';
  return { level, score, family: family.key, reason: reasons.join(' · ') };
}
