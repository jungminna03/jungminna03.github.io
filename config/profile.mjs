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
 * @property {string} [email]          포트폴리오 카드·푸터에 표시
 * @property {string} [phone]          포트폴리오 카드·푸터에 표시
 * @property {Record<string, string>} links   예) { GitHub: 'https://github.com/...' }
 * @property {{ school: string, major?: string, period?: string }[]} education
 * @property {{ name: string, level: string }[]} languages
 * @property {string[]} skills         주력 기술. 포트폴리오 기술 스택에서 진하게 강조하고, 공고 추천 기준이 된다
 * @property {{ name: string, skills: string[] }[]} skillGroups  포트폴리오 기술 스택 분야. 일기에만 있고 여기 없는 기술은 '기타'로 붙는다
 * @property {'신입' | '1~3년' | '3년+'} experience  경력 — 시니어·리드 공고를 걸러내는 기준
 * @property {string[]} targetRoles    희망 직무 — 공고 추천 기준 (첫 번째가 1순위)
 * @property {string[]} targetLocations 희망 지역 — 공고 추천 기준
 * @property {string[]} interestCompanies 관심 기업. 공고의 회사명과 같으면 '관심 기업' 추천 후보가 된다
 * @property {string} notes            자소서에 반영할 메모 (가치관, 지원 이유 등 일기에 안 쓰는 것). 사이트에는 표시되지 않음
 */

/** @type {Profile} */
const profile = {
  siteTitle: "KEN's Atelier",
  name: '나정민', // 포트폴리오·자소서 제목에 쓰임
  headline: '게임 클라이언트 프로그래머', // 비워두면 표시 안 함
  intro: 'Unity로 Steam·Google Play에 게임을 출시하고 운영해 봤습니다. 기획이 바뀌어도 코드를 다 뜯지 않도록 구조를 먼저 고민하고, 객체지향과 ECS를 직접 비교해 가며 프로젝트에 맞는 방식을 고릅니다.',
  location: 'Seoul, Korea',
  email: 'jungminna03@gmail.com',
  phone: '010-5761-3222',
  links: {
    GitHub: 'https://github.com/jungminna03',
  },
  education: [
    { school: '호서대학교', major: '게임소프트웨어학과', period: '2022.03 – 2028.03 (졸업 예정)' },
  ],
  languages: [
    { name: '한국어', level: '모국어' },
    { name: '日本語', level: '비즈니스 (N1~N2)' },
    // { name: 'English', level: 'TOEIC 850' },
  ],
  skills: ['Unity', 'C#', 'C++', 'R3', 'Unity Test Framework', 'ScriptableObject', 'EnTT', 'Siv3D'], // 주력 기술 — 포트폴리오에서 진하게 강조
  skillGroups: [
    { name: '언어', skills: ['C#', 'C++', 'JavaScript', 'TypeScript', 'Kotlin'] },
    { name: '엔진·라이브러리', skills: ['Unity', 'Siv3D', 'EnTT', 'R3', 'Phaser'] },
    { name: '설계·테스트', skills: ['ECS', 'ScriptableObject', 'MVVM', 'Unity Test Framework'] },
    { name: '출시·서비스', skills: ['Unity Ads', 'Unity IAP', 'Electron', 'Instant DB', 'Tailwind CSS', 'Tailscale Funnel', 'OrangeUI'] },
    { name: 'AI 활용', skills: ['Claude Code', 'ComfyUI', 'TTS'] },
    { name: '협업 툴', skills: ['Git', 'GitHub', 'GitLab', 'Notion', 'Slack'] },
  ],
  experience: '신입',
  targetRoles: ['게임 클라이언트 프로그래머 (Unity·C#)'],
  targetLocations: ['일본 (도쿄·오사카 등)', '해외'],
  // 관심 기업 — config/jobs.mjs 의 회사 이름(또는 manual 공고의 company)과 똑같이
  interestCompanies: [
    'HoYoverse', 'Riot Games',
    // 반다이남코 산하
    'Bandai Namco Studios', 'Bandai Namco Entertainment',
    // 사이버에이전트 산하
    'Cygames', 'Colorful Palette', 'Sumzap', 'Applibot', 'QualiArts', 'Craft Egg',
  ],
  notes: '지금은 클라이언트 프로그래머가 1순위지만, 포트폴리오에 맞는 조건이 있으면 다른 직무(툴 프로그래머 등)도 추천받고 싶다.',
};

export default profile;
