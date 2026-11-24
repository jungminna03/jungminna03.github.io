// @ts-check
/**
 * 기술 일기 → 포트폴리오 데이터. /portfolio 페이지와 export 스크립트가 함께 쓴다.
 *
 * @typedef {{ id: string, title: string, date: Date, tags: string[], project?: string, period?: string, skills: string[], highlight?: string }} Entry
 * @typedef {{ name: string, count: number }} Tally
 * @typedef {{ text: string, entry: Entry }} Highlight
 * @typedef {{ name: string, entries: Entry[], from: Date, to: Date, period?: string, skills: string[], highlights: Highlight[] }} Project
 */

/**
 * 대소문자를 무시하고 센다 (표시는 'unity' 보다 'Unity' 처럼 대문자가 섞인 표기 우선). 같은 글 안의 중복은 한 번만 센다.
 * @param {string[][]} lists
 * @returns {Tally[]}
 */
function tally(lists) {
  /** @type {Map<string, Tally>} */
  const counts = new Map();
  for (const list of lists) {
    for (const raw of new Set(list)) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const item = counts.get(key) ?? { name, count: 0 };
      if (item.name === key && name !== key) item.name = name;
      item.count += 1;
      counts.set(key, item);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * 기간 문자열 → 정렬 키 { end, start } (YYYYMM). '진행 중'이면 end 가 가장 크다. 날짜가 없으면 null
 * @param {string | undefined} period
 */
const periodKey = (period) => {
  const dates = [...(period ?? '').matchAll(/(\d{4})\.(\d{1,2})/g)].map((m) => Number(m[1]) * 100 + Number(m[2]));
  if (!dates.length) return null;
  const ongoing = /진행|현재|now|present/i.test(period ?? '');
  return { start: dates[0], end: ongoing ? 999999 : dates[dates.length - 1] };
};

/** @param {Entry} entry @returns {Highlight[]} */
const highlightOf = (entry) => (entry.highlight ? [{ text: entry.highlight, entry }] : []);

/**
 * @param {Entry[]} entries 최신순
 * @param {string[]} [extraSkills] 프로필에 직접 적은 기술
 */
export function buildPortfolio(entries, extraSkills = []) {
  /** @type {Map<string, Entry[]>} */
  const groups = new Map();
  for (const entry of entries) {
    if (entry.project) groups.set(entry.project, [...(groups.get(entry.project) ?? []), entry]);
  }

  /** @type {Project[]} */
  const projects = [...groups].map(([name, list]) => {
    const sorted = [...list].sort((a, b) => a.date.valueOf() - b.date.valueOf());
    return {
      name,
      entries: sorted,
      from: sorted[0].date,
      to: sorted[sorted.length - 1].date,
      period: sorted.find((e) => e.period)?.period,
      skills: tally(sorted.map((e) => e.skills)).map((t) => t.name),
      highlights: sorted.flatMap(highlightOf),
    };
  });
  // 최근에 한 프로젝트가 위로: 진행 중 → 끝난 시점 최신순 → 시작 시점 최신순.
  // period 가 없으면 일기 날짜로, period 에 날짜가 없으면('교내 동아리' 등) 맨 뒤
  const ym = (/** @type {Date} */ d) => d.getFullYear() * 100 + d.getMonth() + 1;
  const keyOf = (/** @type {Project} */ p) => (p.period ? (periodKey(p.period) ?? { start: -1, end: -1 }) : { start: ym(p.from), end: ym(p.to) });
  projects.sort((a, b) => keyOf(b).end - keyOf(a).end || keyOf(b).start - keyOf(a).start || b.to.valueOf() - a.to.valueOf());

  return {
    count: entries.length,
    skills: tally([...entries.map((e) => e.skills), extraSkills]),
    topics: tally(entries.map((e) => e.tags)),
    projects,
    highlights: entries.flatMap(highlightOf),
  };
}
