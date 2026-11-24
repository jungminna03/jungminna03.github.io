import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPortfolio } from '../../src/lib/portfolio.mjs';
import { markdownToText, parseEntry } from './diary.mjs';
import { parseFeed } from './feeds.mjs';
import { decodeEntities, htmlToText, kstDate, toIso, truncate } from './util.mjs';

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

test('parseFeed: RSS 1.0 (RDF) 와 Atom', () => {
  const rdf = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel rdf:about="https://ex.jp/"><title>JP</title></channel>
    <item rdf:about="https://ex.jp/a"><title>新作発表</title><link>https://ex.jp/a</link><dc:date>2026-11-24T16:10:20+09:00</dc:date></item>
  </rdf:RDF>`;
  assert.deepEqual(parseFeed(rdf), [{ title: '新作発表', link: 'https://ex.jp/a', date: '2026-11-24T07:10:20.000Z', summary: '' }]);
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
    <entry><title type="html">Studio &amp;lt;b&amp;gt;layoffs&amp;lt;/b&amp;gt;</title>
      <link rel="self" href="https://ex.com/self"/><link rel="alternate" href="https://ex.com/post"/>
      <updated>2026-11-23T10:00:00Z</updated><summary>Short</summary></entry></feed>`;
  assert.deepEqual(parseFeed(atom), [{ title: 'Studio layoffs', link: 'https://ex.com/post', date: '2026-11-23T10:00:00.000Z', summary: 'Short' }]);
});

test('htmlToText: 이스케이프된 HTML(Greenhouse)과 일반 HTML 모두 평문으로', () => {
  assert.equal(htmlToText('&lt;p&gt;Hello &amp;amp; &lt;strong&gt;world&lt;/strong&gt;&lt;/p&gt;'), 'Hello & world');
  assert.equal(htmlToText('<ul><li>C++</li><li>Unity</li></ul>'), '• C++\n• Unity');
  assert.equal(htmlToText('<script>alert(1)</script>본문'), '본문');
  assert.equal(htmlToText(undefined), '');
});

test('decodeEntities: 숫자·이름 엔티티', () => {
  assert.equal(decodeEntities('&#39;GTA6&#x27; &quot;x&quot; &nbsp;&hellip;'), "'GTA6' \"x\"  …");
  assert.equal(decodeEntities('&unknown; &#99999999;'), '&unknown; &#99999999;');
});

test('toIso: 시간대 없는 한국 피드 날짜는 +09:00 으로', () => {
  assert.equal(toIso('2026-11-24 15:57:59', '+09:00'), '2026-11-24T06:57:59.000Z');
  assert.equal(toIso('Mon, 23 Nov 2026 20:56:00 +0000'), '2026-11-23T20:56:00.000Z');
  assert.equal(toIso(1764000000000), new Date(1764000000000).toISOString());
  assert.equal(toIso('not a date'), undefined);
  assert.equal(toIso(''), undefined);
});

test('truncate: 글자 단위로 자르고 말줄임표', () => {
  assert.equal(truncate('가나다라마', 10), '가나다라마');
  assert.equal(truncate('가나다라마', 4), '가나다…');
});

test('kstDate: 한국 시간 날짜', () => {
  assert.equal(kstDate(new Date('2026-11-23T22:00:00Z')), '2026-11-24');
});

test('parseEntry: frontmatter 와 본문 분리, id 는 소문자 슬러그', () => {
  const entry = parseEntry('2026-11-24 Object Pooling.md', '---\ntitle: 풀링\ndate: 2026-11-24\nskills: [Unity, C#]\nhighlight: GC 0B\n---\n\n본문입니다.\n');
  assert.equal(entry.id, '2026-11-24-object-pooling');
  assert.equal(entry.title, '풀링');
  assert.deepEqual(entry.skills, ['Unity', 'C#']);
  assert.equal(entry.highlight, 'GC 0B');
  assert.equal(entry.date.toISOString(), '2026-11-24T00:00:00.000Z');
  assert.equal(entry.body, '본문입니다.');
  assert.equal(entry.draft, false);
});

test('markdownToText: 코드·링크·헤더 정리', () => {
  assert.equal(markdownToText('## 제목\n[링크](http://x) 와 `code`\n```js\nlet a\n```'), '제목 링크 와 code [코드]');
});

test('buildPortfolio: 프로젝트별 묶기, 기술 대소문자 무시 집계, 성과 모으기', () => {
  const entry = (id, date, extra) => ({ id, title: id, date: new Date(date), tags: [], skills: [], ...extra });
  const portfolio = buildPortfolio(
    [
      entry('c', '2026-03-01', { project: '슈팅', skills: ['unity', 'C#'], highlight: '프레임 2배' }),
      entry('b', '2026-02-01', { tags: ['회고'] }),
      entry('a', '2026-01-01', { project: '슈팅', skills: ['Unity'] }),
    ],
    ['Git'],
  );
  assert.equal(portfolio.count, 3);
  assert.deepEqual(portfolio.skills.map((s) => [s.name, s.count]), [['Unity', 2], ['C#', 1], ['Git', 1]]);
  assert.deepEqual(portfolio.topics, [{ name: '회고', count: 1 }]);
  assert.equal(portfolio.projects.length, 1);
  assert.deepEqual(portfolio.projects[0].entries.map((e) => e.id), ['a', 'c']);
  assert.equal(portfolio.projects[0].from.toISOString().slice(0, 10), '2026-01-01');
  assert.deepEqual(portfolio.highlights.map((h) => h.text), ['프레임 2배']);
});
