// @ts-check
/**
 * 나에 대한 정보.
 * 포트폴리오 페이지(/portfolio), 포폴·자소서 생성(npm run export), 매일 공고 추천에서 함께 쓴다.
 * ⚠️ 이 파일은 공개 레포와 사이트에 그대로 노출된다. 공개해도 되는 정보만 적을 것.
 *
 * @typedef {object} Profile
 * @property {string} siteTitle        사이트 이름 (헤더/탭 제목)
 * @property {string} name
 * @property {string} headline         한 줄 소개
 * @property {string} intro            두세 문장 소개
 * @property {string} [location]
 * @property {Record<string, string>} links   예) { GitHub: 'https://github.com/...' }
 * @property {{ school: string, major?: string, period?: string }[]} education
 * @property {{ name: string, level: string }[]} languages
 * @property {string[]} skills         일기에서 자동으로 모이는 기술 외에 꼭 넣고 싶은 기술
 * @property {string[]} targetRoles    희망 직무 — 공고 추천 기준
 * @property {string[]} targetLocations 희망 지역 — 공고 추천 기준
 * @property {string[]} interestCompanies 관심 기업. 공고의 회사명과 같으면 '관심 기업' 추천 후보가 된다
 * @property {string} notes            자소서에 반영할 메모 (가치관, 지원 이유 등 일기에 안 쓰는 것). 사이트에는 표시되지 않음
 */

/** @type {Profile} */
const profile = {
  siteTitle: "KEN's Atelier",
  name: 'KEN', // TODO: 실명으로 바꿔도 됨 (포트폴리오·자소서 제목에 쓰임)
  headline: '게임 개발 · 툴/에셋 제작', // TODO
  intro: '배운 것과 해결한 문제를 기술 일기로 기록합니다. 일본·해외 게임 회사 취업을 준비하고 있어요.',
  location: 'Seoul, Korea',
  links: {
    GitHub: 'https://github.com/jungminna03',
  },
  education: [
    // { school: 'OO대학교', major: '컴퓨터공학과', period: '2022.03 – 2027.02 (졸업 예정)' },
  ],
  languages: [
    { name: '한국어', level: '모국어' },
    // { name: '日本語', level: 'JLPT N2' },
    // { name: 'English', level: 'TOEIC 850' },
  ],
  skills: [],
  targetRoles: ['게임 클라이언트 프로그래머', '게임플레이 프로그래머', '엔진·툴 프로그래머'], // TODO
  targetLocations: ['일본 (도쿄·오사카 등)', '해외'],
  interestCompanies: ['HoYoverse', 'Riot Games'], // TODO: config/jobs.mjs 의 회사 이름과 똑같이
  notes: '',
};

export default profile;
