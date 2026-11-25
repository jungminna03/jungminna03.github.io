import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 기술 일기 — src/content/diary/*.md */
const diary = defineCollection({
  loader: glob({ base: './src/content/diary', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string().optional(),
      tags: z.array(z.string()).default([]),
      // ↓ 적어두면 포트폴리오·자소서로 자동 변환된다 (모두 선택)
      project: z.string().optional(), // 포트폴리오에서 프로젝트별로 묶임
      skills: z.array(z.string()).default([]), // 기술 스택 집계 · 공고 매칭
      highlight: z.string().optional(), // 한 줄 성과 → '핵심 성과' · 자소서 근거
      // ↓ 프로젝트 소개 — 그 프로젝트의 첫 노트(프로젝트 노트)에 적는다. 포트폴리오 카드에 그대로 나온다
      summary: z.string().optional(), // 한 줄 정의: 장르·플랫폼·무엇을 하는 것인지
      period: z.string().optional(), // 프로젝트 기간 (예: '2023.03 – 2023.12'). 없으면 일기 날짜로 계산
      team: z.string().optional(), // 팀 규모 (예: '1인 개발', '9인 이상')
      role: z.string().optional(), // 내가 맡은 일 (예: '프로그래밍 전반')
      cover: image().optional(), // 카드 이미지 (예: ./images/portfolio/deadlands.png)
      links: z.record(z.string(), z.url({ protocol: /^https?$/ })).default({}), // 결과물 링크 (예: { Steam: 'https://…', 영상: 'https://…' })
      draft: z.boolean().default(false), // true 면 배포 사이트·포트폴리오에서 숨김
    }),
});

export const collections = { diary };
