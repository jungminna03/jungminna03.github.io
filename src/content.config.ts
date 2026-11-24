import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 기술 일기 — src/content/diary/*.md */
const diary = defineCollection({
  loader: glob({ base: './src/content/diary', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // ↓ 적어두면 포트폴리오·자소서로 자동 변환된다 (모두 선택)
    project: z.string().optional(), // 포트폴리오에서 프로젝트별로 묶임
    skills: z.array(z.string()).default([]), // 기술 스택 집계 · 공고 매칭
    highlight: z.string().optional(), // 한 줄 성과 → '핵심 성과' · 자소서 근거
    draft: z.boolean().default(false), // true 면 배포 사이트·포트폴리오에서 숨김
  }),
});

const source = z.object({ label: z.string(), title: z.string().optional(), url: z.string() });

/** 게임 트렌드 카드뉴스 — src/content/cardnews/*.json (scripts/cardnews 가 매일 생성) */
const cardnews = defineCollection({
  loader: glob({ base: './src/content/cardnews', pattern: '**/*.json' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    accent: z.string().default('#4f46e5'),
    mode: z.enum(['ai', 'headlines', 'manual']).default('manual'),
    cards: z
      .array(
        z.object({
          title: z.string(),
          body: z.string().optional(),
          image: z.string().optional(),
          sources: z.array(source).default([]),
        }),
      )
      .min(1),
  }),
});

export const collections = { diary, cardnews };
