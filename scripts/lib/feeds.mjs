// RSS 2.0 · RSS 1.0(RDF) · Atom 피드를 { title, link, date, summary } 로 통일한다.
import { XMLParser } from 'fast-xml-parser';
import { htmlToText, toIso } from './util.mjs';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false, // 제목이 '2026' 같은 숫자여도 문자열로
  htmlEntities: true,
  isArray: (name) => name === 'item' || name === 'entry',
});

const asArray = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);
const text = (value) => (value != null && typeof value === 'object' ? String(value['#text'] ?? '') : String(value ?? ''));

function atomLink(link) {
  const links = asArray(link);
  const best = links.find((l) => typeof l === 'object' && (l['@_rel'] ?? 'alternate') === 'alternate') ?? links[0];
  return best != null && typeof best === 'object' ? String(best['@_href'] ?? '') : text(best);
}

/** @param {string} xml @param {{ defaultOffset?: string }} [options] 시간대 없는 날짜의 기준 (한국·일본: '+09:00') */
export function parseFeed(xml, { defaultOffset = 'Z' } = {}) {
  const doc = parser.parse(xml);
  let raw = [];
  if (doc.rss) {
    raw = asArray(doc.rss.channel?.item).map((it) => ({
      title: it.title, link: text(it.link), date: it.pubDate ?? it['dc:date'], summary: it.description,
    }));
  } else if (doc['rdf:RDF']) {
    raw = asArray(doc['rdf:RDF'].item).map((it) => ({
      title: it.title, link: text(it.link) || it['@_rdf:about'], date: it['dc:date'], summary: it.description,
    }));
  } else if (doc.feed) {
    raw = asArray(doc.feed.entry).map((it) => ({
      title: it.title, link: atomLink(it.link), date: it.published ?? it.updated, summary: it.summary ?? it.content,
    }));
  }
  return raw
    .map((it) => ({
      title: htmlToText(text(it.title)),
      link: String(it.link ?? '').trim(),
      date: toIso(text(it.date), defaultOffset),
      summary: htmlToText(text(it.summary)),
    }))
    .filter((it) => it.title && /^https?:\/\//.test(it.link));
}
