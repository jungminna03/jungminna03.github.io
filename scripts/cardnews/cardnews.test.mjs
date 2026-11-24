import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accentFor, buildCardNewsPrompt, composeHeadlines, toCardNews } from './compose.mjs';
import { parseFeed } from './feeds.mjs';

test('parseFeed: RSS 2.0 (CDATA, 엔티티, 한국 시간)', () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
    <item><title><![CDATA[소니 &amp; 'GTA6']]></title><link>https://ex.com/1</link>
      <pubDate>2026-11-24 15:57:59</pubDate><description><![CDATA[<p>요약&nbsp;입니다</p>]]></description></item>
    <item><title>2026</title><link>https://ex.com/2</link></item>
    <item><title>링크 없음</title></item>
  </channel></rss>`;
  const items = parseFeed(xml, { defaultOffset: '+09:00' });
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { title: "소니 & 'GTA6'", link: 'https://ex.com/1', date: '2026-11-24T06:57:59.000Z', summary: '요약 입니다' });
  assert.equal(items[1].title, '2026');
});

test('parseFeed: RSS 1.0 (RDF)', () => {
  const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel rdf:about="https://ex.jp/"><title>JP</title></channel>
    <item rdf:about="https://ex.jp/a"><title>新作発表</title><link>https://ex.jp/a</link><dc:date>2026-11-24T16:10:20+09:00</dc:date></item>
  </rdf:RDF>`;
  assert.deepEqual(parseFeed(xml), [{ title: '新作発表', link: 'https://ex.jp/a', date: '2026-11-24T07:10:20.000Z', summary: '' }]);
});

test('parseFeed: Atom (alternate 링크)', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
    <entry><title type="html">Studio &amp;lt;b&amp;gt;layoffs&amp;lt;/b&amp;gt;</title>
      <link rel="self" href="https://ex.com/self"/><link rel="alternate" href="https://ex.com/post"/>
      <updated>2026-11-23T10:00:00Z</updated><summary>Short</summary></entry></feed>`;
  assert.deepEqual(parseFeed(xml), [{ title: 'Studio layoffs', link: 'https://ex.com/post', date: '2026-11-23T10:00:00.000Z', summary: 'Short' }]);
});

const items = [
  { feed: 'A', lang: 'en', title: 'a1', link: 'https://a/1', summary: 'x'.repeat(300) },
  { feed: 'A', lang: 'en', title: 'a2', link: 'https://a/2', summary: '' },
  { feed: 'B', lang: 'ja', title: 'b1', link: 'https://b/1', summary: 'b' },
];

test('composeHeadlines: 매체를 돌아가며 고르고 요약은 140자로', () => {
  const news = composeHeadlines(items, { date: '2026-11-24', cards: 3 });
  assert.deepEqual(news.cards.map((c) => c.title), ['a1', 'b1', 'a2']);
  assert.equal([...news.cards[0].body].length, 140);
  assert.equal(news.cards[2].body, undefined);
  assert.equal(news.title, '11월 24일 게임 업계 헤드라인');
  assert.equal(news.mode, 'headlines');
  assert.deepEqual(news.cards[1].sources, [{ label: 'B', title: 'b1', url: 'https://b/1' }]);
});

test('composeHeadlines: 설정 순서가 영·영·일·한이어도 언어가 번갈아 나온다', () => {
  const mixed = [
    { feed: 'E1', lang: 'en', title: 'e1', link: 'https://e/1' },
    { feed: 'E2', lang: 'en', title: 'e2', link: 'https://e/2' },
    { feed: 'J1', lang: 'ja', title: 'j1', link: 'https://j/1' },
    { feed: 'K1', lang: 'ko', title: 'k1', link: 'https://k/1' },
  ];
  assert.deepEqual(composeHeadlines(mixed, { date: '2026-11-24', cards: 3 }).cards.map((c) => c.title), ['e1', 'j1', 'k1']);
});

test('toCardNews: 기사 번호(0 포함)를 링크로, 없는 번호는 버림', () => {
  const news = toCardNews(
    { title: ' 제목 ', summary: '부제', tags: ['a', 'a', ' b '], cards: [{ title: '카드', body: '본문', sourceIds: [0, 0, 2, 99] }] },
    items,
    { date: '2026-11-24', cards: 6 },
  );
  assert.equal(news.title, '제목');
  assert.deepEqual(news.tags, ['a', 'b']);
  assert.deepEqual(news.cards[0].sources.map((s) => s.url), ['https://a/1', 'https://b/1']);
  assert.equal(news.mode, 'ai');
  assert.throws(() => toCardNews({ title: 't', summary: 's', tags: [], cards: [] }, items, { date: '2026-11-24', cards: 6 }));
});

test('buildCardNewsPrompt: 기사 번호와 관심사가 들어간다', () => {
  const prompt = buildCardNewsPrompt(items, { date: '2026-11-24', cards: 6, focus: '일본 시장' });
  assert.match(prompt, /\[0\] A \(en\)/);
  assert.match(prompt, /관심사: 일본 시장/);
  assert.match(prompt, /카드 6장/);
});

test('accentFor: 날짜마다 정해진 색', () => {
  assert.equal(accentFor('2026-11-24'), accentFor('2026-11-24'));
  assert.notEqual(accentFor('2026-11-24'), accentFor('2026-11-25'));
});
