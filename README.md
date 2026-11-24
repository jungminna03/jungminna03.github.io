# KEN's Atelier

나무 책상 위에 종이 네 장을 올려놓은 픽셀 게임 스타일 개인 페이지. 좌우 버튼(또는 ← → 키, 스와이프)으로 종이를 넘긴다.

| 종이 | 하는 일 | 데이터 |
| --- | --- | --- |
| 기술 일기 (첫 화면) | 마크다운으로 쓰는 일기 | `src/content/diary/*.md` |
| 포트폴리오 | 일기의 `project`·`skills`·`highlight` 로 자동 구성, PDF 저장 | 빌드할 때마다 |
| 채용 추천 | 일본·해외 게임사 공고마다 **적합도(잘 맞음·검토·안 맞음)와 이유**, AI 가 적정·상향·관심 3곳 추천 | `src/data/jobs.json` (매일) |
| 게임 트렌드 | 스팀 신작 장르 분석·추정 매출·유튜브 화제성 + 전체 시장, AI 가 "만들어 볼 게임" 제안 | `src/data/trends.json` (매일) |

여기에 `npm run export` 로 **포트폴리오·자소서(한국어 / 일본어 ES / 영어 커버레터)** 를 Markdown 으로 뽑는다.

## 시작하기

```bash
npm install
npm run dev        # http://localhost:4321
```

내 정보는 [`config/profile.mjs`](config/profile.mjs) — 이름, 희망 직무, 경력, 언어, 기술, 관심 기업. 공고 적합도와 AI 추천·자소서가 모두 이 값을 기준으로 한다.
이 파일은 공개 레포에 그대로 보이니 공개해도 되는 정보만 적는다.

## 배포 · 자동화

- `main` 에 push 하면 [`deploy.yml`](.github/workflows/deploy.yml) 이 GitHub Pages 에 배포한다 (Settings → Pages → Source: GitHub Actions).
- [`daily.yml`](.github/workflows/daily.yml) 이 매일 07:00 (KST) 에 `npm run jobs` → `npm run trends` 를 돌리고, 바뀐 데이터를 커밋한 뒤 배포한다.
- 한 단계가 실패해도 다른 단계는 계속 돌고, 워크플로는 실패로 표시돼서 GitHub 가 메일로 알려준다.

**Settings → Secrets and variables → Actions** (전부 선택. 없으면 그 기능만 빠지고 나머지는 돈다)

| 이름 | 종류 | 켜지는 것 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Secret | AI 공고 추천·공고별 적합도 설명, 트렌드 인사이트·게임 아이디어 ([키 발급](https://platform.claude.com/)) |
| `YOUTUBE_API_KEY` | Secret | 트렌드의 유튜브 화제성 ([Google Cloud 콘솔](https://console.cloud.google.com/)에서 YouTube Data API v3 사용 설정 → API 키, 무료 쿼터로 충분) |
| `CLAUDE_MODEL` | Variable | 모델 변경 (비워두면 `claude-opus-5-5`) |

로컬에서 AI·유튜브를 쓰려면 `.env.example` 을 `.env` 로 복사해서 키를 넣는다 (`.env` 는 커밋되지 않음).

## 기술 일기 → 포트폴리오 · 자소서

`src/content/diary/` 에 `2026-11-24-object-pooling.md` 처럼 만든다 (예시: [`2026-11-24-diary-guide.md`](src/content/diary/2026-11-24-diary-guide.md), `draft: true` 라 배포본엔 안 나옴).

```markdown
---
title: 오브젝트 풀링으로 GC 스파이크 잡기
date: 2026-11-24
tags: [최적화]
project: 탄막 슈팅 개인 프로젝트   # 포트폴리오에서 프로젝트별로 묶임
skills: [Unity, C#, Profiler]     # 기술 스택 집계 · 공고 적합도
highlight: 풀링 도입으로 GC Alloc 2.1KB → 0B, 프레임 드랍 해결   # '핵심 성과' · 자소서 근거
---

문제 → 시도 → 결과 순서로 쓰면 자소서로 잘 바뀐다.
```

- 이미지는 `src/content/diary/images/<프로젝트>/` 에 넣고 `![설명](./images/<프로젝트>/파일.png)` 로 쓴다. 빌드할 때 WebP 로 줄어든다.
- 포트폴리오 종이의 `PDF로 저장` 은 브라우저 인쇄를 쓴다 (보이는 종이만 인쇄됨).
- `npm run export` 결과는 `exports/` 에 생기고, 이 폴더는 커밋되지 않는다.

| 명령 | 결과 |
| --- | --- |
| `npm run export` | `portfolio.md` (AI 없이) + `portfolio.ko.md` · `cover-letter.ko.md` |
| `npm run export -- --lang ja` | 일본어 포트폴리오 + ES (志望動機 · 自己PR · ガクチカ) |
| `npm run export -- --lang en` | 영어 포트폴리오 + 커버레터 |
| `npm run export -- --rec reach` | 오늘 추천된 '상향 지원' 공고에 맞춰서 (`match` · `reach` · `interest`) |
| `npm run export -- --job <id>` | 특정 공고에 맞춰서 (id 는 `src/data/jobs.json`) |
| `npm run export -- --questions q.txt` | 문항 직접 지정 (한 줄에 하나, 예: `지원 동기 (1000자)`) |

AI 에게는 일기에 없는 경력·수치를 지어내지 말고 근거가 부족하면 `[확인 필요]` 로 표시하라고 지시해 두었다. 제출 전에 사실관계와 글자 수(문항마다 표시됨)는 직접 확인할 것.

## 채용 추천

설정: [`config/jobs.mjs`](config/jobs.mjs)

- **적합도**는 공고마다 매긴다. 기준은 `config/profile.mjs` 의 희망 직무(1순위)·경력·기술과 기술 일기의 `skills`.
  - 시니어·리드는 신입에게 '안 맞음', 아트·비개발 직군도 '안 맞음'.
  - 희망 직무가 아니어도 툴·엔진·서버처럼 포트폴리오 근거(기술 일치)가 있으면 '검토'.
  - 직무명에 다른 엔진(예: 언리얼)이 박혀 있으면 감점.
  - `ANTHROPIC_API_KEY` 가 있으면 AI 가 공고 본문까지 읽고 다시 매기며 이유를 한 줄로 쓴다 (목록에 `AI` 표시).
- **링크드인·마이나비는 자동으로 긁지 않는다.** 링크드인 이용약관과 [마이나비 사이트 정책](https://job.mynavi.jp/sitepolicy/index.html) 모두 크롤러로 게재 정보를 가져가는 걸 금지한다.
  두 사이트의 '새 공고 알림 메일'을 켜두고, 괜찮은 공고를 `manual` 에 옮겨 적으면 추천·적합도 대상이 된다.
  일본 게임사의 신졸(新卒) 채용은 대부분 공식 API 가 없어서 이 방법이 가장 확실하다.
- **자동 수집**은 회사가 채용 페이지용으로 공개한 공식 API(Greenhouse · Lever · SmartRecruiters · Ashby)를 쓴다.
  회사 추가: 채용 페이지 주소의 ID 를 `companies` 에 넣는다 (`boards.greenhouse.io/<id>` 등).
- 필터: `locations` (기본은 일본 지명), `roles` (개발·기술직 + 인턴/신졸), `exclude`. 해외 전체를 보려면 `locations: []`.

## 게임 트렌드

설정: [`config/trends.mjs`](config/trends.mjs) — 기간(기본 30일), 분석할 장르 태그, 추정 매출 계수, 유튜브·AI 주기.

- **인디 시장**: 최근 30일 스팀 신작(하루 150~200개) 중 Indie 태그 게임을 장르별로 집계한다.
  출시 수(경쟁), 리뷰 10개 이상 받은 비율, 추정 매출 합·중앙값, **출시 1개당 추정 매출(수요)**, 유튜브 화제성, 대표작.
  '기회 장르'는 표본이 너무 작은 장르를 빼고 1개당 추정 매출이 높은 순이다.
- **전체 시장**: 스팀 주간 매출 TOP(전 세계)·동시 접속 TOP(신작·무료·인디 비중, 상위 장르), 일본 App Store 게임 매출 TOP.
- **만들어 볼 게임**: AI 가 위 데이터 + 최근 업계 기사 제목 + 내 프로필로 'Unity 1인 개발로 6~12개월 안에 첫 버전을 낼 수 있는' 방향 3개를 근거 숫자와 함께 제안한다 (매주 갱신, 숫자는 매일).
  키가 없으면 데이터상 기회 장르를 보여준다.
- **추정 매출 = 리뷰 수 × 30 × 출시가 × 0.7** (Boxleiter 방식). 실제 매출은 공개되지 않으므로 장르·게임 간 비교용으로만 본다. 보유자 수는 SteamSpy 추정.
- 데이터: Steam 공식 API(키 불필요), 출시일 순 신작 목록만 스토어 검색 페이지 사용(요청 사이 2초 쉬고, 막히면 기다렸다 재시도), SteamSpy, Apple RSS, YouTube Data API.
- AI 인사이트를 지금 다시 쓰기: `npm run trends -- --force-ai` (Actions 에서는 Run workflow 의 `force_ai`).

## 비용 (Claude API)

기본 모델 `claude-opus-5-5` ($4 / $20 per 1M tokens) 기준 대략적인 예상치:

- 공고 추천·적합도: 후보·프로필·일기가 바뀐 날만 호출 — 한 번에 $0.1~0.3
- 트렌드 인사이트: 일주일에 한 번 — 한 번에 $0.2~0.5
- `npm run export` 1회: 일기 양에 따라 $0.2~1

실제 사용량은 Actions 로그의 `[AI] … 입력 / 출력 토큰` 줄에서 확인할 수 있다.
줄이려면 `CLAUDE_MODEL` 을 `claude-sonnet-5-5` ($2 / $10) 나 `claude-haiku-5-5` ($0.10 / $0.50) 로 바꾼다.
안전 분류기가 요청을 거절하면 서버가 대체 모델로 자동 재시도하도록(`fallbacks: "default"`) 설정되어 있다.

## 디자인

- 제목·버튼: [Galmuri11](https://github.com/quiple/galmuri) (픽셀 폰트, SIL OFL — `src/assets/fonts/Galmuri-OFL.md`), 본문: 마비노기 클래식체
- 나무 책상: `src/assets/desk/wood.png` (64×64 픽셀 타일을 4배로)
- 소품·아이콘: [`src/lib/sprites.ts`](src/lib/sprites.ts) 에 글자 격자로 그린 픽셀 아트 (`Sprite.astro` 가 SVG 로 그림)
- 종이 넘기기: 6프레임으로 끊어지는 레트로 애니메이션 (OS 의 '동작 줄이기' 설정이면 꺼짐)

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (초안 일기도 보임) |
| `npm run build` / `preview` | 배포용 빌드 / 빌드 결과 미리보기 |
| `npm run check` | 타입 검사 |
| `npm test` | 스크립트 테스트 |
| `npm run jobs` | 공고 수집 + 적합도 + AI 추천 |
| `npm run trends` | 스팀 트렌드 분석 |
| `npm run export` | 포트폴리오 · 자소서 |

## 구조

```
config/                  ← 직접 고치는 설정
  profile.mjs              나에 대한 정보 (적합도·추천·자소서 기준)
  jobs.mjs                 채용 공고 소스 · 필터 · 직접 추가한 공고
  trends.mjs               트렌드 분석 기간 · 장르 · 계수
src/
  content/diary/           기술 일기 (.md)
  data/jobs.json           공고 + 적합도 + 추천 (매일 생성)
  data/trends.json         트렌드 리포트 (매일 생성)
  components/PaperStack    종이 네 장 + 좌우 넘기기
  components/papers/       기술 일기 · 포트폴리오 · 채용 추천 · 게임 트렌드
  layouts/Desk.astro       나무 책상 (명패 · 소품)
scripts/
  jobs/                    공고 수집 · 적합도(fit) · 병합 · AI 추천
  trends/                  스팀·SteamSpy·Apple·YouTube 수집 · 분석 · AI 인사이트
  export/                  포트폴리오 · 자소서
  lib/                     Claude 호출, 일기 읽기, RSS, 유틸
.github/workflows/
  deploy.yml               push 하면 배포
  daily.yml                매일 07:00 KST 자동화
```
