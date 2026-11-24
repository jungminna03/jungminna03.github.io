// 대작 출시 · 평가 현황 — Claude 가 웹 검색으로 조사하고(1단계), 정해진 형식으로 정리한다(2단계).
// 숫자는 기사·집계 사이트에서 가져온 것이라 출처마다 다를 수 있다. 화면에 출처 링크를 같이 보여준다.
import { z } from 'zod';
import { generateObject, researchText } from '../lib/ai.mjs';

const Score = z.object({
  score: z.number().describe('점수 숫자 (예: 99, 4.8)'),
  outOf: z.number().describe('만점 (예: 100, 10)'),
  outlet: z.string().describe('집계처 (예: Metacritic, OpenCritic)'),
  count: z.number().nullable().describe('리뷰·평가 수. 모르면 null'),
});

const MajorSchema = z.object({
  headline: z.string().describe('이번 기간 대작 시장 한 줄 요약 (한국어 50자 이내)'),
  games: z
    .array(
      z.object({
        name: z.string().describe('게임 이름 (공식 표기)'),
        released: z.string().describe('출시일 YYYY-MM-DD'),
        platforms: z.array(z.string()).describe('출시 플랫폼 (예: PS5, Xbox Series X|S, PC)'),
        studio: z.string().describe('개발사 / 퍼블리셔'),
        critic: Score.nullable().describe('평론가 점수. 자료에 없으면 null'),
        user: Score.nullable().describe('유저 점수. 자료에 없으면 null'),
        steam: z
          .object({ positive: z.number().describe('긍정 비율 %'), reviews: z.number().describe('리뷰 수') })
          .nullable()
          .describe('스팀 유저 평가. PC 미출시거나 자료에 없으면 null'),
        streams: z
          .object({
            peak: z.number().describe('최고 동시 시청자 수'),
            scope: z.string().describe('어디 기준인지 (예: Twitch, 전체 플랫폼 합산)'),
            source: z.string().describe('집계처 (예: Streams Charts, TwitchTracker)'),
          })
          .nullable()
          .describe('방송 최고 동시 시청자. 자료에 없으면 null'),
        sales: z.string().nullable().describe('판매·매출 발표나 추정 (한국어 한 줄, 누가 발표/추정했는지 포함). 없으면 null'),
        summary: z.string().describe('반응 요약: 무엇이 호평/혹평받았는지, 평론가와 유저 반응이 어떻게 다른지 (한국어 2~3문장)'),
        sources: z.array(z.string()).describe('근거 URL 1~4개. 아래 출처 목록에 있는 URL 만'),
      }),
    )
    .describe('최근 출시된 대작. 출시일 최신순, 최대 5개'),
  upcoming: z
    .array(z.object({ name: z.string(), date: z.string().describe('출시 예정일 (YYYY-MM-DD, 미정이면 YYYY-MM)'), platforms: z.array(z.string()) }))
    .describe('앞으로 30일 안에 나올 대작. 최대 5개'),
});

const SYSTEM =
  '너는 게임 업계 애널리스트다. 웹 검색으로 확인한 사실만 쓰고, 수치마다 어디서 나온 숫자인지 밝힌다. ' +
  '출처끼리 숫자가 다르면 더 공신력 있는 쪽(Metacritic·OpenCritic 공식 페이지, Streams Charts·TwitchTracker 같은 집계 사이트, 퍼블리셔 발표)을 쓰고 차이를 적는다. ' +
  '확인하지 못한 수치는 지어내지 말고 "확인 못 함"이라고 쓴다.';

/** @param {{ today: string, days: number }} options */
export function buildResearchPrompt({ today, days }) {
  return `오늘은 ${today} 이다. 최근 ${days}일 안에 출시된 대작(AAA·대형 퍼블리셔·큰 화제작) 게임의 출시와 평가 현황을 조사해 줘.

게임마다 확인할 것:
- 출시일, 플랫폼, 개발사/퍼블리셔
- 평론가 점수 (Metacritic 우선, 없으면 OpenCritic) 와 리뷰 수
- 유저 점수: "<게임 이름> Metacritic user score" 로 따로 검색한다. 평론가 점수와 크게 다르면 이유 (리뷰 폭탄 등)
- PC로 나왔다면 스팀 유저 평가 (긍정 비율, 리뷰 수)
- 방송: "<게임 이름> peak viewers Streams Charts" 나 "<게임 이름> Twitch peak viewers" 로 따로 검색한다.
  출시 후 최고 동시 시청자 수를 Twitch 단독과 여러 플랫폼 합산으로 구분해서 적는다 (둘 다 있으면 합산을 우선)
- 판매·매출 발표나 신뢰할 만한 추정
- 무엇이 호평·혹평받았는지

그리고 앞으로 30일 안에 출시 예정인 대작도 몇 개 알려 줘.
게임은 화제성 큰 순으로 최대 5개까지. 화제성이 가장 큰 게임일수록 유저 점수·방송 수치를 빠뜨리지 말 것. 수치마다 출처를 붙여 줘.`;
}

/** 정리 결과의 출처를 실제 검색에서 나온 URL 로만 제한한다 (지어낸 링크 방지) */
export function keepKnownSources(result, sources) {
  const known = new Set(sources.map((s) => s.url));
  return {
    ...result,
    games: result.games.map((game) => ({ ...game, sources: game.sources.filter((url) => known.has(url)).slice(0, 4) })),
  };
}

/** @param {{ today: string, days: number, maxSearches: number, model: string }} options */
export async function majorReleases({ today, days, maxSearches, model }) {
  const research = await researchText({ system: SYSTEM, prompt: buildResearchPrompt({ today, days }), maxSearches, effort: 'medium', model });
  if (!research.text) throw new Error('조사 결과가 비어 있습니다.');
  const sourceList = research.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n');
  const result = await generateObject({
    system: '조사 메모를 정해진 형식으로 옮겨 적는다. 메모에 없는 수치는 만들지 않고 null 로 둔다. 모든 설명은 한국어로 쓴다.',
    prompt: `## 조사 메모\n${research.text}\n\n## 출처 목록 (sources 에는 여기 있는 URL 만 쓸 것)\n${sourceList}`,
    schema: MajorSchema,
    effort: 'low',
    model,
  });
  const cleaned = keepKnownSources(result, research.sources);
  const used = new Set(cleaned.games.flatMap((game) => game.sources));
  return {
    generatedAt: new Date().toISOString(),
    model,
    days,
    ...cleaned,
    sourceTitles: Object.fromEntries(research.sources.filter((s) => used.has(s.url)).map((s) => [s.url, s.title])),
  };
}
