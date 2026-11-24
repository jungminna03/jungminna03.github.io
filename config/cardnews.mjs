// @ts-check
/**
 * 게임 트렌드 카드뉴스 — GitHub Actions 가 매일 `npm run cardnews` 로 만든다.
 * 피드의 제목·요약·링크만 쓰고, 카드마다 출처 링크를 단다.
 *  - ANTHROPIC_API_KEY 있음: Claude 가 여러 기사를 묶어 트렌드 카드로 요약 (mode: ai)
 *  - 없음: 매체별 최신 헤드라인 카드 (mode: headlines)
 *
 * @typedef {{ name: string, url: string, lang: 'ko' | 'ja' | 'en' }} Feed
 */

export default {
  /** @type {Feed[]} */
  feeds: [
    { name: 'GamesIndustry.biz', url: 'https://www.gamesindustry.biz/feed', lang: 'en' },
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml', lang: 'en' },
    { name: 'PocketGamer.biz', url: 'https://www.pocketgamer.biz/rss/', lang: 'en' },
    { name: 'AUTOMATON', url: 'https://automaton-media.com/feed/', lang: 'ja' },
    { name: '4Gamer.net', url: 'https://www.4gamer.net/rss/index.xml', lang: 'ja' },
    { name: 'GameSpark', url: 'https://www.gamespark.jp/rss/index.rdf', lang: 'ja' },
    { name: '게임인사이트', url: 'https://www.gameinsight.co.kr/rss/allArticle.xml', lang: 'ko' },
    { name: '인벤', url: 'https://www.inven.co.kr/webzine/news/rss.php', lang: 'ko' },
  ],
  hours: 36, // 최근 몇 시간 안의 기사만 쓸지
  perFeed: 12, // 피드당 최대 기사 수
  cards: 6, // 표지를 뺀 카드 수
  // AI 에게 알려줄 관심사 — 이 관점으로 기사를 골라 묶는다
  focus: '일본·글로벌 게임 업계 동향, 흥행작과 신작, 비즈니스·투자, 개발 기술과 엔진, 채용·조직 변화',
};
