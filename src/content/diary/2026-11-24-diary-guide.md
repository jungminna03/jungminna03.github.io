---
title: '[예시] 기술 일기 쓰는 법'
date: 2026-11-24
project: 예시 프로젝트
skills: [Astro, TypeScript]
highlight: 기술 일기만 쓰면 포트폴리오와 자소서 재료가 자동으로 정리되는 구조를 만들었다
draft: true
---

이 글은 예시예요. `draft: true` 라서 **로컬(`npm run dev`)에서만 보이고**, 배포된 사이트와 포트폴리오·자소서에는 들어가지 않아요. 첫 일기를 쓰면 지워도 됩니다.

## 파일 만들기

`src/content/diary/` 에 `2026-11-24-object-pooling.md` 처럼 **날짜-영문-제목.md** 로 만들면 주소가 `/diary/2026-11-24-object-pooling/` 이 돼요.

## frontmatter

| 필드 | 필수 | 어디에 쓰이나 |
| --- | --- | --- |
| `title`, `date` | ✅ | 목록, 정렬 |
| `project` | | 포트폴리오에서 프로젝트별로 묶임 |
| `skills` | | 기술 스택 집계, 채용 공고 매칭 |
| `highlight` | | 포트폴리오 '핵심 성과', 자소서 근거 |
| `summary` · `period` · `team` · `role` · `cover` · `links` | | 프로젝트 소개 — 프로젝트의 첫 노트에 적으면 포트폴리오 카드에 나옴 |
| `draft` | | `true` 면 비공개 |

`project` · `skills` · `highlight` 는 선택이지만, 적어둘수록 포트폴리오와 자소서가 정확해져요.

## 이미지

`src/content/diary/images/<프로젝트>/` 에 넣고 `![설명](./images/<프로젝트>/파일.png)` 로 쓰면, 빌드할 때 WebP 로 줄여서 올라가요. 큰 스크린샷을 그대로 넣어도 괜찮아요.

## 이렇게 쓰면 변환이 잘 돼요

- **문제 → 시도 → 결과** 순서로 쓰기 (자소서의 경험 문항이 바로 이 구조예요)
- 숫자가 있으면 꼭 적기 — 예: 로딩 3.2초 → 1.1초, GC Alloc 2.1KB → 0B
- 막혔던 점, 다르게 해볼 점도 적기 — 면접에서 자주 물어봐요
- 팀 프로젝트라면 **내가 맡은 부분**을 분명하게

```ts
// 코드 블록은 라이트·다크 테마에 맞게 하이라이팅돼요
const pool = new ObjectPool(() => new Bullet(), 256);
```
