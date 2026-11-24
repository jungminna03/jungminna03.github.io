// 게임 뉴스 피드 수집 → 오늘의 카드뉴스 → src/content/cardnews/YYYY-MM-DD.json
// 실행: npm run cardnews   (오늘 것을 다시 만들려면 npm run cardnews -- --force)
import { existsSync } from 'node:fs';
import config from '../../config/cardnews.mjs';
import { aiEnabled } from '../lib/ai.mjs';
import { fetchText, kstDate, warn, writeJson } from '../lib/util.mjs';
import { composeHeadlines, composeWithAI } from './compose.mjs';
import { parseFeed } from './feeds.mjs';

const date = kstDate();
const output = `src/content/cardnews/${date}.json`;
if (existsSync(output) && !process.argv.includes('--force')) {
  console.log(`${output} 가 이미 있어요. 다시 만들려면 --force`);
  process.exit(0);
}

// 1) 피드 수집 (피드마다 최신 perFeed 개)
const items = [];
let failures = 0;
for (const feed of config.feeds) {
  try {
    const parsed = parseFeed(await fetchText(feed.url), { defaultOffset: feed.lang === 'en' ? 'Z' : '+09:00' });
    const latest = parsed.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, config.perFeed);
    items.push(...latest.map((item) => ({ ...item, feed: feed.name, lang: feed.lang })));
    console.log(`✓ ${feed.name}: ${latest.length}건`);
  } catch (err) {
    failures += 1;
    warn(`${feed.name} 피드 실패: ${err.message}`);
  }
}

// 2) 중복 제거 + 최근 기사만 (기사가 너무 적은 날은 기간 제한 없이)
const seen = new Set();
const deduped = items.filter((item) => !seen.has(item.link) && seen.add(item.link));
const cutoff = Date.now() - config.hours * 3_600_000;
let recent = deduped.filter((item) => !item.date || Date.parse(item.date) >= cutoff);
if (recent.length < config.cards) recent = deduped;
if (recent.length === 0) {
  console.error('수집된 기사가 없어서 카드뉴스를 만들지 못했습니다.');
  process.exit(1);
}

// 3) 카드 구성 — AI 가 실패해도 그날 카드뉴스는 헤드라인으로 남긴다
let cardnews;
if (aiEnabled()) {
  try {
    cardnews = await composeWithAI(recent, { date, cards: config.cards, focus: config.focus });
  } catch (err) {
    warn(`AI 카드뉴스 실패 — 헤드라인 카드뉴스로 대체: ${err.message}`);
    process.exitCode = 1;
  }
} else {
  console.log('ANTHROPIC_API_KEY 가 없어서 헤드라인 카드뉴스로 만듭니다.');
}
cardnews ??= composeHeadlines(recent, { date, cards: config.cards });

await writeJson(output, cardnews);
console.log(`저장: ${output} — ${cardnews.mode}, 카드 ${cardnews.cards.length}장 (기사 ${recent.length}건 중)`);
if (failures === config.feeds.length) process.exitCode = 1;
