// @ts-check
/**
 * 게임 트렌드 분석 — GitHub Actions 가 매일 `npm run trends` 로 만든다.
 *
 * 데이터
 *  - Steam 공식 API: 신작 태그·리뷰·가격, 주간 매출 TOP, 동시 접속 TOP (키 불필요)
 *  - Steam 스토어 검색: 출시일 순 신작 목록 (공식 API 에 출시일 정렬이 없어서 이것만 사용)
 *  - SteamSpy: 보유자 수 추정 · Apple: 일본 모바일 매출 순위
 *  - YouTube Data API: 게임별 화제성 (YOUTUBE_API_KEY 가 있을 때만)
 *  - 게임 매체 RSS: 시장 흐름 해석용 참고 자료 (AI 인사이트에만 쓰고 화면에 기사를 늘어놓지 않음)
 *  - Claude 웹 검색: 대작 출시·평론가/유저 점수·방송 시청자 수 (기사·집계 사이트 기준, 출처 링크 포함)
 *
 * 매출은 공개되지 않아서 '추정'이다: 리뷰 수 × reviewMultiplier × 출시가 × priceRealization (Boxleiter 방식)
 *
 * @typedef {{ name: string, url: string, lang: 'ko' | 'ja' | 'en' }} Feed
 */

export default {
  windowDays: 30, // 최근 며칠 동안 출시된 게임을 볼지 (하루 약 100개)
  reviewMultiplier: 30, // 추정 판매량 = 리뷰 수 × 이 값 (보통 20~60)
  priceRealization: 0.7, // 할인·지역 가격을 감안한 실제 판매가 비율
  tractionReviews: 10, // 리뷰가 이 이상이면 '팔린 게임'으로 본다
  minGenreReleases: 8, // 출시 수가 이보다 적은 장르는 효율 순위에서 뺀다 (표본이 너무 작음)
  topGames: 20, // 추정 매출 상위 몇 개를 보여줄지
  youtube: { games: 20, videosPerGame: 10 }, // YOUTUBE_API_KEY 가 있을 때만 (하루 약 2,000 / 10,000 쿼터)
  aiEveryDays: 7, // AI 인사이트는 며칠마다 새로 쓸지 (숫자는 매일 갱신)
  // 대작 출시·평가 현황 — Claude 웹 검색으로 조사 (ANTHROPIC_API_KEY 가 있을 때만). 1회 약 $0.3~1
  majors: { days: 45, everyDays: 3, maxSearches: 15 },

  // 분석할 장르 태그 (Steam 영어 태그 이름 그대로)
  genres: [
    'Roguelike', 'Roguelite', 'Action Roguelike', 'Roguelike Deckbuilder', 'Deckbuilding', 'Card Game', 'Auto Battler',
    'Metroidvania', 'Souls-like', 'Platformer', 'Precision Platformer', 'Puzzle Platformer', 'Puzzle', 'Physics',
    'Visual Novel', 'Dating Sim', 'Interactive Fiction', 'Choose Your Own Adventure', 'Mystery', 'Detective', 'Point & Click', 'Hidden Object', 'Escape Room',
    'Simulation', 'Farming Sim', 'Life Sim', 'Cozy', 'City Builder', 'Colony Sim', 'Base Building', 'Management', 'Automation',
    'Survival', 'Crafting', 'Open World', 'Sandbox', 'Creature Collector',
    'Horror', 'Psychological Horror', 'Survival Horror',
    'Shooter', 'FPS', 'Bullet Hell', "Shoot 'Em Up", 'Twin Stick Shooter', 'Extraction Shooter',
    'Action RPG', 'JRPG', 'RPG', 'Tactical RPG', 'Party-Based RPG', 'Dungeon Crawler', 'Hack and Slash',
    'Strategy', 'Turn-Based Strategy', 'Tower Defense', 'RTS',
    'Idler', 'Clicker', 'Arcade', 'Match 3', 'Rhythm', 'Racing', 'Sports', 'Fighting', "Beat 'em up", 'Stealth',
    'Party Game', 'Social Deduction', 'Online Co-Op', 'Walking Simulator',
  ],

  /** @type {Feed[]} */
  feeds: [
    { name: 'GamesIndustry.biz', url: 'https://www.gamesindustry.biz/feed', lang: 'en' },
    { name: 'Game Developer', url: 'https://www.gamedeveloper.com/rss.xml', lang: 'en' },
    { name: 'PocketGamer.biz', url: 'https://www.pocketgamer.biz/rss/', lang: 'en' },
    { name: 'AUTOMATON', url: 'https://automaton-media.com/feed/', lang: 'ja' },
    { name: '4Gamer.net', url: 'https://www.4gamer.net/rss/index.xml', lang: 'ja' },
    { name: '게임인사이트', url: 'https://www.gameinsight.co.kr/rss/allArticle.xml', lang: 'ko' },
  ],
  newsHours: 72, // 최근 며칠치 기사를 참고할지
};
