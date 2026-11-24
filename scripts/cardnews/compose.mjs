// 기사 목록 → 카드뉴스 JSON (src/content/cardnews/*.json 형식)
import { z } from 'zod';
import { generateObject } from '../lib/ai.mjs';
import { truncate } from '../lib/util.mjs';

// 흰 글씨가 잘 보이는 진한 색만 쓴다. 날짜마다 돌아가며 바뀐다.
const PALETTE = ['#4f46e5', '#c2255c', '#0c8599', '#d9480f', '#2f9e44', '#1c7ed6', '#7048e8', '#e8590c'];
export const accentFor = (date) => PALETTE[Number(date.replaceAll('-', '')) % PALETTE.length];

const monthDay = (date) => {
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일`;
};

/** AI 없이: 매체를 돌아가며 최신 헤드라인을 하나씩 고른다. 언어(영·일·한)가 번갈아 나오게 매체 순서를 섞는다. */
export function composeHeadlines(items, { date, cards }) {
  const queues = new Map();
  for (const item of items) queues.set(item.feed, [...(queues.get(item.feed) ?? []), item]);
  const feedsByLang = new Map();
  for (const [feed, queue] of queues) feedsByLang.set(queue[0].lang, [...(feedsByLang.get(queue[0].lang) ?? []), feed]);
  const order = [];
  for (let i = 0; order.length < queues.size; i += 1) {
    for (const feeds of feedsByLang.values()) if (feeds[i]) order.push(feeds[i]);
  }

  const picked = [];
  while (picked.length < cards && [...queues.values()].some((queue) => queue.length)) {
    for (const feed of order) {
      const queue = queues.get(feed);
      if (queue.length && picked.length < cards) picked.push(queue.shift());
    }
  }
  return {
    title: `${monthDay(date)} 게임 업계 헤드라인`,
    date,
    summary: `${new Set(picked.map((item) => item.feed)).size}개 매체에서 고른 최신 소식 ${picked.length}건`,
    tags: [...new Set(picked.map((item) => item.feed))],
    accent: accentFor(date),
    mode: 'headlines',
    cards: picked.map((item) => ({
      title: item.title,
      body: item.summary ? truncate(item.summary, 140) : undefined,
      sources: [{ label: item.feed, title: item.title, url: item.link }],
    })),
  };
}

const CardNewsSchema = z.object({
  title: z.string().describe('표지 제목. 오늘의 흐름을 한마디로, 한국어 22자 이내'),
  summary: z.string().describe('표지 부제. 한국어 45자 이내'),
  tags: z.array(z.string()).describe('키워드 3~5개'),
  cards: z.array(
    z.object({
      title: z.string().describe('카드 제목. 한국어 20자 이내'),
      body: z.string().describe('카드 본문. 한국어 2~3문장, 150자 이내'),
      sourceIds: z.array(z.number().int()).describe('근거가 된 기사 번호 1~3개'),
    }),
  ),
});

const SYSTEM = '너는 게임 업계 뉴스를 카드뉴스로 정리하는 에디터다. 짧고 정확한 한국어로 쓰고, 기사에 근거한 내용만 쓴다.';

export function buildCardNewsPrompt(items, { date, cards, focus }) {
  const list = items
    .map((item, i) =>
      [`[${i}] ${item.feed} (${item.lang}${item.date ? `, ${item.date.slice(0, 10)}` : ''})`, `제목: ${item.title}`, `요약: ${truncate(item.summary || '-', 280)}`].join('\n'),
    )
    .join('\n\n');
  return `오늘은 ${date} 이다. 아래는 최근 하루 동안 한국·일본·영미권 게임 매체에 올라온 기사 ${items.length}건이다.

${list}

## 할 일
이 기사들로 '오늘의 게임 트렌드' 카드뉴스를 만든다. 독자는 일본·해외 게임 회사 취업을 준비하는 한국인 개발자다.
- 관심사: ${focus}
- 표지를 뺀 카드 ${cards}장. 카드마다 흐름 하나나 사건 하나를 다루고, 같은 주제의 기사는 한 카드로 묶는다.
- 공략·할인·굿즈 같은 단신보다 업계 흐름을 보여주는 기사를 먼저 고른다.
- sourceIds 에는 근거 기사 번호를 적는다.
- 기사에 없는 사실·수치·전망을 지어내지 않는다. 일본어·영어 기사는 한국어로 옮겨 쓴다.`;
}

/** AI 응답 → 카드뉴스. 기사 번호를 실제 링크로 바꾸고, 없는 번호는 버린다 */
export function toCardNews(output, items, { date, cards }) {
  const result = {
    title: output.title.trim(),
    date,
    summary: output.summary.trim(),
    tags: [...new Set(output.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 5),
    accent: accentFor(date),
    mode: 'ai',
    cards: output.cards.slice(0, cards).map((card) => ({
      title: card.title.trim(),
      body: card.body.trim(),
      sources: [...new Set(card.sourceIds)]
        .filter((i) => Number.isInteger(i) && items[i])
        .slice(0, 3)
        .map((i) => ({ label: items[i].feed, title: items[i].title, url: items[i].link })),
    })),
  };
  if (result.cards.length === 0) throw new Error('AI 가 카드를 만들지 않았습니다.');
  return result;
}

export async function composeWithAI(items, options) {
  const output = await generateObject({
    system: SYSTEM,
    prompt: buildCardNewsPrompt(items, options),
    schema: CardNewsSchema,
    effort: 'medium',
  });
  return toCardNews(output, items, options);
}
