// @ts-check
/**
 * 채용 공고 수집 설정 — GitHub Actions 가 매일 `npm run jobs` 로 실행한다.
 *
 * 링크드인·마이나비는 약관상 자동 수집(스크래핑)이 금지라서 긁어오지 않는다. 대신
 *  1) 회사들이 채용 페이지용으로 공개한 공식 API(Greenhouse · Lever · SmartRecruiters · Ashby)에서 자동으로 모으고
 *  2) 링크드인·마이나비·회사 채용 페이지에서 직접 찾은 공고는 아래 `manual` 에 적는다.
 * 두 경우 모두 매일 아침 AI 추천(적정 지원 · 상향 지원 · 관심 기업) 후보가 된다.
 *
 * 회사 추가하기: 채용 페이지 주소에서 ID를 찾는다.
 *   boards.greenhouse.io/<id> · jobs.lever.co/<id> · jobs.smartrecruiters.com/<id> · jobs.ashbyhq.com/<id>
 *
 * @typedef {{ name: string, ats: 'greenhouse' | 'lever' | 'smartrecruiters' | 'ashby', id: string }} Company
 * @typedef {{ company: string, title: string, url: string, location?: string, deadline?: string, note?: string }} ManualJob
 */

export default {
  /** @type {Company[]} */
  companies: [
    // 일본 근무 공고가 확인된 곳 (2026-11 기준)
    { name: 'HoYoverse', ats: 'ashby', id: 'hoyoverse' },
    { name: 'Scopely', ats: 'greenhouse', id: 'scopely' },
    { name: 'Keywords Studios', ats: 'smartrecruiters', id: 'KeywordsStudios' },
    { name: 'Riot Games', ats: 'greenhouse', id: 'riotgames' },
    { name: 'Roblox', ats: 'greenhouse', id: 'roblox' },
    { name: 'Sony Interactive Entertainment', ats: 'greenhouse', id: 'sonyinteractiveentertainmentglobal' },
    { name: '2K', ats: 'greenhouse', id: '2k' },
    // 해외(일본 외) 게임사 — 아래 locations 필터를 넓히면 공고가 보인다
    { name: 'Epic Games', ats: 'greenhouse', id: 'epicgames' },
    { name: 'Ubisoft', ats: 'smartrecruiters', id: 'Ubisoft2' },
    { name: 'Supercell', ats: 'ashby', id: 'supercell' },
    { name: 'NetEase Games', ats: 'greenhouse', id: 'neteasegames' },
    { name: 'Gameloft', ats: 'smartrecruiters', id: 'Gameloft' },
    // 게임 외 일본 IT 예시: { name: 'Woven by Toyota', ats: 'lever', id: 'woven-by-toyota' },
  ],

  filters: {
    // 근무지에 하나라도 들어 있으면 통과 (대소문자 무시). [] 로 비우면 전 세계
    locations: ['Japan', 'Tokyo', 'Osaka', 'Kyoto', 'Fukuoka', 'Yokohama', '日本', '東京', '大阪', '京都', '福岡'],
    // 직무명에 하나라도 들어 있으면 통과. [] 로 비우면 모든 직무
    roles: [
      'engineer', 'programmer', 'developer', 'software', 'technical', 'gameplay', 'graphics', 'rendering',
      'engine', 'unity', 'unreal', 'client', 'server', 'backend', 'qa', 'intern', 'graduate',
      'エンジニア', 'プログラマ', '開発', 'インターン', '新卒',
    ],
    // 직무명에 들어 있으면 제외
    exclude: [],
  },

  /**
   * 직접 찾은 공고. 필터와 상관없이 항상 포함되고, 마감일(YYYY-MM-DD)이 지나면 빠진다.
   * note 는 사이트에 표시되지 않고 AI 추천·자소서에만 쓰인다 — 공고 요약을 적어두면 정확도가 올라간다.
   * @type {ManualJob[]}
   */
  manual: [
    // {
    //   company: 'Square Enix',
    //   title: 'ゲームプログラマー（新卒）',
    //   url: 'https://...',
    //   location: 'Tokyo, Japan',
    //   deadline: '2027-01-31',
    //   note: '마이나비에서 찾음. C++ 필수, 3D 수학, 팀 프로젝트 경험 우대',
    // },
  ],
};
