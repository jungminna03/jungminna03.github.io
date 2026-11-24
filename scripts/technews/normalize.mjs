// 카드뉴스 원본 카드 → 사이트에서 쓰는 형태 (README·초록 원문 같은 큰 필드는 버린다)

export const KIND_LABELS = { repo: 'GitHub 트렌딩', paper: '오늘의 논문', trending: '주목받는 논문 · 코드 공개' };

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
const link = (v) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : undefined);

/** @param {any} card */
export function normalizeCard(card) {
  const detail = card.detail ?? {};
  return {
    id: text(card.id),
    date: text(card.date),
    kind: KIND_LABELS[card.kind] ? card.kind : 'paper',
    rank: num(card.rank),
    score: num(card.score) ?? 0,
    title: text(card.title),
    url: link(card.url),
    arxiv: link(card.arxiv),
    code: link(card.code),
    lang: text(card.lang) || undefined,
    stars: num(card.stars),
    gain: num(card.gain),
    oneLine: text(card.one_line) || text(card.desc),
    points: list(card.points),
    why: text(card.why),
    overview: text(detail.overview),
    features: list(detail.features),
    how: text(detail.how),
    useCases: list(detail.use_cases),
    caveats: text(detail.caveats),
  };
}

/** 하루치 카드 목록 → 종류별(저장소·논문·주목 논문) 점수순 */
export function normalizeDay(date, cards) {
  const order = Object.keys(KIND_LABELS);
  const normalized = (Array.isArray(cards) ? cards : []).map(normalizeCard).filter((c) => c.id && c.title);
  normalized.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.score - a.score);
  return { date, cards: normalized };
}
