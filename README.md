# MyPage

기술 일기를 쓰면 **포트폴리오·자기소개서**로 바뀌고, 매일 아침 **일본·해외 게임 회사 채용 추천**과 **게임 트렌드 카드뉴스**가 올라오는 개인 페이지.
Astro 7 + GitHub Pages, 자동화는 GitHub Actions, AI 는 Claude API.

| 페이지 | 하는 일 | 데이터 |
| --- | --- | --- |
| `/diary` 기술 일기 | 마크다운으로 쓰는 일기 | `src/content/diary/*.md` |
| `/portfolio` 포트폴리오 | 일기의 `project`·`skills`·`highlight` 로 자동 구성, PDF 저장 | 빌드할 때마다 |
| `/jobs` 채용 추천 | 일본·해외 게임사 공고를 모으고 AI 가 **적정 지원·상향 지원·관심 기업** 3곳 추천 | `src/data/jobs.json` (매일) |
| `/cardnews` 카드뉴스 | 한·일·영 게임 매체 소식을 카드로 정리 | `src/content/cardnews/*.json` (매일) |

여기에 `npm run export` 로 **포트폴리오·자소서(한국어 / 일본어 ES / 영어 커버레터)** 를 Markdown 으로 뽑을 수 있다.

## 시작하기

```bash
npm install
npm run dev        # http://localhost:4321
```

먼저 [`config/profile.mjs`](config/profile.mjs) 의 `TODO` (이름, 한 줄 소개, 희망 직무, 관심 기업)를 채운다.
이 파일은 사이트와 공개 레포에 그대로 보이니 공개해도 되는 정보만 적는다.

## 배포 (GitHub Pages)

1. GitHub 에 **`jungminna03.github.io`** 라는 이름으로 레포를 만들고 push → `https://jungminna03.github.io/`
   - 다른 이름(예: `MyPage`)도 된다 → `https://jungminna03.github.io/MyPage/` (base 경로는 [`astro.config.mjs`](astro.config.mjs) 가 자동으로 맞춤)
2. 레포 **Settings → Pages → Source: GitHub Actions**
3. (선택) **Settings → Secrets and variables → Actions**
   - Secret `ANTHROPIC_API_KEY` — AI 추천·카드뉴스 요약을 켠다 ([키 발급](https://platform.claude.com/))
   - Variable `CLAUDE_MODEL` — 모델 변경 (비워두면 `claude-opus-5-5`)
4. **Actions → Daily update → Run workflow** 로 한 번 돌려본다

## 매일 자동화

[`.github/workflows/daily.yml`](.github/workflows/daily.yml) 이 매일 07:00 (KST) 에 실행된다.

1. `npm run jobs` — 공고 수집 → 필터 → AI 추천 → `src/data/jobs.json`
2. `npm run cardnews` — 피드 수집 → 오늘의 카드뉴스 → `src/content/cardnews/YYYY-MM-DD.json`
3. 바뀐 게 있으면 커밋하고 [`deploy.yml`](.github/workflows/deploy.yml) 로 배포

`ANTHROPIC_API_KEY` 가 없어도 돈다. 공고는 그대로 모이고 추천만 빠지며, 카드뉴스는 매체별 헤드라인 모음으로 만들어진다.
한 단계가 실패하면 다른 단계는 계속 진행하고, 워크플로는 실패로 표시돼서 GitHub 가 메일로 알려준다.

## 기술 일기 → 포트폴리오 · 자소서

`src/content/diary/` 에 `2026-11-24-object-pooling.md` 처럼 만든다 (예시: [`2026-11-24-diary-guide.md`](src/content/diary/2026-11-24-diary-guide.md), `draft: true` 라 배포본엔 안 나옴).

```markdown
---
title: 오브젝트 풀링으로 GC 스파이크 잡기
date: 2026-11-24
tags: [최적화]
project: 탄막 슈팅 개인 프로젝트   # 포트폴리오에서 프로젝트별로 묶임
skills: [Unity, C#, Profiler]     # 기술 스택 집계 · 공고 매칭
highlight: 풀링 도입으로 GC Alloc 2.1KB → 0B, 프레임 드랍 해결   # '핵심 성과' · 자소서 근거
---

문제 → 시도 → 결과 순서로 쓰면 자소서로 잘 바뀐다.
```

- 이미지는 `src/content/diary/images/<프로젝트>/` 에 넣고 `![설명](./images/<프로젝트>/파일.png)` 로 쓴다. 빌드할 때 WebP 로 최적화된다.
- 예전 Jekyll 블로그(KEN's Atelier)의 글 6개는 여기로 옮겨 왔다. 시리즈 이름이 `project`·`tags` 로 들어가 있으니 `skills`·`highlight` 를 더 적으면 포트폴리오가 풍성해진다. 예전 블로그 파일은 git 기록에 남아 있다.
- **`/portfolio`** 는 빌드할 때마다 자동으로 다시 만들어진다. `PDF로 저장` 버튼은 브라우저 인쇄(PDF)를 쓴다.
- **`npm run export`** 는 `exports/` 에 문서를 만든다. 이 폴더는 `.gitignore` 에 있어서 공개 레포에 올라가지 않는다.

| 명령 | 결과 |
| --- | --- |
| `npm run export` | `portfolio.md` (AI 없이) + `portfolio.ko.md` · `cover-letter.ko.md` |
| `npm run export -- --lang ja` | 일본어 포트폴리오 + ES (志望動機 · 自己PR · ガクチカ) |
| `npm run export -- --lang en` | 영어 포트폴리오 + 커버레터 |
| `npm run export -- --rec reach` | 오늘 추천된 '상향 지원' 공고에 맞춰서 (`match` · `reach` · `interest`) |
| `npm run export -- --job <id>` | 특정 공고에 맞춰서 (id 는 `src/data/jobs.json`) |
| `npm run export -- --questions q.txt` | 문항 직접 지정 (한 줄에 하나, 예: `지원 동기 (1000자)`) |
| `npm run export -- --only letter` | `portfolio` · `letter` 중 하나만 |

AI 버전은 로컬에 키가 필요하다: `.env.example` 을 `.env` 로 복사해서 `ANTHROPIC_API_KEY` 를 넣는다.
AI 에게는 일기에 없는 경력·수치를 지어내지 말고 근거가 부족하면 `[확인 필요]` 로 표시하라고 지시해 두었다. 그래도 제출 전에 사실관계와 글자 수(문항마다 표시됨)는 직접 확인할 것.

## 채용 공고

설정: [`config/jobs.mjs`](config/jobs.mjs)

- **링크드인·마이나비는 자동으로 긁지 않는다.** 링크드인 이용약관과 [마이나비 사이트 정책](https://job.mynavi.jp/sitepolicy/index.html) 모두 크롤러·스크립트로 게재 정보를 가져가는 것을 금지하고, 링크드인은 봇 접속도 적극적으로 막는다.
  대신 두 사이트의 '새 공고 알림 메일'을 켜두고, 괜찮은 공고만 `manual` 에 옮겨 적으면 추천 후보에 들어간다.
- **자동 수집**은 회사가 채용 페이지용으로 공개한 공식 API(Greenhouse · Lever · SmartRecruiters · Ashby)를 쓴다.
  기본 목록은 일본 근무 공고가 확인된 게임사(HoYoverse, Scopely, Keywords Studios, Riot, Roblox, SIE, 2K)와 해외 게임사 몇 곳이다.
  회사 추가: 채용 페이지 주소의 ID 를 찾아서 `companies` 에 넣는다 (`boards.greenhouse.io/<id>` 등).
- **필터**: `locations` (기본은 일본 지명), `roles` (기본은 개발·기술직 + 인턴/신졸), `exclude`. 해외 전체를 보려면 `locations: []`.
- **추천**: `config/profile.mjs` (희망 직무·지역·언어·관심 기업) + 기술 일기를 Claude 에게 보내서 고른다.
  후보 공고·프로필·일기가 어제와 같으면 API 를 다시 부르지 않는다.
- `/jobs` 페이지는 검색 엔진 색인에서 빠지지만(`noindex`) 주소를 아는 사람은 볼 수 있다. 추천 사유가 공개되는 게 싫으면 [`src/layouts/Base.astro`](src/layouts/Base.astro) 메뉴에서 빼거나 페이지를 지우면 된다.

## 카드뉴스

설정: [`config/cardnews.mjs`](config/cardnews.mjs) — 피드 목록, 기간, 카드 수, AI 에게 줄 관심사(`focus`).

- 피드의 제목·요약·링크만 쓰고 카드마다 원문 링크를 단다. AI 모드는 기사에 없는 내용을 쓰지 않도록 지시한다.
- 오늘 것을 다시 만들기: `npm run cardnews -- --force` (Actions 에서는 Run workflow 의 `force_cardnews`)
- 직접 만들기: `src/content/cardnews/` 에 JSON 을 추가한다.

```json
{
  "title": "표지 제목",
  "date": "2026-11-24",
  "summary": "부제",
  "mode": "manual",
  "cards": [{ "title": "카드 제목", "body": "본문", "image": "/cardnews/1.png", "sources": [{ "label": "매체", "url": "https://..." }] }]
}
```

## 비용 (Claude API)

기본 모델 `claude-opus-5-5` ($4 / $20 per 1M tokens) 기준 대략적인 예상치:

- 매일 자동화 (추천 + 카드뉴스): 하루 $0.1–0.3, 한 달 $3–9
- `npm run export` 1회: 일기 양에 따라 $0.2–1

실제 사용량은 Actions 로그의 `[AI] … 입력 / 출력 토큰` 줄에서 확인할 수 있다.
줄이려면 `CLAUDE_MODEL` 을 `claude-sonnet-5-5` ($2 / $10) 나 `claude-haiku-5-5` ($0.10 / $0.50) 로 바꾼다.
안전 분류기가 요청을 거절하면 서버가 대체 모델로 자동 재시도하도록(`fallbacks: "default"`) 설정되어 있다.

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (초안 일기도 보임) |
| `npm run build` / `preview` | 배포용 빌드 / 빌드 결과 미리보기 |
| `npm run check` | 타입 검사 |
| `npm test` | 스크립트 테스트 |
| `npm run jobs` | 공고 수집 + AI 추천 |
| `npm run cardnews` | 오늘의 카드뉴스 |
| `npm run export` | 포트폴리오 · 자소서 |

## 구조

```
config/                 ← 직접 고치는 설정
  profile.mjs             나에 대한 정보
  jobs.mjs                채용 공고 소스 · 필터 · 직접 추가한 공고
  cardnews.mjs            카드뉴스 피드
src/
  content/diary/          기술 일기 (.md)
  content/cardnews/       카드뉴스 (.json, 매일 생성)
  data/jobs.json          공고 + 추천 (매일 생성)
  lib/portfolio.mjs       일기 → 포트폴리오 집계 (사이트·export 공용)
  pages/                  페이지
scripts/
  jobs/                   공고 수집 · 병합 · 추천
  cardnews/               피드 파싱 · 카드 구성
  export/                 포트폴리오 · 자소서
  lib/                    Claude 호출, 일기 읽기, 유틸
.github/workflows/
  deploy.yml              push 하면 배포
  daily.yml               매일 07:00 KST 자동화
```
