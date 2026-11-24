// 트렌드 데이터 → AI 인사이트 ("어떤 게임을 만들기 시작할까")
import { z } from 'zod';
import { generateObject, MODEL } from '../lib/ai.mjs';
import { usd } from './analyze.mjs';

const Summary = z.object({
  headline: z.string().describe('한 줄 요약 (한국어 40자 이내)'),
  points: z.array(z.string()).describe('데이터 근거가 있는 관찰 3~5개. 숫자를 인용한다 (한국어)'),
});

const InsightSchema = z.object({
  indie: Summary,
  market: Summary,
  ideas: z
    .array(
      z.object({
        title: z.string().describe('만들어 볼 게임 방향 한 줄 (한국어)'),
        genres: z.array(z.string()).describe('장르 태그 2~4개'),
        why: z.string().describe('왜 지금 이 방향인지 — 출시 수(경쟁)·1개당 매출·화제성 숫자를 인용 (한국어 2~3문장)'),
        scope: z.string().describe('Unity 1인 개발 기준 첫 버전(데모/얼리 액세스) 범위와 예상 기간 (한국어 1~2문장)'),
        references: z.array(z.string()).describe('데이터에 나온 참고 게임 이름 1~3개'),
        risks: z.string().describe('주의할 점 한 문장 (한국어)'),
      }),
    )
    .describe('만들어 볼 만한 게임 방향 3개'),
});

const SYSTEM =
  '너는 스팀·모바일 게임 시장 데이터를 해석하는 인디 게임 프로듀서다. 데이터에 근거한 관찰만 쓰고, 없는 수치를 만들지 않는다. ' +
  '매출은 리뷰 수 기반 추정치라는 한계를 알고 해석한다. 모든 글은 한국어로 짧고 구체적으로 쓴다.';

const pct = (n) => (n == null ? '-' : `${n}%`);
const num = (n) => (n ? n.toLocaleString('en-US') : '0');

export function buildTrendsPrompt({ report, news, profile }) {
  const { indie, market, window } = report;
  const genres = indie.genres
    .slice(0, 25)
    .map((g) => `- ${g.name}(${g.en}): ${g.releases} / ${g.traction} / ${usd(g.revenue)} / ${usd(g.perRelease)} / ${usd(g.median)} / ${pct(g.positive)} / ${num(g.youtube)}`)
    .join('\n');
  const games = indie.topGames
    .map(
      (g, i) =>
        `${i + 1}. ${g.name} (${g.tags.join(', ')}) — 출시 ${g.released}, $${g.price}, 리뷰 ${num(g.reviews)} (긍정 ${pct(g.positive)}), 추정 ${usd(g.revenue)}` +
        `${g.owners ? `, 보유자 ${g.owners}` : ''}${g.youtube ? `, 유튜브 상위 영상 조회수 합 ${num(g.youtube.views)}` : ''}`,
    )
    .join('\n');
  const flags = (s) => [s.isNew && '신작', s.free && '무료', s.indie && '인디', s.earlyAccess && '얼리액세스'].filter(Boolean).join('·');
  const sellers = market.sellers.map((s) => `${s.rank}. ${s.name} [${flags(s) || '-'}] ${s.tags.join(', ')} (출시 ${s.released ?? '-'})`).join('\n');
  const played = market.mostPlayed.map((s) => `${s.rank}. ${s.name} — 최고 동접 ${num(s.peak)}`).join('\n');
  const mobile = market.mobileJP.map((m) => `${m.rank}. ${m.name} (${m.publisher})`).join('\n');
  const headlines = news.map((n) => `- [${n.feed}] ${n.title}`).join('\n');

  return `## 게임을 만들 사람
- ${profile.targetRoles.join(', ')} / 경력: ${profile.experience} / 기술: ${profile.skills.join(', ')}
- 언어: ${profile.languages.map((l) => `${l.name} ${l.level}`).join(', ')} — 일본 시장에도 관심이 있다
- 혼자 또는 소규모로 '어떤 게임을 만들기 시작해야 할지' 정하려고 한다

## 스팀 인디 신작 (최근 ${window.days}일: ${window.from} ~ ${window.to})
총 ${num(indie.releases)}개 (유료 ${num(indie.paid)} · 무료 ${num(indie.free)}), 리뷰 ${report.method.tractionReviews}개 이상 ${num(indie.withTraction)}개
추정 매출 = 리뷰 수 × ${report.method.reviewMultiplier} × 출시가 × ${report.method.priceRealization}

### 장르별: 출시 수 / 리뷰${report.method.tractionReviews}+ / 추정 매출 합 / 출시 1개당 / 중앙값 / 평균 긍정률 / 유튜브 조회수(상위 게임만)
${genres}

### 추정 매출 상위 인디 신작
${games || '(없음)'}

## 스팀 전체 시장
### 주간 매출 TOP (전 세계)
${sellers}

### 동시 접속 TOP
${played}

## 일본 App Store 게임 매출 TOP
${mobile || '(없음)'}

## 최근 업계 기사 제목 (참고용)
${headlines || '(없음)'}

## 할 일
1. indie: 인디 신작 시장의 흐름 — 무엇이 많이 나오는지(경쟁), 무엇이 돈을 벌었는지, 화제성과 매출이 일치하는지.
2. market: 전체 시장·플랫폼·대작 흐름 — 매출 상위의 신작·무료·라이브 서비스 비중, 동접 상위, 일본 모바일, 기사에서 보이는 플랫폼·대작 이슈.
3. ideas: 이 사람이 지금 만들기 시작하면 좋을 게임 방향 3개. 경쟁(출시 수)은 적당하고 1개당 매출·화제성은 높은 장르 조합을 우선하고,
   Unity 1인 개발로 6~12개월 안에 첫 버전을 낼 수 있는 범위로 제안한다. 근거 숫자를 반드시 인용한다.`;
}

export async function aiInsights(input) {
  const output = await generateObject({ system: SYSTEM, prompt: buildTrendsPrompt(input), schema: InsightSchema, effort: 'high' });
  return {
    by: 'ai',
    generatedAt: new Date().toISOString(),
    model: MODEL,
    indie: output.indie,
    market: output.market,
    ideas: output.ideas.slice(0, 3),
  };
}
